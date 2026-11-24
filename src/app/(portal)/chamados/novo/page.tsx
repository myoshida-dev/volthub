import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FormNovoChamado } from "@/features/chamados/formularios";
import { exigirSessao } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Abrir chamado" };

export default async function PaginaNovoChamado() {
  await exigirSessao();
  return (
    <>
      <PageHeader
        titulo="Abrir chamado"
        descricao="Quanto mais detalhes, mais rápido a TI resolve."
      />
      <Card className="max-w-3xl">
        <CardContent>
          <FormNovoChamado />
        </CardContent>
      </Card>
    </>
  );
}
