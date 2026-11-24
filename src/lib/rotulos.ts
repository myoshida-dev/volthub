import type {
  CategoriaChamado,
  CategoriaComunicado,
  CategoriaDocumento,
  PrioridadeChamado,
  StatusChamado,
  StatusReserva,
  StatusSolicitacao,
  TipoRecurso,
  TipoSolicitacao,
} from "@prisma/client";

/** Rótulo em português + classes de cor do badge. */
export type Rotulo = { rotulo: string; classe: string };

const cinza = "bg-slate-100 text-slate-700 border-slate-200";
const azul = "bg-sky-50 text-sky-800 border-sky-200";
const petroleo = "bg-secondary text-primary border-primary/15";
const amarelo = "bg-amber-50 text-amber-800 border-amber-200";
const verde = "bg-emerald-50 text-emerald-800 border-emerald-200";
const vermelho = "bg-red-50 text-red-700 border-red-200";
const roxo = "bg-violet-50 text-violet-800 border-violet-200";
const laranja = "bg-orange-50 text-orange-800 border-orange-200";

export const CATEGORIA_COMUNICADO: Record<CategoriaComunicado, Rotulo> = {
  GERAL: { rotulo: "Geral", classe: petroleo },
  RH: { rotulo: "RH", classe: roxo },
  TI: { rotulo: "TI", classe: azul },
  SEGURANCA: { rotulo: "Segurança", classe: laranja },
  EVENTOS: { rotulo: "Eventos", classe: verde },
  COMERCIAL: { rotulo: "Comercial", classe: amarelo },
};

/** Cor do texto da categoria nos rótulos em fonte mono ("TI · ONTEM"). */
export const COR_TEXTO_CATEGORIA: Record<CategoriaComunicado, string> = {
  GERAL: "text-primary",
  RH: "text-violet-700",
  TI: "text-info",
  SEGURANCA: "text-orange-700",
  EVENTOS: "text-emerald-700",
  COMERCIAL: "text-[#B58500]",
};

export const TIPO_SOLICITACAO: Record<TipoSolicitacao, Rotulo> = {
  FERIAS: { rotulo: "Férias", classe: verde },
  FOLGA: { rotulo: "Folga", classe: azul },
  ATESTADO: { rotulo: "Atestado", classe: laranja },
  ATUALIZACAO_DADOS: { rotulo: "Atualização de dados", classe: roxo },
};

export const STATUS_SOLICITACAO: Record<StatusSolicitacao, Rotulo> = {
  PENDENTE: { rotulo: "Pendente", classe: amarelo },
  APROVADA: { rotulo: "Aprovada", classe: verde },
  REPROVADA: { rotulo: "Reprovada", classe: vermelho },
  CANCELADA: { rotulo: "Cancelada", classe: cinza },
};

export const CATEGORIA_CHAMADO: Record<CategoriaChamado, Rotulo> = {
  HARDWARE: { rotulo: "Hardware", classe: petroleo },
  SOFTWARE: { rotulo: "Software", classe: petroleo },
  REDE: { rotulo: "Rede e internet", classe: petroleo },
  ACESSO: { rotulo: "Acessos e senhas", classe: petroleo },
  EMAIL: { rotulo: "E-mail", classe: petroleo },
  IMPRESSORA: { rotulo: "Impressora", classe: petroleo },
  OUTROS: { rotulo: "Outros", classe: petroleo },
};

export const PRIORIDADE_CHAMADO: Record<PrioridadeChamado, Rotulo> = {
  BAIXA: { rotulo: "Baixa", classe: cinza },
  MEDIA: { rotulo: "Média", classe: azul },
  ALTA: { rotulo: "Alta", classe: laranja },
  URGENTE: { rotulo: "Urgente", classe: vermelho },
};

export const STATUS_CHAMADO: Record<StatusChamado, Rotulo> = {
  ABERTO: { rotulo: "Aberto", classe: amarelo },
  EM_ANDAMENTO: { rotulo: "Em andamento", classe: azul },
  AGUARDANDO_USUARIO: { rotulo: "Aguardando você", classe: roxo },
  RESOLVIDO: { rotulo: "Resolvido", classe: verde },
  FECHADO: { rotulo: "Fechado", classe: cinza },
};

/** Na visão da TI, "Aguardando você" vira "Aguardando usuário". */
export const STATUS_CHAMADO_TI: Record<StatusChamado, Rotulo> = {
  ...STATUS_CHAMADO,
  AGUARDANDO_USUARIO: { rotulo: "Aguardando usuário", classe: roxo },
};

export const TIPO_RECURSO: Record<TipoRecurso, Rotulo> = {
  SALA: { rotulo: "Sala", classe: petroleo },
  VEICULO: { rotulo: "Veículo", classe: amarelo },
};

export const STATUS_RESERVA: Record<StatusReserva, Rotulo> = {
  CONFIRMADA: { rotulo: "Confirmada", classe: verde },
  CANCELADA: { rotulo: "Cancelada", classe: cinza },
  CONCLUIDA: { rotulo: "Concluída", classe: azul },
};

export const CATEGORIA_DOCUMENTO: Record<CategoriaDocumento, Rotulo> = {
  POLITICA: { rotulo: "Política", classe: petroleo },
  MANUAL: { rotulo: "Manual", classe: azul },
  FORMULARIO: { rotulo: "Formulário", classe: amarelo },
  PROCEDIMENTO: { rotulo: "Procedimento", classe: verde },
  MODELO: { rotulo: "Modelo", classe: roxo },
  OUTROS: { rotulo: "Outros", classe: cinza },
};

/** Lista [valor, rótulo] para popular selects. */
export function opcoes<T extends string>(mapa: Record<T, Rotulo>) {
  return (Object.entries(mapa) as [T, Rotulo][]).map(([valor, { rotulo }]) => ({ valor, rotulo }));
}
