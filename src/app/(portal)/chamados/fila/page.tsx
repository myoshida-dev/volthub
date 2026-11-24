import type { Metadata } from "next";
import { AlertTriangle, Headset, Inbox, UserRound, UserX } from "lucide-react";
import type { PrioridadeChamado, Prisma } from "@prisma/client";

import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { GraficoBarras } from "@/components/grafico-barras";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { chamadosPorPrioridade } from "@/features/indicadores/consultas";
import { STATUS_EM_ABERTO } from "@/features/chamados/schemas";
import { incluirNaTabelaChamados, TabelaChamados } from "@/features/chamados/tabela";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { opcoes, PRIORIDADE_CHAMADO } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Fila de TI" };

const POR_PAGINA = 20;

type Params = { situacao?: string; responsavel?: string; prioridade?: string; pagina?: string };

export default async function PaginaFilaTi({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirPermissao("chamado:atender");
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const situacao = params.situacao ?? "abertos";

  const where: Prisma.ChamadoWhereInput = {
    ...(situacao === "abertos" && { status: { in: STATUS_EM_ABERTO } }),
    ...(situacao === "encerrados" && { status: { in: ["RESOLVIDO", "FECHADO"] } }),
    ...(params.responsavel === "meus" && { responsavelId: usuario.id }),
    ...(params.responsavel === "sem" && { responsavelId: null }),
    ...(params.prioridade && params.prioridade in PRIORIDADE_CHAMADO && { prioridade: params.prioridade as PrioridadeChamado }),
  };

  const emAberto = { status: { in: STATUS_EM_ABERTO } };
  const [chamados, total, abertos, criticos, semResponsavel, meus, porPrioridade] = await Promise.all([
    prisma.chamado.findMany({
      where,
      include: incluirNaTabelaChamados,
      // Enum em ordem BAIXA→URGENTE: "desc" traz os urgentes primeiro.
      orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.chamado.count({ where }),
    prisma.chamado.count({ where: emAberto }),
    prisma.chamado.count({ where: { ...emAberto, prioridade: { in: ["ALTA", "URGENTE"] } } }),
    prisma.chamado.count({ where: { ...emAberto, responsavelId: null } }),
    prisma.chamado.count({ where: { ...emAberto, responsavelId: usuario.id } }),
    chamadosPorPrioridade(),
  ]);

  const indicadores = [
    { icone: Inbox, rotulo: "Em aberto", valor: abertos },
    { icone: AlertTriangle, rotulo: "Alta ou urgente", valor: criticos },
    { icone: UserX, rotulo: "Sem responsável", valor: semResponsavel },
    { icone: UserRound, rotulo: "Comigo", valor: meus },
  ];

  return (
    <>
      <PageHeader titulo="Fila de TI" descricao="Chamados ordenados por prioridade e antiguidade." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <SelectFiltro name="situacao" defaultValue={situacao} className="w-44" aria-label="Situação">
          <option value="abertos">Em aberto</option>
          <option value="encerrados">Resolvidos e fechados</option>
          <option value="todos">Todos</option>
        </SelectFiltro>
        <SelectFiltro name="responsavel" defaultValue={params.responsavel ?? ""} className="w-48" aria-label="Responsável">
          <option value="">Qualquer responsável</option>
          <option value="meus">Comigo</option>
          <option value="sem">Sem responsável</option>
        </SelectFiltro>
        <SelectFiltro name="prioridade" defaultValue={params.prioridade ?? ""} className="w-44" aria-label="Prioridade">
          <option value="">Toda prioridade</option>
          {opcoes(PRIORIDADE_CHAMADO).map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </SelectFiltro>
      </form>

      {chamados.length === 0 ? (
        <EstadoVazio icone={Headset} titulo="Fila vazia" descricao="Nenhum chamado com esses filtros." />
      ) : (
        <TabelaChamados chamados={chamados} visaoTi />
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/chamados/fila"
        params={{ situacao: params.situacao, responsavel: params.responsavel, prioridade: params.prioridade }}
      />

      <Card className="mt-8 max-w-2xl gap-4">
        <CardHeader>
          <CardTitle className="text-base">Chamados em aberto por prioridade</CardTitle>
          <CardDescription>{abertos} chamado(s) na fila agora</CardDescription>
        </CardHeader>
        <CardContent>
          <GraficoBarras dados={porPrioridade} medida="Chamados" />
        </CardContent>
      </Card>
    </>
  );
}
