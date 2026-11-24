import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Pencil, Pin, PinOff, Trash2 } from "lucide-react";

import { BadgeRotulo } from "@/components/comuns";
import { BotaoEnviar, FormConfirmacao } from "@/components/formulario";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { alternarFixado, excluirComunicado } from "@/features/comunicados/actions";
import { BotaoCiente, descreverPublico } from "@/features/comunicados/componentes";
import {
  filtroPublicoAlvo,
  filtroVisiveis,
  podeEditarComunicado,
} from "@/features/comunicados/consultas";
import { exigirSessao } from "@/lib/auth-guard";
import { ehDaEquipe } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_COMUNICADO } from "@/lib/rotulos";
import { formatarDataHora, iniciais, tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Comunicado" };

export default async function PaginaComunicado({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirSessao();
  const { id } = await params;

  const comunicado = await prisma.comunicado.findFirst({
    where: { AND: [{ id }, filtroVisiveis(usuario)] },
    include: {
      autor: { select: { nome: true, cargo: true, avatarUrl: true } },
      unidades: { select: { id: true, nome: true } },
      setores: { select: { id: true, nome: true } },
      leituras: {
        orderBy: { lidoEm: "desc" },
        select: { usuarioId: true, lidoEm: true, usuario: { select: { nome: true, cargo: true } } },
      },
    },
  });
  if (!comunicado) notFound();

  const publicoTotal = await prisma.usuario.count({
    where: filtroPublicoAlvo(
      comunicado.unidades.map((u) => u.id),
      comunicado.setores.map((s) => s.id),
    ),
  });

  const ciente = comunicado.leituras.some((l) => l.usuarioId === usuario.id);
  const podeEditar = podeEditarComunicado(usuario, comunicado);
  const podeVerLeitores = podeEditar || ehDaEquipe(usuario, "RH");
  const percentual = publicoTotal ? Math.round((comunicado.leituras.length / publicoTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/comunicados">
          <ArrowLeft /> Voltar ao mural
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {comunicado.fixado && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <Pin className="size-3.5" fill="currentColor" /> Fixado
                </span>
              )}
              <BadgeRotulo {...CATEGORIA_COMUNICADO[comunicado.categoria]} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">{comunicado.titulo}</h1>
            <div className="flex items-center gap-3">
              <Avatar className="size-9">
                {comunicado.autor.avatarUrl && <AvatarImage src={comunicado.autor.avatarUrl} alt="" />}
                <AvatarFallback>{iniciais(comunicado.autor.nome)}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium">{comunicado.autor.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {comunicado.autor.cargo} · {formatarDataHora(comunicado.publicadoEm)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-[15px] leading-relaxed whitespace-pre-line">{comunicado.conteudo}</div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <BotaoCiente comunicadoId={comunicado.id} ciente={ciente} />
              {comunicado.expiraEm && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" /> Expira em {formatarDataHora(comunicado.expiraEm)}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Leitura</CardTitle>
              <CardDescription>Para: {descreverPublico(comunicado.unidades, comunicado.setores)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold text-primary">
                {comunicado.leituras.length}
                <span className="text-sm font-normal text-muted-foreground"> de {publicoTotal} cientes</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percentual} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-destaque" style={{ width: `${percentual}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{percentual}% do público-alvo</p>
            </CardContent>
          </Card>

          {podeEditar && (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">Gerenciar</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button variant="outline" asChild>
                  <Link href={`/comunicados/${comunicado.id}/editar`}>
                    <Pencil /> Editar
                  </Link>
                </Button>
                <form action={alternarFixado.bind(null, comunicado.id)}>
                  <BotaoEnviar variant="outline" className="w-full" textoEnviando="Atualizando…">
                    {comunicado.fixado ? <PinOff /> : <Pin />}
                    {comunicado.fixado ? "Desafixar" : "Fixar no topo"}
                  </BotaoEnviar>
                </form>
                <FormConfirmacao
                  action={excluirComunicado.bind(null, comunicado.id)}
                  mensagem="Excluir este comunicado? As confirmações de leitura também serão apagadas."
                >
                  <BotaoEnviar variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" textoEnviando="Excluindo…">
                    <Trash2 /> Excluir
                  </BotaoEnviar>
                </FormConfirmacao>
              </CardContent>
            </Card>
          )}

          {podeVerLeitores && comunicado.leituras.length > 0 && (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="text-base">Quem já está ciente</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="max-h-80 space-y-3 overflow-y-auto">
                  {comunicado.leituras.map((l) => (
                    <li key={l.usuarioId} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{l.usuario.nome}</span>
                        <span className="block truncate text-xs text-muted-foreground">{l.usuario.cargo}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{tempoRelativo(l.lidoEm)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
