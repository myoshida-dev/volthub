import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Hand, Lock, Paperclip, RotateCcw } from "lucide-react";

import { BadgeRotulo, ItemDetalhe } from "@/components/comuns";
import { BotaoEnviar } from "@/components/formulario";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  assumirChamado,
  atualizarAtendimento,
  comentarChamado,
  confirmarSolucao,
  reabrirChamado,
} from "@/features/chamados/actions";
import { FormAtendimento, FormComentario } from "@/features/chamados/formularios";
import { exigirSessao } from "@/lib/auth-guard";
import { ehDaEquipe } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_CHAMADO, PRIORIDADE_CHAMADO, STATUS_CHAMADO, STATUS_CHAMADO_TI } from "@/lib/rotulos";
import { linkDownload } from "@/lib/uploads";
import { cn, formatarDataHora, iniciais, numeroChamado, tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Chamado" };

function Anexo({ url, nome }: { url: string; nome: string }) {
  return (
    <a
      href={linkDownload(url, nome)}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs hover:bg-accent"
    >
      <Paperclip className="size-3.5 shrink-0" />
      <span className="truncate">{nome}</span>
    </a>
  );
}

export default async function PaginaChamado({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirSessao();
  const { id } = await params;
  const ehTi = ehDaEquipe(usuario, "TI");

  const chamado = await prisma.chamado.findUnique({
    where: { id },
    include: {
      solicitante: {
        select: {
          nome: true,
          cargo: true,
          email: true,
          ramal: true,
          avatarUrl: true,
          unidade: { select: { nome: true } },
          setor: { select: { nome: true } },
        },
      },
      responsavel: { select: { nome: true } },
      comentarios: {
        where: ehTi ? {} : { interno: false },
        orderBy: { criadoEm: "asc" },
        include: { autor: { select: { id: true, nome: true, avatarUrl: true, equipe: true } } },
      },
    },
  });
  if (!chamado) notFound();
  const ehSolicitante = chamado.solicitanteId === usuario.id;
  if (!ehSolicitante && !ehTi) redirect("/acesso-negado");

  const equipeTi = ehTi
    ? await prisma.usuario.findMany({
        where: { equipe: "TI", ativo: true },
        orderBy: { nome: "asc" },
        select: { id: true, nome: true },
      })
    : [];

  const rotulosStatus = ehTi ? STATUS_CHAMADO_TI : STATUS_CHAMADO;
  const fechado = chamado.status === "FECHADO";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={ehTi && !ehSolicitante ? "/chamados/fila" : "/chamados"}>
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">{numeroChamado(chamado.numero)}</span>
                <BadgeRotulo {...rotulosStatus[chamado.status]} />
                <BadgeRotulo {...PRIORIDADE_CHAMADO[chamado.prioridade]} />
              </div>
              <CardTitle className="text-xl text-primary">{chamado.titulo}</CardTitle>
              <CardDescription>
                Aberto por {chamado.solicitante.nome} {tempoRelativo(chamado.criadoEm)} · {CATEGORIA_CHAMADO[chamado.categoria].rotulo}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed whitespace-pre-line">{chamado.descricao}</p>
              {chamado.anexoUrl && chamado.anexoNome && <Anexo url={chamado.anexoUrl} nome={chamado.anexoNome} />}
            </CardContent>
          </Card>

          {ehSolicitante && chamado.status === "RESOLVIDO" && (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-emerald-900">
                  A TI marcou este chamado como resolvido. O problema foi resolvido?
                </p>
                <div className="flex gap-2">
                  <form action={confirmarSolucao.bind(null, chamado.id)}>
                    <BotaoEnviar size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" textoEnviando="Fechando…">
                      <CheckCircle2 /> Sim, fechar
                    </BotaoEnviar>
                  </form>
                  <form action={reabrirChamado.bind(null, chamado.id)}>
                    <BotaoEnviar size="sm" variant="outline" textoEnviando="Reabrindo…">
                      <RotateCcw /> Ainda não
                    </BotaoEnviar>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Conversa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {chamado.comentarios.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
              )}
              <ol className="space-y-4">
                {chamado.comentarios.map((c) => {
                  const daTi = c.autor.equipe === "TI";
                  return (
                    <li key={c.id} className={cn("flex gap-3", daTi && "flex-row-reverse")}>
                      <Avatar className="size-8">
                        {c.autor.avatarUrl && <AvatarImage src={c.autor.avatarUrl} alt="" />}
                        <AvatarFallback className={cn(daTi && "bg-destaque text-destaque-foreground")}>
                          {iniciais(c.autor.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[85%] space-y-2 rounded-xl border px-4 py-3",
                          c.interno ? "border-amber-200 bg-amber-50" : daTi ? "bg-secondary" : "bg-card",
                        )}
                      >
                        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{c.autor.nome}</span>
                          {daTi && <span>· TI</span>}
                          <time title={formatarDataHora(c.criadoEm)}>{tempoRelativo(c.criadoEm)}</time>
                          {c.interno && (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-800">
                              <Lock className="size-3" /> Interno
                            </span>
                          )}
                        </p>
                        <p className="text-sm whitespace-pre-line">{c.conteudo}</p>
                        {c.anexoUrl && c.anexoNome && <Anexo url={c.anexoUrl} nome={c.anexoNome} />}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {fechado ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Chamado fechado. Se o problema voltar, abra um novo chamado.
                </p>
              ) : (
                <FormComentario acao={comentarChamado.bind(null, chamado.id)} ehTi={ehTi} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <ItemDetalhe rotulo="Solicitante">
                  {chamado.solicitante.nome}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {chamado.solicitante.cargo} · {chamado.solicitante.setor.nome}
                  </span>
                </ItemDetalhe>
                <ItemDetalhe rotulo="Unidade">{chamado.solicitante.unidade.nome}</ItemDetalhe>
                {ehTi && (
                  <ItemDetalhe rotulo="Contato">
                    {chamado.solicitante.email}
                    {chamado.solicitante.ramal && ` · ramal ${chamado.solicitante.ramal}`}
                  </ItemDetalhe>
                )}
                <ItemDetalhe rotulo="Responsável">{chamado.responsavel?.nome ?? "Ainda não atribuído"}</ItemDetalhe>
                <ItemDetalhe rotulo="Aberto em">{formatarDataHora(chamado.criadoEm)}</ItemDetalhe>
                {chamado.resolvidoEm && (
                  <ItemDetalhe rotulo="Resolvido em">{formatarDataHora(chamado.resolvidoEm)}</ItemDetalhe>
                )}
              </dl>
            </CardContent>
          </Card>

          {ehTi && (
            <Card className="gap-4 border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">Atendimento (TI)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {chamado.responsavelId !== usuario.id && !fechado && (
                  <form action={assumirChamado.bind(null, chamado.id)}>
                    <BotaoEnviar variant="destaque" className="w-full" textoEnviando="Assumindo…">
                      <Hand /> Assumir chamado
                    </BotaoEnviar>
                  </form>
                )}
                <FormAtendimento
                  key={`${chamado.status}-${chamado.prioridade}-${chamado.responsavelId}`}
                  acao={atualizarAtendimento.bind(null, chamado.id)}
                  inicial={{
                    status: chamado.status,
                    prioridade: chamado.prioridade,
                    responsavelId: chamado.responsavelId,
                  }}
                  equipeTi={equipeTi}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
