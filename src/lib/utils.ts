import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes do Tailwind resolvendo conflitos (padrão shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Juliana Costa Lima" → "JL" */
export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

/** "Juliana Costa Lima" → "Juliana" */
export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Fuso usado para exibir datas e horas (a empresa fica toda no mesmo fuso). */
export const FUSO = "America/Sao_Paulo";

const formatadorData = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
});
const formatadorRelativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** Formata datas armazenadas como DATE (sem fuso) no padrão dd/mm/aaaa. */
export function formatarData(data: Date | string | null | undefined) {
  if (!data) return "—";
  return formatadorData.format(new Date(data));
}

/** Data e hora no fuso da empresa: 24/11/2026 14:30 */
export function formatarDataHora(data: Date | string | null | undefined) {
  if (!data) return "—";
  return formatadorDataHora.format(new Date(data));
}

export function formatarHora(data: Date | string) {
  return formatadorHora.format(new Date(data));
}

/** "há 5 minutos", "ontem", "em 3 dias" */
export function tempoRelativo(data: Date | string) {
  const segundos = (new Date(data).getTime() - Date.now()) / 1000;
  const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unidade, tamanho] of unidades) {
    if (Math.abs(segundos) >= tamanho) {
      return formatadorRelativo.format(Math.round(segundos / tamanho), unidade);
    }
  }
  return "agora mesmo";
}

/** Data de hoje (fuso da empresa) como "AAAA-MM-DD", para inputs type="date". */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
}

/** Dias corridos entre duas datas DATE, contando as duas pontas. */
export function diasEntre(inicio: Date, fim: Date) {
  return Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1;
}

/** Período curto de colunas DATE: "02/01 a 16/01" (ou só "02/01" se for um dia). */
export function periodoCurto(inicio: Date | null, fim: Date | null) {
  if (!inicio) return "";
  const f = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return !fim || fim.getTime() === inicio.getTime() ? f(inicio) : `${f(inicio)} a ${f(fim)}`;
}

const formatadorMoedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

/** 1840000 → "R$ 1,84 mi" */
export function moedaCompacta(valor: number) {
  return formatadorMoedaCompacta.format(valor);
}

/** Dias úteis (seg–sex) que ainda faltam no mês, sem contar hoje. */
export function diasUteisRestantesNoMes(agora = new Date()) {
  const [ano, mes, dia] = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora).split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  let uteis = 0;
  for (let d = dia + 1; d <= ultimoDia; d++) {
    const semana = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();
    if (semana !== 0 && semana !== 6) uteis++;
  }
  return uteis;
}

/** Coluna DATE (meia-noite UTC) → "AAAA-MM-DD" para inputs type="date". */
export function dataParaInput(data: Date | null | undefined) {
  return data ? data.toISOString().slice(0, 10) : "";
}

export function formatarBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/** Número do chamado para exibição: #0042 */
export function numeroChamado(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}

/** Plural simples: plural(3, "dia", "dias") → "3 dias" */
export function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}
