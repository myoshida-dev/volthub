import { CategoriaComunicado } from "@prisma/client";
import { z } from "zod";

import { checkbox, vazioParaUndefined } from "@/lib/formularios";

export const comunicadoSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(5, "O título deve ter pelo menos 5 caracteres.")
    .max(140, "Use no máximo 140 caracteres."),
  categoria: z.enum(CategoriaComunicado, { error: "Escolha uma categoria." }),
  conteudo: z
    .string()
    .trim()
    .min(20, "Escreva pelo menos 20 caracteres.")
    .max(10000, "O texto está longo demais."),
  fixado: checkbox,
  expiraEm: z.preprocess(
    vazioParaUndefined,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
      // Expira no fim do dia escolhido (horário de Brasília, UTC-3).
      .transform((s) => new Date(`${s}T23:59:59.000-03:00`))
      .refine((d) => d > new Date(), "A data de expiração deve ser futura.")
      .optional(),
  ),
});

export type DadosComunicado = z.infer<typeof comunicadoSchema>;
