import { z } from "zod";

import { dataDoInput, textoOpcional } from "@/lib/formularios";
import { diasEntre, hojeISO } from "@/lib/utils";

/** Campos que podem ser corrigidos por "Atualização de dados". */
export const CAMPOS_ATUALIZACAO = {
  TELEFONE: "Telefone celular",
  ENDERECO: "Endereço residencial",
  ESTADO_CIVIL: "Estado civil",
  DADOS_BANCARIOS: "Dados bancários",
  CONTATO_EMERGENCIA: "Contato de emergência",
  OUTRO: "Outro",
} as const;

export type CampoAtualizacao = keyof typeof CAMPOS_ATUALIZACAO;

const periodo = {
  dataInicio: dataDoInput("Informe a data inicial."),
  dataFim: dataDoInput("Informe a data final."),
  motivo: textoOpcional(1000),
};

export const LIMITES = {
  feriasMin: 5,
  feriasMax: 30,
  folgaMax: 3,
  atestadoMax: 15,
};

export const solicitacaoSchema = z
  .discriminatedUnion("tipo", [
    z.object({ tipo: z.literal("FERIAS"), ...periodo }),
    z.object({ tipo: z.literal("FOLGA"), ...periodo }),
    z.object({ tipo: z.literal("ATESTADO"), ...periodo }),
    z.object({
      tipo: z.literal("ATUALIZACAO_DADOS"),
      campo: z.enum(Object.keys(CAMPOS_ATUALIZACAO) as [CampoAtualizacao, ...CampoAtualizacao[]], {
        error: "Escolha o dado a atualizar.",
      }),
      valor: z
        .string()
        .trim()
        .min(3, "Informe o novo valor.")
        .max(300, "Use no máximo 300 caracteres."),
      motivo: textoOpcional(1000),
    }),
  ])
  .superRefine((d, ctx) => {
    if (d.tipo === "ATUALIZACAO_DADOS") return;

    if (d.dataFim < d.dataInicio) {
      ctx.addIssue({ code: "custom", path: ["dataFim"], message: "A data final não pode ser antes da inicial." });
      return;
    }
    const dias = diasEntre(d.dataInicio, d.dataFim);
    const hoje = new Date(`${hojeISO()}T00:00:00.000Z`);

    if (d.tipo === "FERIAS") {
      if (d.dataInicio <= hoje)
        ctx.addIssue({ code: "custom", path: ["dataInicio"], message: "As férias devem começar em uma data futura." });
      if (dias < LIMITES.feriasMin)
        ctx.addIssue({ code: "custom", path: ["dataFim"], message: `Cada período de férias deve ter pelo menos ${LIMITES.feriasMin} dias.` });
      if (dias > LIMITES.feriasMax)
        ctx.addIssue({ code: "custom", path: ["dataFim"], message: `O período máximo é de ${LIMITES.feriasMax} dias.` });
    }
    if (d.tipo === "FOLGA" && dias > LIMITES.folgaMax) {
      ctx.addIssue({ code: "custom", path: ["dataFim"], message: `Folgas podem ter no máximo ${LIMITES.folgaMax} dias.` });
    }
    if (d.tipo === "ATESTADO" && dias > LIMITES.atestadoMax) {
      ctx.addIssue({
        code: "custom",
        path: ["dataFim"],
        message: `Afastamentos acima de ${LIMITES.atestadoMax} dias são encaminhados ao INSS: fale com o RH.`,
      });
    }
  });

export const decisaoSchema = z
  .object({
    decisao: z.enum(["APROVADA", "REPROVADA"], { error: "Escolha aprovar ou reprovar." }),
    observacao: textoOpcional(1000),
  })
  .refine((d) => d.decisao === "APROVADA" || Boolean(d.observacao), {
    path: ["observacao"],
    message: "Explique o motivo da reprovação.",
  });
