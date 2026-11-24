import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import type { StatusSolicitacao } from "@prisma/client";

import { AbasLink, EstadoVazio, lerPagina, Paginacao, urlCom } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { incluirNaTabela, TabelaSolicitacoes } from "@/features/solicitacoes/tabela";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { STATUS_SOLICITACAO } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Solicitações de RH" };

const POR_PAGINA = 15;

export default async function PaginaSolicitacoes({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; pagina?: string }>;
}) {
  const usuario = await exigirSessao();
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const status = params.status && params.status in STATUS_SOLICITACAO ? (params.status as StatusSolicitacao) : undefined;

  const where = { solicitanteId: usuario.id, ...(status && { status }) };
  const [solicitacoes, total, porStatus] = await Promise.all([
    prisma.solicitacao.findMany({
      where,
      include: incluirNaTabela,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.solicitacao.count({ where }),
    prisma.solicitacao.groupBy({ by: ["status"], where: { solicitanteId: usuario.id }, _count: true }),
  ]);
  const contagem = Object.fromEntries(porStatus.map((g) => [g.status, g._count]));

  const abas = [
    { valor: "todas", rotulo: "Todas" },
    ...(["PENDENTE", "APROVADA", "REPROVADA", "CANCELADA"] as const).map((s) => ({
      valor: s,
      rotulo: STATUS_SOLICITACAO[s].rotulo + "s",
      contador: s === "PENDENTE" ? contagem[s] : undefined,
    })),
  ].map((a) => ({ ...a, href: urlCom("/solicitacoes", {}, { status: a.valor === "todas" ? undefined : a.valor }) }));

  return (
    <>
      <PageHeader
        titulo="Solicitações de RH"
        descricao="Férias, folgas, atestados e atualização de dados cadastrais."
        acoes={
          <Button asChild>
            <Link href="/solicitacoes/nova">
              <Plus /> Nova solicitação
            </Link>
          </Button>
        }
      />

      <div className="mb-4 overflow-x-auto">
        <AbasLink abas={abas} atual={status ?? "todas"} />
      </div>

      {solicitacoes.length === 0 ? (
        <EstadoVazio
          icone={ClipboardList}
          titulo="Nenhuma solicitação"
          descricao="Peça férias, folgas ou envie um atestado. Seu gestor recebe o pedido na hora."
          acao={
            <Button asChild variant="outline">
              <Link href="/solicitacoes/nova">Fazer uma solicitação</Link>
            </Button>
          }
        />
      ) : (
        <TabelaSolicitacoes solicitacoes={solicitacoes} />
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/solicitacoes"
        params={{ status }}
      />
    </>
  );
}
