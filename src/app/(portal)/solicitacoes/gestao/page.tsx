import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck2, Clock, Plane, Search } from "lucide-react";
import type { Prisma, StatusSolicitacao, TipoSolicitacao } from "@prisma/client";

import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { GraficoBarras } from "@/components/grafico-barras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { solicitacoesRecentes } from "@/features/indicadores/consultas";
import { incluirNaTabela, TabelaSolicitacoes } from "@/features/solicitacoes/tabela";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { opcoes, STATUS_SOLICITACAO, TIPO_SOLICITACAO } from "@/lib/rotulos";
import { formatarData, hojeISO } from "@/lib/utils";

export const metadata: Metadata = { title: "Gestão de RH" };

const POR_PAGINA = 20;

type Params = { status?: string; tipo?: string; unidade?: string; pagina?: string };

export default async function PaginaGestaoRh({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirPermissao("solicitacao:gerenciar");
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);

  const where: Prisma.SolicitacaoWhereInput = {
    ...(params.status && params.status in STATUS_SOLICITACAO && { status: params.status as StatusSolicitacao }),
    ...(params.tipo && params.tipo in TIPO_SOLICITACAO && { tipo: params.tipo as TipoSolicitacao }),
    ...(params.unidade && { solicitante: { unidadeId: params.unidade } }),
  };

  const hoje = new Date(`${hojeISO()}T00:00:00.000Z`);
  const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const [solicitacoes, total, unidades, pendentes, aprovadasMes, ausentesHoje, graficos] = await Promise.all([
    prisma.solicitacao.findMany({
      where,
      include: incluirNaTabela,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.solicitacao.count({ where }),
    prisma.unidade.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.solicitacao.count({ where: { status: "PENDENTE" } }),
    prisma.solicitacao.count({ where: { status: "APROVADA", decididoEm: { gte: inicioMes } } }),
    prisma.solicitacao.findMany({
      where: {
        status: "APROVADA",
        tipo: { in: ["FERIAS", "FOLGA", "ATESTADO"] },
        dataInicio: { lte: hoje },
        dataFim: { gte: hoje },
      },
      orderBy: { dataFim: "asc" },
      select: {
        id: true,
        tipo: true,
        dataFim: true,
        solicitante: { select: { nome: true, unidade: { select: { nome: true } } } },
      },
    }),
    solicitacoesRecentes(),
  ]);

  const indicadores = [
    { icone: Clock, rotulo: "Pendentes de decisão", valor: pendentes },
    { icone: CalendarCheck2, rotulo: "Aprovadas neste mês", valor: aprovadasMes },
    { icone: Plane, rotulo: "Ausentes hoje", valor: ausentesHoje.length },
  ];

  return (
    <>
      <PageHeader titulo="Gestão de RH" descricao="Todas as solicitações da empresa." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {indicadores.map(({ icone: Icone, rotulo, valor }) => (
          <Card key={rotulo} className="gap-0 py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-destaque/15 text-primary">
                <Icone className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-primary">{valor}</p>
                <p className="text-xs text-muted-foreground">{rotulo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <form className="flex flex-wrap gap-2" role="search">
            <SelectFiltro name="status" defaultValue={params.status ?? ""} className="w-40" aria-label="Status">
              <option value="">Todos os status</option>
              {opcoes(STATUS_SOLICITACAO).map((o) => (
                <option key={o.valor} value={o.valor}>{o.rotulo}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro name="tipo" defaultValue={params.tipo ?? ""} className="w-48" aria-label="Tipo">
              <option value="">Todos os tipos</option>
              {opcoes(TIPO_SOLICITACAO).map((o) => (
                <option key={o.valor} value={o.valor}>{o.rotulo}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro name="unidade" defaultValue={params.unidade ?? ""} className="w-52" aria-label="Unidade">
              <option value="">Todas as unidades</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </SelectFiltro>
            <noscript>
              <button type="submit">Filtrar</button>
            </noscript>
          </form>

          {solicitacoes.length === 0 ? (
            <EstadoVazio icone={Search} titulo="Nenhuma solicitação encontrada" descricao="Ajuste os filtros acima." />
          ) : (
            <TabelaSolicitacoes solicitacoes={solicitacoes} mostrarSolicitante />
          )}
          <Paginacao
            pagina={pagina}
            totalPaginas={Math.ceil(total / POR_PAGINA)}
            base="/solicitacoes/gestao"
            params={{ status: params.status, tipo: params.tipo, unidade: params.unidade }}
          />
        </div>

        <Card className="h-fit gap-3">
          <CardHeader>
            <CardTitle className="text-base">Ausentes hoje</CardTitle>
          </CardHeader>
          <CardContent>
            {ausentesHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Toda a equipe está presente hoje.</p>
            ) : (
              <ul className="space-y-3">
                {ausentesHoje.map((a) => (
                  <li key={a.id}>
                    <Link href={`/solicitacoes/${a.id}`} className="block text-sm hover:underline">
                      <span className="font-medium">{a.solicitante.nome}</span>
                      <span className="block text-xs text-muted-foreground">
                        {TIPO_SOLICITACAO[a.tipo].rotulo} até {formatarData(a.dataFim)} · {a.solicitante.unidade.nome}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Solicitações por mês</CardTitle>
            <CardDescription>Últimos 6 meses · {graficos.total} no total</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarras dados={graficos.porMes} medida="Solicitações" />
          </CardContent>
        </Card>
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Solicitações por tipo</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarras dados={graficos.porTipo} medida="Solicitações" orientacao="horizontal" altura={240} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
