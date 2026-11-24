import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { AbasLink, EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { STATUS_EM_ABERTO } from "@/features/chamados/schemas";
import { incluirNaTabelaChamados, TabelaChamados } from "@/features/chamados/tabela";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Chamados de TI" };

const POR_PAGINA = 15;

export default async function PaginaChamados({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; pagina?: string }>;
}) {
  const usuario = await exigirSessao();
  const params = await searchParams;
  const aba = params.aba === "encerrados" ? "encerrados" : "abertos";
  const pagina = lerPagina(params.pagina);

  const abertos: Prisma.ChamadoWhereInput = { solicitanteId: usuario.id, status: { in: STATUS_EM_ABERTO } };
  const encerrados: Prisma.ChamadoWhereInput = { solicitanteId: usuario.id, status: { in: ["RESOLVIDO", "FECHADO"] } };
  const where = aba === "abertos" ? abertos : encerrados;

  const [chamados, total, totalAbertos, aguardandoVoce] = await Promise.all([
    prisma.chamado.findMany({
      where,
      include: incluirNaTabelaChamados,
      orderBy: { atualizadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.chamado.count({ where }),
    prisma.chamado.count({ where: abertos }),
    prisma.chamado.count({ where: { solicitanteId: usuario.id, status: { in: ["AGUARDANDO_USUARIO", "RESOLVIDO"] } } }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Chamados de TI"
        descricao="Peça ajuda à equipe de TI e acompanhe o atendimento."
        acoes={
          <Button asChild>
            <Link href="/chamados/novo">
              <Plus /> Abrir chamado
            </Link>
          </Button>
        }
      />

      {aguardandoVoce > 0 && (
        <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Você tem {aguardandoVoce} chamado(s) aguardando sua resposta ou confirmação.
        </p>
      )}

      <div className="mb-4">
        <AbasLink
          atual={aba}
          abas={[
            { valor: "abertos", rotulo: "Em aberto", href: "/chamados", contador: totalAbertos },
            { valor: "encerrados", rotulo: "Resolvidos e fechados", href: "/chamados?aba=encerrados" },
          ]}
        />
      </div>

      {chamados.length === 0 ? (
        <EstadoVazio
          icone={LifeBuoy}
          titulo={aba === "abertos" ? "Nenhum chamado em aberto" : "Nenhum chamado encerrado"}
          descricao="Problema com computador, sistema, e-mail ou impressora? Abra um chamado."
        />
      ) : (
        <TabelaChamados chamados={chamados} />
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/chamados"
        params={{ aba: aba === "encerrados" ? aba : undefined }}
      />
    </>
  );
}
