"use server";

import { CategoriaDocumento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { registrarAuditoria } from "@/lib/auditoria";
import { exigirPermissao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, textoOpcional, vazioParaUndefined, type EstadoFormulario } from "@/lib/formularios";
import { prisma } from "@/lib/prisma";
import { arquivoDoForm, ErroUpload, removerArquivo, salvarArquivo, TIPOS_ARQUIVO } from "@/lib/uploads";

const documentoSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título.").max(120, "Use no máximo 120 caracteres."),
  descricao: textoOpcional(500),
  categoria: z.enum(CategoriaDocumento, { error: "Escolha uma categoria." }),
  setorId: z.preprocess(vazioParaUndefined, z.string().optional()),
});

export async function enviarDocumento(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirPermissao("documento:gerenciar");
  const dados = documentoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  const arquivo = arquivoDoForm(formData.get("arquivo"));
  if (!arquivo) return { erro: "Escolha o arquivo.", erros: { arquivo: ["Escolha o arquivo."] } };

  let salvo;
  try {
    salvo = await salvarArquivo(arquivo, "documentos", { tipos: TIPOS_ARQUIVO.documentos, tamanhoMaxMb: 8 });
  } catch (erro) {
    if (erro instanceof ErroUpload) return { erro: erro.message, erros: { arquivo: [erro.message] } };
    throw erro;
  }

  const documento = await prisma.documento.create({
    data: {
      ...dados.data,
      autorId: usuario.id,
      arquivoUrl: salvo.url,
      arquivoNome: salvo.nome,
      mimeType: salvo.mimeType,
      tamanhoBytes: salvo.tamanhoBytes,
    },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "DOCUMENTO_ENVIADO",
    entidade: "Documento",
    entidadeId: documento.id,
    dados: { titulo: documento.titulo },
  });

  revalidatePath("/documentos");
  redirect("/documentos");
}

export async function excluirDocumento(id: string) {
  const usuario = await exigirPermissao("documento:gerenciar");
  const documento = await prisma.documento.findUnique({ where: { id } });
  if (!documento) return;

  await prisma.documento.delete({ where: { id } });
  await removerArquivo(documento.arquivoUrl);
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "DOCUMENTO_EXCLUIDO",
    entidade: "Documento",
    entidadeId: id,
    dados: { titulo: documento.titulo },
  });

  revalidatePath("/documentos");
}
