import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { opcoesFormularioUsuario } from "@/features/admin/consultas";
import { BotaoRedefinirSenha, FormUsuario } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { dataParaInput, formatarDataHora } from "@/lib/utils";

export const metadata: Metadata = { title: "Editar usuário" };

export default async function PaginaEditarUsuario({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("usuario:gerenciar");
  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) notFound();
  const opcoes = await opcoesFormularioUsuario(id);

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/admin/usuarios"><ArrowLeft /> Usuários</Link>
      </Button>
      <PageHeader
        titulo={usuario.nome}
        descricao={`Matrícula ${usuario.matricula} · cadastrado em ${formatarDataHora(usuario.criadoEm)} · último acesso: ${usuario.ultimoAcessoEm ? formatarDataHora(usuario.ultimoAcessoEm) : "nunca"}`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardContent>
            <FormUsuario
              id={usuario.id}
              {...opcoes}
              inicial={{
                nome: usuario.nome,
                login: usuario.login,
                email: usuario.email,
                cargo: usuario.cargo,
                perfil: usuario.perfil,
                equipe: usuario.equipe ?? "",
                unidadeId: usuario.unidadeId,
                setorId: usuario.setorId,
                gestorId: usuario.gestorId ?? "",
                telefone: usuario.telefone ?? "",
                ramal: usuario.ramal ?? "",
                dataAdmissao: dataParaInput(usuario.dataAdmissao),
                dataNascimento: dataParaInput(usuario.dataNascimento),
                ativo: usuario.ativo,
              }}
            />
          </CardContent>
        </Card>
        <Card className="h-fit gap-4">
          <CardHeader>
            <CardTitle className="text-base">Acesso</CardTitle>
            <CardDescription>Gera uma senha temporária para a pessoa trocar no primeiro acesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <BotaoRedefinirSenha id={usuario.id} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
