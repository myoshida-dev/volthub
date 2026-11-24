import Link from "next/link";
import { ArrowRight, CheckCircle2, Plus } from "lucide-react";

import { BotaoEnviar } from "@/components/formulario";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { marcarCiente } from "@/features/comunicados/actions";
import { filtroVisiveis } from "@/features/comunicados/consultas";
import { BotaoParabenizar } from "@/features/inicio/botao-parabenizar";
import { buscarPendencias, type Pendencia } from "@/features/inicio/pendencias";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { COR_TEXTO_CATEGORIA, CATEGORIA_COMUNICADO } from "@/lib/rotulos";
import {
  cn,
  diasUteisRestantesNoMes,
  formatarHora,
  FUSO,
  hojeISO,
  iniciais,
  moedaCompacta,
  plural,
  primeiroNome,
  tempoRelativo,
} from "@/lib/utils";

// ─── Utilidades da página ────────────────────────────────────

function saudacao(agora: Date) {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Horários de referência da agenda (as reservas do dia entram entre eles). */
const MARCOS_AGENDA = ["09:00", "11:00", "14:00", "16:00"];

const TONS: Record<Pendencia["tom"], string> = {
  destaque: "bg-destaque",
  info: "bg-info",
  neutro: "bg-muted-foreground/60",
};

function Cartao({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-xl border bg-card", className)}>{children}</section>;
}

function TituloCartao({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-4">
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {extra}
    </div>
  );
}

function AcaoPendencia({ pendencia }: { pendencia: Pendencia }) {
  const { acao } = pendencia;
  if (acao.tipo === "ciente") {
    return (
      <form action={marcarCiente.bind(null, acao.comunicadoId)}>
        <BotaoEnviar variant="destaque" size="sm" className="h-9 px-4" textoEnviando="Registrando…">
          Li e concordo
        </BotaoEnviar>
      </form>
    );
  }
  if (acao.estilo === "texto") {
    return (
      <Link href={acao.href} className="inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
        {acao.rotulo} <ArrowRight className="size-3.5" />
      </Link>
    );
  }
  return (
    <Button variant="outline" size="sm" className="h-9 px-4" asChild>
      <Link href={acao.href}>{acao.rotulo}</Link>
    </Button>
  );
}

// ─── Página ──────────────────────────────────────────────────

export default async function PaginaMeuDia() {
  const usuarioSessao = await exigirSessao();
  const agora = new Date();
  const hoje = hojeISO();
  const inicioHoje = new Date(`${hoje}T00:00:00-03:00`);
  const inicioAmanha = new Date(inicioHoje.getTime() + 86_400_000);
  const [ano, mes, diaHoje] = hoje.split("-").map(Number);
  const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));

  const [usuario, pendencias, metaSetor, metaGeral, comunicados, agendaHoje, proxima, pessoas, ramais] =
    await Promise.all([
      prisma.usuario.findUniqueOrThrow({
        where: { id: usuarioSessao.id },
        select: { nome: true, unidade: { select: { nome: true } } },
      }),
      buscarPendencias(usuarioSessao),
      prisma.metaMensal.findFirst({ where: { mes: inicioMes, setorId: usuarioSessao.setorId } }),
      prisma.metaMensal.findFirst({ where: { mes: inicioMes, setorId: null } }),
      prisma.comunicado.findMany({ where: filtroVisiveis(usuarioSessao), orderBy: { publicadoEm: "desc" }, take: 6 }),
      prisma.reserva.findMany({
        where: { usuarioId: usuarioSessao.id, status: { not: "CANCELADA" }, inicio: { gte: inicioHoje, lt: inicioAmanha } },
        include: { recurso: { select: { nome: true } } },
        orderBy: { inicio: "asc" },
      }),
      prisma.reserva.findFirst({
        where: { usuarioId: usuarioSessao.id, status: "CONFIRMADA", inicio: { gte: inicioAmanha } },
        orderBy: { inicio: "asc" },
      }),
      prisma.usuario.findMany({
        where: { ativo: true, dataNascimento: { not: null } },
        select: { id: true, nome: true, avatarUrl: true, dataNascimento: true, setor: { select: { nome: true } } },
      }),
      prisma.ramalUtil.findMany({
        where: { OR: [{ unidadeId: null }, { unidadeId: usuarioSessao.unidadeId }] },
        orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      }),
    ]);

  // Comunicados recentes: os que não estão em "Precisa de você".
  const pendentesIds = new Set(pendencias.flatMap((p) => (p.acao.tipo === "ciente" ? [p.acao.comunicadoId] : [])));
  const recentes = comunicados.filter((c) => !pendentesIds.has(c.id)).slice(0, 2);

  // Aniversariantes do mês, do mais próximo de hoje para o mais distante.
  const aniversariantes = pessoas
    .filter((p) => p.dataNascimento!.getUTCMonth() === mes - 1)
    .map((p) => ({ ...p, diferenca: p.dataNascimento!.getUTCDate() - diaHoje }))
    .sort((a, b) => Math.abs(a.diferenca) - Math.abs(b.diferenca))
    .slice(0, 4);
  const quandoFaz = (diferenca: number, data: Date) =>
    diferenca === 0
      ? "hoje"
      : diferenca === -1
        ? "ontem"
        : diferenca === 1
          ? "amanhã"
          : `${String(data.getUTCDate()).padStart(2, "0")}/${String(data.getUTCMonth() + 1).padStart(2, "0")}`;

  // Agenda: marcos fixos + horário de cada reserva do dia.
  const eventos = agendaHoje.map((r, i) => ({ ...r, hora: formatarHora(r.inicio), cor: i % 2 === 0 ? "info" : "destaque" }));
  const linhasAgenda = [...new Set([...MARCOS_AGENDA, ...eventos.map((e) => e.hora)])].sort();

  const meta = metaSetor ?? metaGeral;
  const nomeMes = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(inicioMes);
  const percentualMeta = meta ? Math.round((meta.valorRealizado / meta.valorMeta) * 100) : 0;

  const dataHoje = capitalizar(
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO }).format(agora),
  );
  const frase =
    pendencias.length === 0
      ? "Tudo em dia por aqui."
      : `Você tem ${plural(pendencias.length, "coisa pendente", "coisas pendentes")}.`;

  return (
    <>
      <PageHeader
        sobretitulo={`${dataHoje} · ${usuario.unidade.nome}`}
        titulo={`${saudacao(agora)}, ${primeiroNome(usuario.nome)}. ${frase}`}
        acoes={
          <>
            <Button size="lg" asChild>
              <Link href="/solicitacoes/nova">
                <Plus /> Nova solicitação
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/reservas">Reservar sala</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* ── Coluna principal ── */}
        <div className="space-y-5">
          <Cartao>
            <TituloCartao
              extra={
                pendencias.length > 0 && (
                  <span className="flex size-6 items-center justify-center rounded-full bg-destaque-suave text-xs font-bold text-[#9A7200]">
                    {pendencias.length}
                  </span>
                )
              }
            >
              Precisa de você
            </TituloCartao>
            {pendencias.length === 0 ? (
              <div className="flex items-center gap-3 border-t px-6 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="size-5 text-emerald-600" />
                Nada esperando por você. Bom trabalho!
              </div>
            ) : (
              <ul className="divide-y border-t">
                {pendencias.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                    <span className={cn("size-2 shrink-0 rounded-full", TONS[p.tom])} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{p.titulo}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{p.detalhe}</p>
                    </div>
                    <div className="shrink-0">
                      <AcaoPendencia pendencia={p} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {meta && (
            <section className="rounded-xl bg-primary px-6 py-6 text-primary-foreground">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-semibold">
                  {meta.titulo} — {nomeMes}
                </h2>
                <span className="text-sm text-[#9CC3D5]">
                  faltam {plural(diasUteisRestantesNoMes(agora), "dia útil", "dias úteis")}
                </span>
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-5xl font-bold tracking-tight tabular-nums">{percentualMeta}%</span>
                <span className="text-[15px] text-white/80">
                  {moedaCompacta(meta.valorRealizado)} de {moedaCompacta(meta.valorMeta)}
                </span>
              </p>
              <div
                className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-label={`${meta.titulo}: ${percentualMeta}% atingido`}
                aria-valuenow={percentualMeta}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-destaque" style={{ width: `${Math.min(percentualMeta, 100)}%` }} />
              </div>
            </section>
          )}

          {recentes.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold text-muted-foreground">Comunicados recentes</h2>
                <Link href="/comunicados" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Ver mural
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {recentes.map((c) => (
                  <Link
                    key={c.id}
                    href={`/comunicados/${c.id}`}
                    className="rounded-xl border bg-card px-5 py-4 transition-colors hover:border-primary/30"
                  >
                    <p className={cn("font-mono text-[11px] tracking-wide uppercase", COR_TEXTO_CATEGORIA[c.categoria])}>
                      {CATEGORIA_COMUNICADO[c.categoria].rotulo} · {tempoRelativo(c.publicadoEm)}
                    </p>
                    <p className="mt-2 text-[15px] leading-snug font-semibold">{c.titulo}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Coluna lateral ── */}
        <div className="space-y-5">
          <Cartao>
            <TituloCartao>Agenda de hoje</TituloCartao>
            <ol className="px-6">
              {linhasAgenda.map((hora) => {
                const daHora = eventos.filter((e) => e.hora === hora);
                return (
                  <li key={hora} className="grid min-h-11 grid-cols-[52px_minmax(0,1fr)] items-center gap-3 border-t py-1.5">
                    <span className="font-mono text-[13px] text-muted-foreground">{hora}</span>
                    <div className="space-y-1.5">
                      {daHora.map((e) => (
                        <Link
                          key={e.id}
                          href="/reservas"
                          className={cn(
                            "block truncate rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium",
                            e.cor === "info" ? "border-info bg-info-suave" : "border-destaque bg-destaque-suave",
                          )}
                        >
                          {e.titulo} · {e.recurso.nome}
                        </Link>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="border-t px-6 py-4 text-sm text-muted-foreground">
              {proxima
                ? `${capitalizar(new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO }).format(proxima.inicio).split("-")[0])} ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO }).format(proxima.inicio)} · ${formatarHora(proxima.inicio)} ${proxima.titulo}`
                : eventos.length === 0
                  ? "Nenhuma reserva sua para hoje ou para os próximos dias."
                  : "Nenhuma outra reserva nos próximos dias."}
            </p>
          </Cartao>

          <Cartao>
            <TituloCartao>Aniversariantes</TituloCartao>
            {aniversariantes.length === 0 ? (
              <p className="px-6 pb-5 text-sm text-muted-foreground">Nenhum aniversariante este mês.</p>
            ) : (
              <ul className="space-y-3 px-6 pb-5">
                {aniversariantes.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt="" />}
                      <AvatarFallback className={cn("text-[13px] font-bold", i % 2 === 1 && "bg-[#C9930B]")}>
                        {iniciais(a.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <Link href={`/diretorio/${a.id}`} className="min-w-0 flex-1 hover:underline">
                      <span className="block truncate text-[15px] font-semibold">{a.nome}</span>
                      <span className="block truncate text-[13px] text-muted-foreground">
                        {a.setor.nome} · {quandoFaz(a.diferenca, a.dataNascimento!)}
                      </span>
                    </Link>
                    {(a.diferenca === 0 || a.diferenca === -1) && a.id !== usuarioSessao.id && (
                      <BotaoParabenizar aniversarianteId={a.id} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {ramais.length > 0 && (
            <Cartao>
              <TituloCartao>Ramais úteis</TituloCartao>
              <dl className="space-y-2.5 px-6 pb-5">
                {ramais.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-3 text-[15px]">
                    <dt>{r.nome}</dt>
                    <dd className="font-mono">{r.numero}</dd>
                  </div>
                ))}
              </dl>
            </Cartao>
          )}
        </div>
      </div>
    </>
  );
}
