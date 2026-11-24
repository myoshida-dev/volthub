import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { AbasLink, EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { GraficoBarras } from "@/components/grafico-barras";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { solicitacoesRecentes } from "@/features/indicadores/consultas";
import { incluirNaTabela, TabelaSolicitacoes } from "@/features/solicitacoes/tabela";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Aprovações" };

const POR_PAGINA = 15;

export default async function PaginaAprovacoes({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; pagina?: string }>;
}) {
  const usuario = await exigirPermissao("solicitacao:aprovar");
  const params = await searchParams;
  const aba = params.aba === "decididas" ? "decididas" : "pendentes";
  const pagina = lerPagina(params.pagina);

  // ADMIN vê todos os pedidos pendentes; gestores, os que estão com eles.
  const pendentes: Prisma.SolicitacaoWhereInput =
    usuario.perfil === "ADMIN"
      ? { status: "PENDENTE", solicitanteId: { not: usuario.id } }
      : { status: "PENDENTE", aprovadorId: usuario.id };
  const decididas: Prisma.SolicitacaoWhereInput = { aprovadorId: usuario.id, decididoEm: { not: null } };
  const where = aba === "pendentes" ? pendentes : decididas;

  const [solicitacoes, total, totalPendentes, graficos] = await Promise.all([
    prisma.solicitacao.findMany({
      where,
      include: incluirNaTabela,
      orderBy: aba === "pendentes" ? { criadoEm: "asc" } : { decididoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.solicitacao.count({ where }),
    prisma.solicitacao.count({ where: pendentes }),
    // Equipe = quem tem o usuário como gestor direto (ADMIN vê a empresa toda).
    solicitacoesRecentes(usuario.perfil === "ADMIN" ? {} : { solicitante: { gestorId: usuario.id } }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Aprovações"
        descricao="Pedidos da sua equipe. Os mais antigos aparecem primeiro."
      />
      <div className="mb-4">
        <AbasLink
          atual={aba}
          abas={[
            { valor: "pendentes", rotulo: "Aguardando você", href: "/solicitacoes/aprovacoes", contador: totalPendentes },
            { valor: "decididas", rotulo: "Decididas por você", href: "/solicitacoes/aprovacoes?aba=decididas" },
          ]}
        />
      </div>

      {solicitacoes.length === 0 ? (
        <EstadoVazio
          icone={ClipboardCheck}
          titulo={aba === "pendentes" ? "Nada para aprovar" : "Nenhuma decisão ainda"}
          descricao={aba === "pendentes" ? "Quando sua equipe fizer um pedido, ele aparece aqui." : undefined}
        />
      ) : (
        <TabelaSolicitacoes solicitacoes={solicitacoes} mostrarSolicitante />
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/solicitacoes/aprovacoes"
        params={{ aba: aba === "decididas" ? aba : undefined }}
      />

      <Card className="mt-8 max-w-2xl gap-4">
        <CardHeader>
          <CardTitle className="text-base">Pedidos da sua equipe por mês</CardTitle>
          <CardDescription>Últimos 6 meses · {graficos.total} pedido(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <GraficoBarras dados={graficos.porMes} medida="Solicitações" />
        </CardContent>
      </Card>
    </>
  );
}
