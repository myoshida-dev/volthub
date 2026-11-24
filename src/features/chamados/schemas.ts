import { CategoriaChamado, PrioridadeChamado, StatusChamado } from "@prisma/client";
import { z } from "zod";

import { checkbox, vazioParaUndefined } from "@/lib/formularios";

export const novoChamadoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "Descreva o problema em pelo menos 5 caracteres.")
    .max(120, "Use no máximo 120 caracteres."),
  categoria: z.enum(CategoriaChamado, { error: "Escolha uma categoria." }),
  prioridade: z.enum(PrioridadeChamado, { error: "Escolha a prioridade." }),
  descricao: z
    .string()
    .trim()
    .min(10, "Conte um pouco mais (pelo menos 10 caracteres).")
    .max(5000, "O texto está longo demais."),
});

export const comentarioSchema = z.object({
  conteudo: z.string().trim().min(1, "Escreva uma mensagem.").max(5000, "Mensagem longa demais."),
  interno: checkbox,
});

export const atendimentoSchema = z.object({
  status: z.enum(StatusChamado),
  prioridade: z.enum(PrioridadeChamado),
  responsavelId: z.preprocess(vazioParaUndefined, z.string().optional()),
});

/** Status considerados "em aberto" (ainda exigem ação da TI ou do usuário). */
export const STATUS_EM_ABERTO: StatusChamado[] = ["ABERTO", "EM_ANDAMENTO", "AGUARDANDO_USUARIO"];
