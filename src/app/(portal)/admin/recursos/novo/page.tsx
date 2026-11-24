import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormRecurso } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Novo recurso" };

export default async function PaginaNovoRecurso() {
  await exigirPermissao("recurso:gerenciar");
  const unidades = await prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } });

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/recursos"><ArrowLeft /> Salas e veículos</Link>
      </Button>
      <PageHeader titulo="Novo recurso" descricao="Sala de reunião ou veículo da frota." />
      <Card className="max-w-2xl">
        <CardContent>
          <FormRecurso id={null} unidades={unidades} />
        </CardContent>
      </Card>
    </>
  );
}
