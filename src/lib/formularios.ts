import { z } from "zod";

/** Estado padrão retornado pelas server actions usadas com `useActionState`. */
export type EstadoFormulario = {
  ok?: boolean;
  mensagem?: string;
  erro?: string;
  erros?: Record<string, string[] | undefined>;
  /** Informação para exibir uma única vez (ex.: senha temporária gerada). */
  destaque?: string;
};

export const estadoInicial: EstadoFormulario = {};

export function falhaValidacao(erro: z.ZodError): EstadoFormulario {
  return {
    erro: "Revise os campos destacados.",
    erros: z.flattenError(erro).fieldErrors as Record<string, string[] | undefined>,
  };
}

/** Converte FormData em objeto simples (último valor de cada chave). */
export function dadosDoForm(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

/** Campos de texto vazios viram `undefined`, para funcionar com `.optional()`. */
export const vazioParaUndefined = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

export const textoOpcional = (max = 500) =>
  z.preprocess(vazioParaUndefined, z.string().trim().max(max).optional());

/** "AAAA-MM-DD" (input type="date") → Date em UTC, para colunas DATE. */
export const dataDoInput = (mensagem = "Informe uma data válida.") =>
  z
    .string({ error: mensagem })
    .regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)
    .transform((s) => new Date(`${s}T00:00:00.000Z`));

/** Checkbox HTML: presente = "on". */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

/** Lê todos os valores de um campo múltiplo (checkboxes com o mesmo name). */
export function listaDoForm(formData: FormData, nome: string) {
  return formData.getAll(nome).filter((v): v is string => typeof v === "string" && v !== "");
}
