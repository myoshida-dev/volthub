import type { TipoRecurso } from "@prisma/client";

/** Regras de reserva (funções puras, cobertas por testes). */

export const DURACAO_MAXIMA_HORAS: Record<TipoRecurso, number> = {
  SALA: 12,
  VEICULO: 72,
};

/** Tolerância para reservar "agora" (o formulário leva alguns segundos para ser enviado). */
const TOLERANCIA_PASSADO_MS = 5 * 60 * 1000;

/**
 * Intervalos semiabertos [inicio, fim): encostar não é sobrepor.
 * 10:00–11:00 e 11:00–12:00 → sem conflito.
 */
export function sobrepoe(a: { inicio: Date; fim: Date }, b: { inicio: Date; fim: Date }) {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/** Retorna a mensagem de erro do período, ou null se estiver válido. */
export function validarPeriodo(tipo: TipoRecurso, inicio: Date, fim: Date, agora = new Date()) {
  if (fim <= inicio) return "O término deve ser depois do início.";
  if (inicio.getTime() < agora.getTime() - TOLERANCIA_PASSADO_MS) {
    return "Não é possível reservar um horário que já passou.";
  }
  const horas = (fim.getTime() - inicio.getTime()) / 3_600_000;
  if (horas > DURACAO_MAXIMA_HORAS[tipo]) {
    return tipo === "SALA"
      ? `Salas podem ser reservadas por no máximo ${DURACAO_MAXIMA_HORAS.SALA} horas.`
      : `Veículos podem ser reservados por no máximo ${DURACAO_MAXIMA_HORAS.VEICULO / 24} dias.`;
  }
  return null;
}

/** Valida a quilometragem de retorno de um veículo. */
export function validarKmRetorno(kmSaida: number, kmRetorno: number) {
  if (kmRetorno < kmSaida) return "O km de retorno não pode ser menor que o de saída.";
  if (kmRetorno - kmSaida > 5000) return "Mais de 5.000 km em uma reserva? Confira o valor digitado.";
  return null;
}
