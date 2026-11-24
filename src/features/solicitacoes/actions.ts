"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  CAMPOS_ATUALIZACAO,
  decisaoSchema,
  solicitacaoSchema,
  type CampoAtualizacao,
} from "@/features/solicitacoes/schemas";
import {
  podeCancelarSolicitacao,
  podeDecidirSolicitacao,
} from "@/features/solicitacoes/regras";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirSessao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, type EstadoFormulario } from "@/lib/formularios";
import { idsDaEquipe, notificar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { TIPO_SOLICITACAO } from "@/lib/rotulos";
import { arquivoDoForm, ErroUpload, salvarArquivo, TIPOS_ARQUIVO } from "@/lib/uploads";

export async function criarSolicitacao(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = solicitacaoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const d = dados.data;

  // Atestado exige o arquivo.
  let anexo: { url: string; nome: string } | null = null;
  if (d.tipo === "ATESTADO") {
    const arquivo = arquivoDoForm(formData.get("anexo"));
    if (!arquivo) return { erro: "Anexe o atestado.", erros: { anexo: ["Anexe o atestado (PDF ou imagem)."] } };
    try {
      anexo = await salvarArquivo(arquivo, "solicitacoes", { tipos: TIPOS_ARQUIVO.anexos, tamanhoMaxMb: 5 });
    } catch (erro) {
      if (erro instanceof ErroUpload) return { erro: erro.message, erros: { anexo: [erro.message] } };
      throw erro;
    }
  }

  const solicitante = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { nome: true, gestorId: true },
  });

  const solicitacao = await prisma.solicitacao.create({
    data: {
      tipo: d.tipo,
      solicitanteId: usuario.id,
      aprovadorId: solicitante.gestorId,
      motivo: d.motivo,
      ...(d.tipo === "ATUALIZACAO_DADOS"
        ? { dados: { campo: d.campo, valor: d.valor } }
        : { dataInicio: d.dataInicio, dataFim: d.dataFim }),
      anexoUrl: anexo?.url,
      anexoNome: anexo?.nome,
    },
  });

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "SOLICITACAO_CRIADA",
    entidade: "Solicitacao",
    entidadeId: solicitacao.id,
    dados: { tipo: d.tipo },
  });

  // Quem decide: o gestor direto ou, sem gestor, a equipe de RH.
  const rh = await idsDaEquipe("RH");
  const destinatarios = solicitante.gestorId ? [solicitante.gestorId] : rh;
  await notificar(
    destinatarios,
    {
      tipo: "SOLICITACAO",
      titulo: "Nova solicitação para analisar",
      mensagem: `${solicitante.nome} pediu: ${TIPO_SOLICITACAO[d.tipo].rotulo}.`,
      link: `/solicitacoes/${solicitacao.id}`,
    },
    usuario.id,
  );
  // O RH acompanha todos os atestados, mesmo os aprovados pelo gestor.
  if (d.tipo === "ATESTADO" && solicitante.gestorId) {
    await notificar(
      rh,
      {
        tipo: "SOLICITACAO",
        titulo: "Atestado recebido",
        mensagem: `${solicitante.nome} enviou um atestado.`,
        link: `/solicitacoes/${solicitacao.id}`,
      },
      usuario.id,
    );
  }

  revalidatePath("/solicitacoes");
  redirect(`/solicitacoes/${solicitacao.id}`);
}

export async function decidirSolicitacao(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = decisaoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  const solicitacao = await prisma.solicitacao.findUnique({ where: { id } });
  if (!solicitacao || !podeDecidirSolicitacao(usuario, solicitacao)) {
    return { erro: "Você não pode decidir esta solicitação." };
  }

  const { decisao, observacao } = dados.data;

  // `updateMany` com status PENDENTE evita decisão dupla (dois cliques, duas abas).
  const resultado = await prisma.solicitacao.updateMany({
    where: { id, status: "PENDENTE" },
    data: {
      status: decisao,
      aprovadorId: usuario.id,
      observacaoAprovador: observacao ?? null,
      decididoEm: new Date(),
    },
  });
  if (resultado.count === 0) return { erro: "Esta solicitação já foi decidida." };

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: decisao === "APROVADA" ? "SOLICITACAO_APROVADA" : "SOLICITACAO_REPROVADA",
    entidade: "Solicitacao",
    entidadeId: id,
    dados: observacao ? { observacao } : undefined,
  });

  // Atualização de telefone aprovada é aplicada direto no cadastro.
  const pedido = solicitacao.dados as { campo?: CampoAtualizacao; valor?: string } | null;
  if (decisao === "APROVADA" && solicitacao.tipo === "ATUALIZACAO_DADOS" && pedido?.campo === "TELEFONE" && pedido.valor) {
    await prisma.usuario.update({
      where: { id: solicitacao.solicitanteId },
      data: { telefone: pedido.valor },
    });
    await registrarAuditoria({
      usuarioId: usuario.id,
      acao: "DADOS_APLICADOS",
      entidade: "Solicitacao",
      entidadeId: id,
      dados: { campo: CAMPOS_ATUALIZACAO.TELEFONE },
    });
  }

  await notificar([solicitacao.solicitanteId], {
    tipo: "SOLICITACAO",
    titulo: decisao === "APROVADA" ? "Solicitação aprovada ✅" : "Solicitação reprovada",
    mensagem: `${TIPO_SOLICITACAO[solicitacao.tipo].rotulo}: ${decisao === "APROVADA" ? "aprovada" : "reprovada"}${observacao ? ` — "${observacao}"` : ""}.`,
    link: `/solicitacoes/${id}`,
  });

  revalidatePath("/solicitacoes", "layout");
  return {
    ok: true,
    mensagem: decisao === "APROVADA" ? "Solicitação aprovada." : "Solicitação reprovada.",
  };
}

export async function cancelarSolicitacao(id: string) {
  const usuario = await exigirSessao();
  const solicitacao = await prisma.solicitacao.findUnique({ where: { id } });
  if (!solicitacao || !podeCancelarSolicitacao(usuario, solicitacao)) return;

  await prisma.solicitacao.updateMany({
    where: { id, status: "PENDENTE" },
    data: { status: "CANCELADA" },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "SOLICITACAO_CANCELADA",
    entidade: "Solicitacao",
    entidadeId: id,
  });
  await notificar(
    [solicitacao.aprovadorId],
    {
      tipo: "SOLICITACAO",
      titulo: "Solicitação cancelada",
      mensagem: `Um pedido de ${TIPO_SOLICITACAO[solicitacao.tipo].rotulo.toLowerCase()} foi cancelado pelo colaborador.`,
      link: `/solicitacoes/${id}`,
    },
    usuario.id,
  );

  revalidatePath("/solicitacoes", "layout");
}
