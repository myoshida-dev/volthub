import { Equipe, Perfil, TipoRecurso } from "@prisma/client";
import { z } from "zod";

import { checkbox, dataDoInput, textoOpcional, vazioParaUndefined } from "@/lib/formularios";

const inteiroOpcional = (min: number, max: number, mensagem: string) =>
  z.preprocess(vazioParaUndefined, z.coerce.number().int(mensagem).min(min, mensagem).max(max, mensagem).optional());

export const usuarioSchema = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo.").max(100),
    email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
    login: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{3,40}$/, "Use letras minúsculas, números, ponto ou hífen (3 a 40)."),
    cargo: z.string().trim().min(2, "Informe o cargo.").max(80),
    perfil: z.enum(Perfil),
    equipe: z.preprocess(vazioParaUndefined, z.enum(Equipe).optional()),
    unidadeId: z.string().min(1, "Escolha a unidade."),
    setorId: z.string().min(1, "Escolha o setor."),
    gestorId: z.preprocess(vazioParaUndefined, z.string().optional()),
    telefone: textoOpcional(20),
    ramal: z.preprocess(vazioParaUndefined, z.string().trim().regex(/^\d{3,5}$/, "Ramal de 3 a 5 dígitos.").optional()),
    dataAdmissao: dataDoInput("Informe a data de admissão."),
    dataNascimento: z.preprocess(vazioParaUndefined, dataDoInput().optional()),
    ativo: checkbox,
  })
  .refine((d) => d.perfil !== "EQUIPE" || Boolean(d.equipe), {
    path: ["equipe"],
    message: "Perfil Equipe exige escolher RH ou TI.",
  });

export const recursoSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome.").max(80),
    tipo: z.enum(TipoRecurso),
    unidadeId: z.string().min(1, "Escolha a unidade."),
    descricao: textoOpcional(300),
    capacidade: inteiroOpcional(1, 500, "Capacidade inválida."),
    localizacao: textoOpcional(100),
    placa: z.preprocess(
      vazioParaUndefined,
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/, "Placa inválida (ex.: ABC1D23).")
        .optional(),
    ),
    modelo: textoOpcional(80),
    kmAtual: inteiroOpcional(0, 2_000_000, "Quilometragem inválida."),
    ativo: checkbox,
  })
  .refine((d) => d.tipo !== "VEICULO" || Boolean(d.placa), { path: ["placa"], message: "Veículos precisam de placa." })
  .refine((d) => d.tipo !== "SALA" || Boolean(d.capacidade), { path: ["capacidade"], message: "Informe a capacidade da sala." });

export const unidadeSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome.").max(80),
  cidade: z.string().trim().min(2, "Informe a cidade.").max(80),
  uf: z.string().trim().toUpperCase().length(2, "UF com 2 letras."),
  endereco: textoOpcional(200),
  telefone: textoOpcional(20),
});

const valorEmReais = (mensagem: string) =>
  z.coerce.number({ error: mensagem }).int("Use um valor inteiro em reais.").min(0, mensagem).max(10_000_000_000, mensagem);

export const metaSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título.").max(60),
  mes: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Escolha o mês.")
    .transform((s) => new Date(`${s}-01T00:00:00.000Z`)),
  setorId: z.preprocess(vazioParaUndefined, z.string().optional()),
  valorMeta: valorEmReais("Informe a meta.").refine((v) => v > 0, "A meta deve ser maior que zero."),
  valorRealizado: valorEmReais("Informe o realizado."),
});

export const ramalSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(40),
  numero: z.string().trim().regex(/^\d{3,6}$/, "Ramal de 3 a 6 dígitos."),
  ordem: z.coerce.number().int().min(0).max(99).default(0),
  unidadeId: z.preprocess(vazioParaUndefined, z.string().optional()),
});

export const setorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  sigla: z.string().trim().toUpperCase().min(2, "Sigla de 2 a 5 letras.").max(5, "Sigla de 2 a 5 letras."),
});
