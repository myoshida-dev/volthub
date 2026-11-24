import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormRecurso } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Editar recurso" };

export default async function PaginaEditarRecurso({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("recurso:gerenciar");
  const { id } = await params;
  const [recurso, unidades] = await Promise.all([
    prisma.recurso.findUnique({ where: { id } }),
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
  ]);
  if (!recurso) notFound();

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/recursos"><ArrowLeft /> Salas e veículos</Link>
      </Button>
      <PageHeader titulo={recurso.nome} descricao="Desative em vez de excluir para manter o histórico de reservas." />
      <Card className="max-w-2xl">
        <CardContent>
          <FormRecurso
            id={recurso.id}
            unidades={unidades}
            inicial={{
              nome: recurso.nome,
              tipo: recurso.tipo,
              unidadeId: recurso.unidadeId,
              descricao: recurso.descricao ?? "",
              capacidade: recurso.capacidade?.toString() ?? "",
              localizacao: recurso.localizacao ?? "",
              placa: recurso.placa ?? "",
              modelo: recurso.modelo ?? "",
              kmAtual: recurso.kmAtual?.toString() ?? "",
              ativo: recurso.ativo,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
