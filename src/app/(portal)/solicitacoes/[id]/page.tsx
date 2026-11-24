import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Ban, CheckCircle2, CircleDot, Download, FileText, XCircle } from "lucide-react";

import { BadgeRotulo, ItemDetalhe } from "@/components/comuns";
import { BotaoEnviar, FormConfirmacao } from "@/components/formulario";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelarSolicitacao, decidirSolicitacao } from "@/features/solicitacoes/actions";
import { FormDecisao } from "@/features/solicitacoes/formularios";
import {
  podeCancelarSolicitacao,
  podeDecidirSolicitacao,
  podeVerSolicitacao,
} from "@/features/solicitacoes/regras";
import { CAMPOS_ATUALIZACAO, type CampoAtualizacao } from "@/features/solicitacoes/schemas";
import { descreverPedido } from "@/features/solicitacoes/tabela";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { STATUS_SOLICITACAO, TIPO_SOLICITACAO } from "@/lib/rotulos";
import { cn, formatarDataHora } from "@/lib/utils";
import { linkDownload } from "@/lib/uploads";

export const metadata: Metadata = { title: "Solicitação" };

const EVENTOS: Record<string, { texto: string; icone: typeof CircleDot; cor: string }> = {
  SOLICITACAO_CRIADA: { texto: "Solicitação enviada", icone: CircleDot, cor: "text-primary" },
  SOLICITACAO_APROVADA: { texto: "Aprovada", icone: CheckCircle2, cor: "text-emerald-600" },
  SOLICITACAO_REPROVADA: { texto: "Reprovada", icone: XCircle, cor: "text-destructive" },
  SOLICITACAO_CANCELADA: { texto: "Cancelada pelo colaborador", icone: Ban, cor: "text-muted-foreground" },
  DADOS_APLICADOS: { texto: "Cadastro atualizado automaticamente", icone: CheckCircle2, cor: "text-emerald-600" },
};

export default async function PaginaSolicitacao({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirSessao();
  const { id } = await params;

  const solicitacao = await prisma.solicitacao.findUnique({
    where: { id },
    include: {
      solicitante: {
        select: { nome: true, cargo: true, setor: { select: { nome: true } }, unidade: { select: { nome: true } } },
      },
      aprovador: { select: { nome: true, cargo: true } },
    },
  });
  if (!solicitacao) notFound();
  if (!podeVerSolicitacao(usuario, solicitacao)) redirect("/acesso-negado");

  const historico = await prisma.logAuditoria.findMany({
    where: { entidade: "Solicitacao", entidadeId: id },
    orderBy: { criadoEm: "asc" },
    include: { usuario: { select: { nome: true } } },
  });

  const podeDecidir = podeDecidirSolicitacao(usuario, solicitacao);
  const podeCancelar = podeCancelarSolicitacao(usuario, solicitacao);
  const pedido = solicitacao.dados as { campo?: CampoAtualizacao; valor?: string } | null;
  const ehMinha = solicitacao.solicitanteId === usuario.id;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={ehMinha ? "/solicitacoes" : "/solicitacoes/aprovacoes"}>
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <BadgeRotulo {...TIPO_SOLICITACAO[solicitacao.tipo]} />
                <BadgeRotulo {...STATUS_SOLICITACAO[solicitacao.status]} />
              </div>
              <CardTitle className="text-xl text-primary">
                {TIPO_SOLICITACAO[solicitacao.tipo].rotulo} — {solicitacao.solicitante.nome}
              </CardTitle>
              <CardDescription>
                {solicitacao.solicitante.cargo} · {solicitacao.solicitante.setor.nome} ·{" "}
                {solicitacao.solicitante.unidade.nome}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-5 sm:grid-cols-2">
                {pedido?.campo ? (
                  <>
                    <ItemDetalhe rotulo="Dado a atualizar">{CAMPOS_ATUALIZACAO[pedido.campo]}</ItemDetalhe>
                    <ItemDetalhe rotulo="Novo valor">{pedido.valor}</ItemDetalhe>
                  </>
                ) : (
                  <ItemDetalhe rotulo="Período">{descreverPedido(solicitacao)}</ItemDetalhe>
                )}
                <ItemDetalhe rotulo="Enviada em">{formatarDataHora(solicitacao.criadoEm)}</ItemDetalhe>
                {solicitacao.motivo && (
                  <ItemDetalhe rotulo="Observações do colaborador" className="sm:col-span-2">
                    <span className="font-normal whitespace-pre-line">{solicitacao.motivo}</span>
                  </ItemDetalhe>
                )}
              </dl>

              {solicitacao.anexoUrl && solicitacao.anexoNome && (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <span className="truncate">{solicitacao.anexoNome}</span>
                  </span>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={solicitacao.anexoUrl} target="_blank" rel="noreferrer">
                        Visualizar
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={linkDownload(solicitacao.anexoUrl, solicitacao.anexoNome)}>
                        <Download /> Baixar
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {solicitacao.decididoEm && (
                <div
                  className={cn(
                    "rounded-lg border p-4",
                    solicitacao.status === "APROVADA" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
                  )}
                >
                  <p className="text-sm font-semibold">
                    {solicitacao.status === "APROVADA" ? "Aprovada" : "Reprovada"} por {solicitacao.aprovador?.nome} em{" "}
                    {formatarDataHora(solicitacao.decididoEm)}
                  </p>
                  {solicitacao.observacaoAprovador && (
                    <p className="mt-1 text-sm whitespace-pre-line">“{solicitacao.observacaoAprovador}”</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {podeDecidir && (
            <Card>
              <CardHeader>
                <CardTitle>Sua decisão</CardTitle>
                <CardDescription>O colaborador é notificado assim que você decidir.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormDecisao acao={decidirSolicitacao.bind(null, solicitacao.id)} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-5 border-l pl-6">
                {historico.map((h) => {
                  const evento = EVENTOS[h.acao] ?? { texto: h.acao, icone: CircleDot, cor: "text-muted-foreground" };
                  const Icone = evento.icone;
                  return (
                    <li key={h.id} className="relative">
                      <Icone className={cn("absolute top-0.5 -left-[33px] size-4 rounded-full bg-card", evento.cor)} />
                      <p className="text-sm font-medium">{evento.texto}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.usuario?.nome ?? "Sistema"} · {formatarDataHora(h.criadoEm)}
                      </p>
                    </li>
                  );
                })}
                {solicitacao.status === "PENDENTE" && (
                  <li className="relative">
                    <span className="absolute top-1 -left-[30px] size-2.5 animate-pulse rounded-full bg-destaque" />
                    <p className="text-sm text-muted-foreground">
                      Aguardando {solicitacao.aprovador ? solicitacao.aprovador.nome : "o RH"}
                    </p>
                  </li>
                )}
              </ol>
            </CardContent>
          </Card>

          {podeCancelar && (
            <FormConfirmacao
              action={cancelarSolicitacao.bind(null, solicitacao.id)}
              mensagem="Cancelar esta solicitação?"
            >
              <BotaoEnviar variant="outline" className="w-full text-destructive hover:text-destructive" textoEnviando="Cancelando…">
                <Ban /> Cancelar solicitação
              </BotaoEnviar>
            </FormConfirmacao>
          )}
        </div>
      </div>
    </div>
  );
}
