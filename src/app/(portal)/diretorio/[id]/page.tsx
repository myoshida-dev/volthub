import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Cake, CalendarDays, Mail, Phone, PhoneCall } from "lucide-react";

import { CartaoPessoa, selecionarPessoa } from "@/components/cartao-pessoa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirSessao } from "@/lib/auth-guard";
import { descreverAcesso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatarData, iniciais } from "@/lib/utils";

export const metadata: Metadata = { title: "Colaborador" };

export default async function PaginaColaborador({ params }: { params: Promise<{ id: string }> }) {
  await exigirSessao();
  const { id } = await params;

  const pessoa = await prisma.usuario.findFirst({
    where: { id, ativo: true },
    include: {
      unidade: true,
      setor: true,
      gestor: { select: selecionarPessoa },
      subordinados: { where: { ativo: true }, select: selecionarPessoa, orderBy: { nome: "asc" } },
    },
  });
  if (!pessoa) notFound();

  const aniversario = pessoa.dataNascimento
    ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" }).format(pessoa.dataNascimento)
    : null;

  const contatos = [
    { icone: Mail, rotulo: "E-mail", valor: pessoa.email, href: `mailto:${pessoa.email}` },
    { icone: PhoneCall, rotulo: "Ramal", valor: pessoa.ramal ?? "—" },
    { icone: Phone, rotulo: "Celular", valor: pessoa.telefone ?? "—", href: pessoa.telefone ? `tel:${pessoa.telefone.replace(/\D/g, "")}` : undefined },
    { icone: Building2, rotulo: "Unidade", valor: `${pessoa.unidade.nome} — ${pessoa.unidade.cidade}/${pessoa.unidade.uf}` },
    { icone: CalendarDays, rotulo: "Na Volt desde", valor: formatarData(pessoa.dataAdmissao) },
    ...(aniversario ? [{ icone: Cake, rotulo: "Aniversário", valor: aniversario }] : []),
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/diretorio">
          <ArrowLeft /> Pessoas
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar className="size-24 ring-4 ring-destaque/40">
            {pessoa.avatarUrl && <AvatarImage src={pessoa.avatarUrl} alt="" />}
            <AvatarFallback className="text-2xl">{iniciais(pessoa.nome)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary">{pessoa.nome}</h1>
            <p className="text-muted-foreground">
              {pessoa.cargo} · {pessoa.setor.nome}
            </p>
            {pessoa.perfil !== "COLABORADOR" && <Badge variant="secondary">{descreverAcesso(pessoa)}</Badge>}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Contato</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {contatos.map(({ icone: Icone, rotulo, valor, href }) => (
                <div key={rotulo} className="flex items-start gap-3">
                  <Icone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{rotulo}</dt>
                    <dd className="text-sm font-medium break-words">
                      {href ? <a href={href} className="hover:underline">{valor}</a> : valor}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {pessoa.gestor && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Gestor direto</h2>
              <CartaoPessoa pessoa={pessoa.gestor} />
            </section>
          )}
          {pessoa.subordinados.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Equipe direta ({pessoa.subordinados.length})
              </h2>
              <div className="grid gap-3">
                {pessoa.subordinados.map((s) => (
                  <CartaoPessoa key={s.id} pessoa={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
