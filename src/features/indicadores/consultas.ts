import "server-only";

import type { Prisma } from "@prisma/client";

import type { PontoGrafico } from "@/components/grafico-barras";
import { STATUS_EM_ABERTO } from "@/features/chamados/schemas";
import { prisma } from "@/lib/prisma";
import { PRIORIDADE_CHAMADO, TIPO_SOLICITACAO } from "@/lib/rotulos";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Chamados em aberto por prioridade (ordem Baixa → Urgente). */
export async function chamadosPorPrioridade(): Promise<PontoGrafico[]> {
  const grupos = await prisma.chamado.groupBy({
    by: ["prioridade"],
    where: { status: { in: STATUS_EM_ABERTO } },
    _count: true,
  });
  return (["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const).map((p) => ({
    rotulo: PRIORIDADE_CHAMADO[p].rotulo,
    valor: grupos.find((g) => g.prioridade === p)?._count ?? 0,
  }));
}

/** Solicitações dos últimos 6 meses, por mês e por tipo. */
export async function solicitacoesRecentes(filtro: Prisma.SolicitacaoWhereInput = {}) {
  const agora = new Date();
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 5, 1));
  const recentes = await prisma.solicitacao.findMany({
    where: { ...filtro, criadoEm: { gte: inicio } },
    select: { criadoEm: true, tipo: true },
  });

  const porMes: PontoGrafico[] = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1));
    return {
      rotulo: MESES[mes.getUTCMonth()],
      valor: recentes.filter(
        (s) => s.criadoEm.getUTCFullYear() === mes.getUTCFullYear() && s.criadoEm.getUTCMonth() === mes.getUTCMonth(),
      ).length,
    };
  });

  const porTipo: PontoGrafico[] = (Object.keys(TIPO_SOLICITACAO) as (keyof typeof TIPO_SOLICITACAO)[])
    .map((t) => ({ rotulo: TIPO_SOLICITACAO[t].rotulo, valor: recentes.filter((s) => s.tipo === t).length }))
    .sort((a, b) => b.valor - a.valor);

  return { porMes, porTipo, total: recentes.length };
}

/** Colaboradores ativos por unidade. */
export async function colaboradoresPorUnidade(): Promise<PontoGrafico[]> {
  const unidades = await prisma.unidade.findMany({
    orderBy: [{ matriz: "desc" }, { nome: "asc" }],
    select: { nome: true, _count: { select: { usuarios: { where: { ativo: true } } } } },
  });
  return unidades.map((u) => ({ rotulo: u.nome.replace(/^(Matriz|Filial) /, ""), valor: u._count.usuarios }));
}
