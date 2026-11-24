import { z } from "zod";

import { checkbox } from "@/lib/formularios";

/** Login por usuário de rede, matrícula ou e-mail corporativo. */
export const loginSchema = z.object({
  identificador: z
    .string({ error: "Informe seu usuário ou matrícula." })
    .trim()
    .toLowerCase()
    .min(3, "Informe seu usuário ou matrícula."),
  senha: z.string({ error: "Informe sua senha." }).min(1, "Informe sua senha."),
  manter: checkbox.optional().default(false),
});

export type DadosLogin = z.infer<typeof loginSchema>;
