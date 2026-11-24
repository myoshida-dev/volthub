import type { Metadata } from "next";

import { Logo } from "@/components/logo";
import { FormLogin } from "@/features/auth/form-login";
import { prisma } from "@/lib/prisma";
import { diasUteisRestantesNoMes, FUSO, hojeISO, plural } from "@/lib/utils";

export const metadata: Metadata = { title: "Entrar" };

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function saudacao(agora: Date) {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(agora));
  if (hora < 12) return "Bom dia!";
  if (hora < 18) return "Boa tarde!";
  return "Boa noite!";
}

/**
 * Avisos do painel esquerdo. Por ser uma tela pública, mostra só o que é
 * da empresa toda: o comunicado de TI mais recente sem público-alvo
 * restrito e a meta geral do mês (nunca metas de setor).
 */
async function buscarAvisos(agora: Date) {
  const [ano, mes] = hojeISO().split("-").map(Number);
  const [avisoTi, metaGeral, ramalTi] = await Promise.all([
    prisma.comunicado.findFirst({
      where: {
        categoria: "TI",
        unidades: { none: {} },
        setores: { none: {} },
        publicadoEm: { gte: new Date(agora.getTime() - 14 * 86_400_000) },
        OR: [{ expiraEm: null }, { expiraEm: { gt: agora } }],
      },
      orderBy: { publicadoEm: "desc" },
      select: { titulo: true },
    }),
    prisma.metaMensal.findFirst({
      where: { setorId: null, mes: new Date(Date.UTC(ano, mes - 1, 1)) },
      select: { mes: true, valorMeta: true, valorRealizado: true },
    }),
    prisma.ramalUtil.findFirst({
      where: { unidadeId: null, nome: { contains: "TI", mode: "insensitive" } },
      orderBy: { ordem: "asc" },
      select: { numero: true },
    }),
  ]);

  const avisos: { selo: string; classeSelo: string; texto: string }[] = [];
  if (avisoTi) {
    avisos.push({ selo: "TI", classeSelo: "bg-destaque text-destaque-foreground", texto: avisoTi.titulo });
  }
  if (metaGeral) {
    const nomeMes = capitalizar(new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(metaGeral.mes));
    const pct = Math.round((metaGeral.valorRealizado / metaGeral.valorMeta) * 100);
    avisos.push({
      selo: "META",
      classeSelo: "bg-info text-white",
      texto: `${nomeMes} em ${pct}% — faltam ${plural(diasUteisRestantesNoMes(agora), "dia útil", "dias úteis")}`,
    });
  }
  return { avisos, ramalSuporte: ramalTi?.numero };
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; expirada?: string }>;
}) {
  const { callbackUrl, expirada } = await searchParams;
  const agora = new Date();
  const { avisos, ramalSuporte } = await buscarAvisos(agora);

  const diaSemana = capitalizar(
    new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO }).format(agora).split("-")[0],
  );
  const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: FUSO }).format(agora);
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(agora);

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* Painel institucional */}
      <section className="hidden flex-col justify-between bg-primary px-12 py-12 text-white lg:flex">
        <Logo claro />

        <div className="max-w-xl space-y-8">
          <div className="space-y-4">
            <p className="text-[15px] text-white/60">
              {diaSemana}, {diaMes} · {hora}
            </p>
            <h1 className="max-w-[460px] text-[44px] leading-[1.12] font-bold tracking-tight">
              Tudo do seu dia de trabalho num só lugar.
            </h1>
          </div>

          {avisos.length > 0 && (
            <ul className="space-y-3">
              {avisos.map((aviso) => (
                <li key={aviso.selo} className="flex items-center gap-3 rounded-xl bg-white/[0.07] px-4 py-3.5">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${aviso.classeSelo}`}>
                    {aviso.selo}
                  </span>
                  <span className="text-[15px] font-medium">{aviso.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-sm text-white/50">Portal interno · Volt Distribuidora de Materiais Elétricos</p>
      </section>

      {/* Formulário */}
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Logo className="mb-10 lg:hidden" />
          <header className="mb-7 space-y-1.5">
            <h2 className="text-[28px] leading-tight font-bold tracking-tight">{saudacao(agora)} Entre na sua conta</h2>
            <p className="text-[15px] text-muted-foreground">Use o mesmo usuário do computador.</p>
          </header>
          {expirada && (
            <p className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              Sua sessão foi encerrada. Entre novamente.
            </p>
          )}
          <FormLogin callbackUrl={callbackUrl} ramalSuporte={ramalSuporte} />
        </div>
      </section>
    </main>
  );
}
