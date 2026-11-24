"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { exigirSessao } from "@/lib/auth-guard";
import {
  dadosDoForm,
  falhaValidacao,
  vazioParaUndefined,
  type EstadoFormulario,
} from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { arquivoDoForm, ErroUpload, removerArquivo, salvarArquivo, TIPOS_ARQUIVO } from "@/lib/uploads";

const perfilSchema = z.object({
  ramal: z.preprocess(
    vazioParaUndefined,
    z
      .string()
      .trim()
      .regex(/^\d{3,5}$/, "O ramal deve ter de 3 a 5 dígitos.")
      .optional(),
  ),
});

export async function atualizarPerfil(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = perfilSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  const atual = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { avatarUrl: true },
  });

  let avatarUrl = atual.avatarUrl;
  const foto = arquivoDoForm(formData.get("foto"));
  try {
    if (foto) {
      const salvo = await salvarArquivo(foto, "avatares", {
        tipos: TIPOS_ARQUIVO.imagens,
        tamanhoMaxMb: 2,
      });
      await removerArquivo(atual.avatarUrl);
      avatarUrl = salvo.url;
    } else if (formData.get("removerFoto") === "on") {
      await removerArquivo(atual.avatarUrl);
      avatarUrl = null;
    }
  } catch (erro) {
    if (erro instanceof ErroUpload) return { erro: erro.message, erros: { foto: [erro.message] } };
    throw erro;
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ramal: dados.data.ramal ?? null, avatarUrl },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "PERFIL_ATUALIZADO",
    entidade: "Usuario",
    entidadeId: usuario.id,
  });

  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Perfil atualizado." };
}

const senhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe sua senha atual."),
    novaSenha: z
      .string()
      .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
      .regex(/[A-Za-z]/, "Use pelo menos uma letra.")
      .regex(/\d/, "Use pelo menos um número."),
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não conferem.",
  })
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    path: ["novaSenha"],
    message: "A nova senha deve ser diferente da atual.",
  });

export async function trocarSenha(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = senhaSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  const { senhaHash } = await prisma.usuario.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { senhaHash: true },
  });
  if (!(await bcrypt.compare(dados.data.senhaAtual, senhaHash))) {
    return { erro: "Senha atual incorreta.", erros: { senhaAtual: ["Senha atual incorreta."] } };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { senhaHash: await bcrypt.hash(dados.data.novaSenha, 10) },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "SENHA_ALTERADA",
    entidade: "Usuario",
    entidadeId: usuario.id,
  });

  return { ok: true, mensagem: "Senha alterada com sucesso." };
}
