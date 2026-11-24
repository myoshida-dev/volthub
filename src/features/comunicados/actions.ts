"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { comunicadoSchema } from "@/features/comunicados/schemas";
import { filtroPublicoAlvo, podeEditarComunicado } from "@/features/comunicados/consultas";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirPermissao, exigirSessao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, listaDoForm, type EstadoFormulario } from "@/lib/formularios";
import { notificar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";

function lerPublicoAlvo(formData: FormData) {
  return { unidadeIds: listaDoForm(formData, "unidades"), setorIds: listaDoForm(formData, "setores") };
}

export async function criarComunicado(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const autor = await exigirPermissao("comunicado:publicar");
  const dados = comunicadoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const { unidadeIds, setorIds } = lerPublicoAlvo(formData);

  const comunicado = await prisma.comunicado.create({
    data: {
      ...dados.data,
      autorId: autor.id,
      unidades: { connect: unidadeIds.map((id) => ({ id })) },
      setores: { connect: setorIds.map((id) => ({ id })) },
    },
  });

  const publico = await prisma.usuario.findMany({
    where: filtroPublicoAlvo(unidadeIds, setorIds),
    select: { id: true },
  });
  await notificar(
    publico.map((u) => u.id),
    {
      tipo: "COMUNICADO",
      titulo: dados.data.fixado ? "📌 Novo comunicado importante" : "Novo comunicado",
      mensagem: dados.data.titulo,
      link: `/comunicados/${comunicado.id}`,
    },
    autor.id,
  );
  await registrarAuditoria({
    usuarioId: autor.id,
    acao: "COMUNICADO_PUBLICADO",
    entidade: "Comunicado",
    entidadeId: comunicado.id,
    dados: { titulo: comunicado.titulo, unidades: unidadeIds.length, setores: setorIds.length },
  });

  revalidatePath("/comunicados");
  redirect(`/comunicados/${comunicado.id}`);
}

export async function atualizarComunicado(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const existente = await prisma.comunicado.findUnique({ where: { id }, select: { autorId: true } });
  if (!existente || !podeEditarComunicado(usuario, existente)) {
    return { erro: "Você não pode editar este comunicado." };
  }

  const dados = comunicadoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const { unidadeIds, setorIds } = lerPublicoAlvo(formData);

  await prisma.comunicado.update({
    where: { id },
    data: {
      ...dados.data,
      expiraEm: dados.data.expiraEm ?? null,
      unidades: { set: unidadeIds.map((uid) => ({ id: uid })) },
      setores: { set: setorIds.map((sid) => ({ id: sid })) },
    },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "COMUNICADO_EDITADO",
    entidade: "Comunicado",
    entidadeId: id,
  });

  revalidatePath("/comunicados");
  redirect(`/comunicados/${id}`);
}

export async function excluirComunicado(id: string) {
  const usuario = await exigirSessao();
  const existente = await prisma.comunicado.findUnique({
    where: { id },
    select: { autorId: true, titulo: true },
  });
  if (!existente || !podeEditarComunicado(usuario, existente)) return;

  await prisma.comunicado.delete({ where: { id } });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "COMUNICADO_EXCLUIDO",
    entidade: "Comunicado",
    entidadeId: id,
    dados: { titulo: existente.titulo },
  });

  revalidatePath("/comunicados");
  redirect("/comunicados");
}

export async function alternarFixado(id: string) {
  const usuario = await exigirSessao();
  const existente = await prisma.comunicado.findUnique({
    where: { id },
    select: { autorId: true, fixado: true },
  });
  if (!existente || !podeEditarComunicado(usuario, existente)) return;

  await prisma.comunicado.update({ where: { id }, data: { fixado: !existente.fixado } });
  revalidatePath("/comunicados");
  revalidatePath(`/comunicados/${id}`);
}

/** "Estou ciente": idempotente (upsert pela chave única). */
export async function marcarCiente(id: string) {
  const usuario = await exigirSessao();
  await prisma.leituraComunicado.upsert({
    where: { comunicadoId_usuarioId: { comunicadoId: id, usuarioId: usuario.id } },
    create: { comunicadoId: id, usuarioId: usuario.id },
    update: {},
  });
  revalidatePath("/comunicados");
  revalidatePath(`/comunicados/${id}`);
  revalidatePath("/");
}
