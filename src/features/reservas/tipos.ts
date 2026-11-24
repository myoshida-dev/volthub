import type { StatusReserva, TipoRecurso } from "@prisma/client";

/** Recurso serializado para o client. */
export type RecursoCalendario = {
  id: string;
  nome: string;
  tipo: TipoRecurso;
  descricao: string | null;
  capacidade: number | null;
  localizacao: string | null;
  placa: string | null;
  modelo: string | null;
  kmAtual: number | null;
  cor: string;
};

/** Reserva serializada para o client (datas em ISO). */
export type ReservaCalendario = {
  id: string;
  titulo: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  destino: string | null;
  observacoes: string | null;
  kmSaida: number | null;
  kmRetorno: number | null;
  usuarioId: string;
  usuarioNome: string;
  recurso: RecursoCalendario & { unidade: string };
};

/** Cores distintas para os recursos no calendário (texto branco legível em todas). */
export const CORES_RECURSOS = [
  "#0F3D4C",
  "#2563EB",
  "#7C3AED",
  "#0F766E",
  "#B45309",
  "#BE185D",
  "#4D7C0F",
  "#9A3412",
];
