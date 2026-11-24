import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { opcoesFormularioUsuario } from "@/features/admin/consultas";
import { FormUsuario } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";

export const metadata: Metadata = { title: "Novo usuário" };

export default async function PaginaNovoUsuario() {
  await exigirPermissao("usuario:gerenciar");
  const opcoes = await opcoesFormularioUsuario();

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/usuarios"><ArrowLeft /> Usuários</Link>
      </Button>
      <PageHeader titulo="Novo usuário" descricao="Uma senha temporária é gerada ao cadastrar." />
      <Card className="max-w-3xl">
        <CardContent>
          <FormUsuario id={null} {...opcoes} />
        </CardContent>
      </Card>
    </>
  );
}
