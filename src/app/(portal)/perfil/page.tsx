import type { Metadata } from "next";
import Link from "next/link";
import {
  AtSign,
  IdCard,
  Briefcase,
  Building2,
  CalendarDays,
  FilePen,
  Mail,
  Network,
  Phone,
  PhoneCall,
  ShieldCheck,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormPerfil, FormSenha } from "@/features/perfil/formularios";
import { exigirSessao } from "@/lib/auth-guard";
import { descreverAcesso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatarData, formatarDataHora, iniciais } from "@/lib/utils";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function PaginaPerfil() {
  const { id } = await exigirSessao();
  const usuario = await prisma.usuario.findUniqueOrThrow({
    where: { id },
    include: {
      unidade: { select: { nome: true, cidade: true, uf: true } },
      setor: { select: { nome: true } },
      gestor: { select: { nome: true, cargo: true } },
    },
  });

  const campos = [
    { icone: AtSign, rotulo: "Usuário de rede", valor: usuario.login },
    { icone: IdCard, rotulo: "Matrícula", valor: usuario.matricula },
    { icone: Mail, rotulo: "E-mail", valor: usuario.email },
    { icone: Phone, rotulo: "Celular", valor: usuario.telefone ?? "—" },
    { icone: PhoneCall, rotulo: "Ramal", valor: usuario.ramal ?? "—" },
    { icone: Briefcase, rotulo: "Setor", valor: usuario.setor.nome },
    {
      icone: Building2,
      rotulo: "Unidade",
      valor: `${usuario.unidade.nome} (${usuario.unidade.cidade}/${usuario.unidade.uf})`,
    },
    {
      icone: Network,
      rotulo: "Gestor direto",
      valor: usuario.gestor ? `${usuario.gestor.nome} — ${usuario.gestor.cargo}` : "—",
    },
    { icone: CalendarDays, rotulo: "Admissão", valor: formatarData(usuario.dataAdmissao) },
    { icone: ShieldCheck, rotulo: "Perfil de acesso", valor: descreverAcesso(usuario) },
  ];

  return (
    <>
      <PageHeader titulo="Meu perfil" descricao="Seus dados cadastrais e preferências de acesso." />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit items-center text-center">
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="size-24 ring-4 ring-destaque/40">
              {usuario.avatarUrl && <AvatarImage src={usuario.avatarUrl} alt="" />}
              <AvatarFallback className="text-2xl">{iniciais(usuario.nome)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{usuario.nome}</p>
              <p className="text-sm text-muted-foreground">{usuario.cargo}</p>
            </div>
            <Badge variant="destaque">{descreverAcesso(usuario)}</Badge>
            {usuario.ultimoAcessoEm && (
              <p className="text-xs text-muted-foreground">
                Último acesso: {formatarDataHora(usuario.ultimoAcessoEm)}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações cadastrais</CardTitle>
              <CardDescription>
                Mantidas pelo RH. Para corrigir algum dado, abra uma solicitação de atualização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                {campos.map(({ icone: Icone, rotulo, valor }) => (
                  <div key={rotulo} className="flex items-start gap-3">
                    <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                      <dd className="text-sm font-medium break-words">{valor}</dd>
                    </div>
                  </div>
                ))}
              </dl>
              <Button variant="outline" asChild>
                <Link href="/solicitacoes/nova?tipo=ATUALIZACAO_DADOS">
                  <FilePen /> Solicitar atualização de dados
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Foto e ramal</CardTitle>
                <CardDescription>Ajude os colegas a te encontrar no diretório.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormPerfil nome={usuario.nome} ramal={usuario.ramal} avatarUrl={usuario.avatarUrl} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alterar senha</CardTitle>
                <CardDescription>Use uma senha que você não usa em outros sites.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormSenha />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
