import "server-only";

import type { Equipe, Perfil } from "@prisma/client";

import { filtroVisiveis } from "@/features/comunicados/consultas";
import { STATUS_EM_ABERTO } from "@/features/chamados/schemas";
import { prisma } from "@/lib/prisma";
import { pode } from "@/lib/permissions";
import { CATEGORIA_COMUNICADO, TIPO_SOLICITACAO } from "@/lib/rotulos";
import { numeroChamado, periodoCurto, plural, tempoRelativo } from "@/lib/utils";

/** Um item do cartão "Precisa de você". */
export type Pendencia = {
  id: string;
  /** Cor do marcador: amarelo (agir agora), azul (resposta/informação), cinza (acompanhar). */
  tom: "destaque" | "info" | "neutro";
  titulo: string;
  detalhe: string;
  acao:
    | { tipo: "ciente"; comunicadoId: string }
    | { tipo: "link"; href: string; rotulo: string; estilo: "botao" | "texto" };
};

type Usuario = { id: string; perfil: Perfil; equipe: Equipe | null; unidadeId: string; setorId: string };

const minusculo = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Junta tudo o que espera uma ação do usuário, na ordem de urgência:
 * leituras obrigatórias, aprovações, respostas da TI, fila da TI,
 * veículo a devolver e, por fim, pedidos próprios para acompanhar.
 */
export async function buscarPendencias(usuario: Usuario): Promise<Pendencia[]> {
  const ehTi = pode(usuario, "chamado:atender");
  const aprova = usuario.perfil === "GESTOR" || usuario.equipe === "RH";

  const [comunicados, paraDecidir, chamados, filaCritica, veiculos, meusPedidos] = await Promise.all([
    // 1. Comunicados fixados (obrigatórios) ainda não confirmados
    prisma.comunicado.findMany({
      where: { AND: [filtroVisiveis(usuario), { fixado: true }, { leituras: { none: { usuarioId: usuario.id } } }] },
      orderBy: { publicadoEm: "desc" },
      take: 3,
    }),
    // 2. Pedidos esperando a decisão do usuário (gestor direto; RH decide os sem gestor)
    aprova
      ? prisma.solicitacao.findMany({
          where: {
            status: "PENDENTE",
            solicitanteId: { not: usuario.id },
            OR: [{ aprovadorId: usuario.id }, ...(usuario.equipe === "RH" ? [{ aprovadorId: null }] : [])],
          },
          include: { solicitante: { select: { nome: true } } },
          orderBy: { criadoEm: "asc" },
          take: 4,
        })
      : Promise.resolve([]),
    // 3. Chamados do usuário que dependem dele
    prisma.chamado.findMany({
      where: { solicitanteId: usuario.id, status: { in: [...STATUS_EM_ABERTO, "RESOLVIDO"] } },
      include: {
        comentarios: {
          where: { interno: false },
          orderBy: { criadoEm: "desc" },
          take: 1,
          select: { conteudo: true, criadoEm: true, autorId: true },
        },
      },
      orderBy: { atualizadoEm: "desc" },
    }),
    // 4. TI: chamados prioritários sem responsável
    ehTi
      ? prisma.chamado.count({
          where: { status: { in: STATUS_EM_ABERTO }, responsavelId: null, prioridade: { in: ["ALTA", "URGENTE"] } },
        })
      : Promise.resolve(0),
    // 5. Veículo retirado e ainda não devolvido
    prisma.reserva.findMany({
      where: { usuarioId: usuario.id, status: "CONFIRMADA", kmSaida: { not: null } },
      include: { recurso: { select: { nome: true } } },
    }),
    // 6. Pedidos do próprio usuário aguardando decisão
    prisma.solicitacao.findMany({
      where: { solicitanteId: usuario.id, status: "PENDENTE" },
      orderBy: { criadoEm: "desc" },
      take: 3,
    }),
  ]);

  const itens: Pendencia[] = [];

  for (const c of comunicados) {
    itens.push({
      id: `comunicado-${c.id}`,
      tom: "destaque",
      titulo: `Confirmar leitura: ${c.titulo}`,
      detalhe: `Comunicado obrigatório · ${CATEGORIA_COMUNICADO[c.categoria].rotulo} · ${tempoRelativo(c.publicadoEm)}`,
      acao: { tipo: "ciente", comunicadoId: c.id },
    });
  }

  for (const s of paraDecidir) {
    const periodo = periodoCurto(s.dataInicio, s.dataFim);
    itens.push({
      id: `decidir-${s.id}`,
      tom: "destaque",
      titulo: `Aprovar ${minusculo(TIPO_SOLICITACAO[s.tipo].rotulo)}: ${s.solicitante.nome}`,
      detalhe: [periodo, `enviada ${tempoRelativo(s.criadoEm)}`].filter(Boolean).join(" · "),
      acao: { tipo: "link", href: `/solicitacoes/${s.id}`, rotulo: "Analisar", estilo: "botao" },
    });
  }

  for (const c of chamados) {
    const ultimo = c.comentarios[0];
    const respondidoPelaTi = ultimo && ultimo.autorId !== usuario.id;
    if (c.status === "RESOLVIDO") {
      itens.push({
        id: `chamado-${c.id}`,
        tom: "info",
        titulo: `Confirme a solução do chamado ${numeroChamado(c.numero)} — ${c.titulo}`,
        detalhe: `A TI marcou como resolvido · ${tempoRelativo(c.atualizadoEm)}`,
        acao: { tipo: "link", href: `/chamados/${c.id}`, rotulo: "Confirmar", estilo: "botao" },
      });
    } else if (respondidoPelaTi || c.status === "AGUARDANDO_USUARIO") {
      itens.push({
        id: `chamado-${c.id}`,
        tom: "info",
        titulo: `TI respondeu seu chamado ${numeroChamado(c.numero)} — ${c.titulo}`,
        detalhe: ultimo
          ? `“${ultimo.conteudo.length > 70 ? `${ultimo.conteudo.slice(0, 70)}…` : ultimo.conteudo}” · ${tempoRelativo(ultimo.criadoEm)}`
          : "A TI precisa de uma resposta sua",
        acao: { tipo: "link", href: `/chamados/${c.id}`, rotulo: "Responder", estilo: "botao" },
      });
    }
  }

  if (filaCritica > 0) {
    itens.push({
      id: "fila-ti",
      tom: "info",
      titulo: `${plural(filaCritica, "chamado prioritário", "chamados prioritários")} sem responsável`,
      detalhe: "Prioridade alta ou urgente na fila da TI",
      acao: { tipo: "link", href: "/chamados/fila?responsavel=sem", rotulo: "Ver fila", estilo: "botao" },
    });
  }

  for (const r of veiculos) {
    itens.push({
      id: `veiculo-${r.id}`,
      tom: "destaque",
      titulo: `Registrar devolução: ${r.recurso.nome}`,
      detalhe: `Saída com ${r.kmSaida?.toLocaleString("pt-BR")} km${r.destino ? ` · ${r.destino}` : ""}`,
      acao: { tipo: "link", href: "/reservas", rotulo: "Registrar", estilo: "botao" },
    });
  }

  for (const s of meusPedidos) {
    const periodo = periodoCurto(s.dataInicio, s.dataFim);
    itens.push({
      id: `pedido-${s.id}`,
      tom: "neutro",
      titulo: `Solicitação de ${minusculo(TIPO_SOLICITACAO[s.tipo].rotulo)} aguardando ${s.aprovadorId ? "gestor" : "RH"}`,
      detalhe: [periodo, `enviada ${tempoRelativo(s.criadoEm)}`].filter(Boolean).join(" · "),
      acao: { tipo: "link", href: `/solicitacoes/${s.id}`, rotulo: "Acompanhar", estilo: "texto" },
    });
  }

  return itens;
}
