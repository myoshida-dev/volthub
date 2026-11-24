import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FormDocumento } from "@/features/documentos/form-documento";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Novo documento" };

export default async function PaginaNovoDocumento() {
  await exigirPermissao("documento:gerenciar");
  const setores = await prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } });

  return (
    <>
      <PageHeader titulo="Novo documento" descricao="Fica disponível para todos os colaboradores." />
      <Card className="max-w-2xl">
        <CardContent>
          <FormDocumento setores={setores} />
        </CardContent>
      </Card>
    </>
  );
}
