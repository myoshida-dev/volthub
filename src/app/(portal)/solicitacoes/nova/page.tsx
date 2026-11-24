import type { Metadata } from "next";
import type { TipoSolicitacao } from "@prisma/client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FormSolicitacao } from "@/features/solicitacoes/formularios";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { TIPO_SOLICITACAO } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Nova solicitação" };

export default async function PaginaNovaSolicitacao({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const usuario = await exigirSessao();
  const { tipo } = await searchParams;
  const { gestor } = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { gestor: { select: { nome: true } } },
  });

  return (
    <>
      <PageHeader
        titulo="Nova solicitação"
        descricao={
          gestor
            ? `Seu pedido será enviado para aprovação de ${gestor.nome}.`
            : "Seu pedido será analisado pela equipe de RH."
        }
      />
      <Card className="max-w-3xl">
        <CardContent>
          <FormSolicitacao
            tipoInicial={tipo && tipo in TIPO_SOLICITACAO ? (tipo as TipoSolicitacao) : undefined}
          />
        </CardContent>
      </Card>
    </>
  );
}
