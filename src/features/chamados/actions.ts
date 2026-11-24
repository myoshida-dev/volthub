"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { atendimentoSchema, comentarioSchema, novoChamadoSchema } from "@/features/chamados/schemas";
import { registrarAuditoria } from "@/lib/auditoria";
import { exigirPermissao, exigirSessao } from "@/lib/auth-guard";
import { dadosDoForm, falhaValidacao, type EstadoFormulario } from "@/lib/formularios";
import { idsDaEquipe, notificar } from "@/lib/notificacoes";
import { ehDaEquipe } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PRIORIDADE_CHAMADO, STATUS_CHAMADO } from "@/lib/rotulos";
import { arquivoDoForm, ErroUpload, salvarArquivo, TIPOS_ARQUIVO } from "@/lib/uploads";
import { numeroChamado } from "@/lib/utils";

async function salvarAnexoOpcional(formData: FormData) {
  const arquivo = arquivoDoForm(formData.get("anexo"));
  if (!arquivo) return null;
  return salvarArquivo(arquivo, "chamados", { tipos: TIPOS_ARQUIVO.anexos, tamanhoMaxMb: 5 });
}

function revalidarChamado(id: string) {
  revalidatePath(`/chamados/${id}`);
  revalidatePath("/chamados");
  revalidatePath("/chamados/fila");
}

export async function abrirChamado(
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const dados = novoChamadoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  let anexo;
  try {
    anexo = await salvarAnexoOpcional(formData);
  } catch (erro) {
    if (erro instanceof ErroUpload) return { erro: erro.message, erros: { anexo: [erro.message] } };
    throw erro;
  }

  const chamado = await prisma.chamado.create({
    data: {
      ...dados.data,
      solicitanteId: usuario.id,
      anexoUrl: anexo?.url,
      anexoNome: anexo?.nome,
    },
  });

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "CHAMADO_ABERTO",
    entidade: "Chamado",
    entidadeId: chamado.id,
    dados: { numero: chamado.numero, prioridade: chamado.prioridade },
  });
  await notificar(
    await idsDaEquipe("TI"),
    {
      tipo: "CHAMADO",
      titulo: `Novo chamado ${numeroChamado(chamado.numero)} · ${PRIORIDADE_CHAMADO[chamado.prioridade].rotulo}`,
      mensagem: chamado.titulo,
      link: `/chamados/${chamado.id}`,
    },
    usuario.id,
  );

  revalidatePath("/chamados", "layout");
  redirect(`/chamados/${chamado.id}`);
}

export async function comentarChamado(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  const chamado = await prisma.chamado.findUnique({ where: { id } });
  const ehTi = ehDaEquipe(usuario, "TI");
  if (!chamado || (chamado.solicitanteId !== usuario.id && !ehTi)) {
    return { erro: "Você não pode comentar neste chamado." };
  }
  if (chamado.status === "FECHADO") return { erro: "Este chamado está fechado. Abra um novo se precisar." };

  const dados = comentarioSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);
  const interno = ehTi && dados.data.interno;

  let anexo;
  try {
    anexo = await salvarAnexoOpcional(formData);
  } catch (erro) {
    if (erro instanceof ErroUpload) return { erro: erro.message, erros: { anexo: [erro.message] } };
    throw erro;
  }

  await prisma.comentarioChamado.create({
    data: {
      chamadoId: id,
      autorId: usuario.id,
      conteudo: dados.data.conteudo,
      interno,
      anexoUrl: anexo?.url,
      anexoNome: anexo?.nome,
    },
  });

  // O usuário respondeu: o chamado volta para a TI.
  if (!ehTi && chamado.status === "AGUARDANDO_USUARIO") {
    await prisma.chamado.update({ where: { id }, data: { status: "EM_ANDAMENTO" } });
  }

  if (!interno) {
    const destinatarios = usuario.id === chamado.solicitanteId
      ? chamado.responsavelId ? [chamado.responsavelId] : await idsDaEquipe("TI")
      : [chamado.solicitanteId];
    await notificar(
      destinatarios,
      {
        tipo: "CHAMADO",
        titulo: `Nova mensagem no chamado ${numeroChamado(chamado.numero)}`,
        mensagem: dados.data.conteudo.slice(0, 140),
        link: `/chamados/${id}`,
      },
      usuario.id,
    );
  }

  revalidarChamado(id);
  return { ok: true, mensagem: interno ? "Nota interna adicionada." : "Mensagem enviada." };
}

export async function atualizarAtendimento(
  id: string,
  _estado: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const usuario = await exigirPermissao("chamado:atender");
  const dados = atendimentoSchema.safeParse(dadosDoForm(formData));
  if (!dados.success) return falhaValidacao(dados.error);

  const chamado = await prisma.chamado.findUnique({ where: { id } });
  if (!chamado) return { erro: "Chamado não encontrado." };

  const { status, prioridade } = dados.data;
  const responsavelId = dados.data.responsavelId ?? null;
  if (responsavelId) {
    const responsavel = await prisma.usuario.findFirst({ where: { id: responsavelId, equipe: "TI", ativo: true } });
    if (!responsavel) return { erro: "Responsável inválido.", erros: { responsavelId: ["Escolha alguém da TI."] } };
  }

  await prisma.chamado.update({
    where: { id },
    data: {
      status,
      prioridade,
      responsavelId,
      resolvidoEm: status === "RESOLVIDO" || status === "FECHADO" ? (chamado.resolvidoEm ?? new Date()) : null,
    },
  });

  const mudancas: Record<string, { de: string | null; para: string | null }> = {};
  if (status !== chamado.status) mudancas.status = { de: chamado.status, para: status };
  if (prioridade !== chamado.prioridade) mudancas.prioridade = { de: chamado.prioridade, para: prioridade };
  if (responsavelId !== chamado.responsavelId) mudancas.responsavel = { de: chamado.responsavelId, para: responsavelId };
  if (Object.keys(mudancas).length === 0) return { ok: true, mensagem: "Nada mudou." };

  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "CHAMADO_ATUALIZADO",
    entidade: "Chamado",
    entidadeId: id,
    dados: mudancas,
  });

  if (mudancas.status) {
    await notificar(
      [chamado.solicitanteId],
      {
        tipo: "CHAMADO",
        titulo: `Chamado ${numeroChamado(chamado.numero)}: ${STATUS_CHAMADO[status].rotulo}`,
        mensagem:
          status === "RESOLVIDO"
            ? "A TI marcou seu chamado como resolvido. Confirme a solução ou reabra."
            : status === "AGUARDANDO_USUARIO"
              ? "A TI precisa de uma resposta sua para continuar."
              : chamado.titulo,
        link: `/chamados/${id}`,
      },
      usuario.id,
    );
  }
  if (mudancas.responsavel && responsavelId) {
    await notificar(
      [responsavelId],
      {
        tipo: "CHAMADO",
        titulo: `Chamado ${numeroChamado(chamado.numero)} atribuído a você`,
        mensagem: chamado.titulo,
        link: `/chamados/${id}`,
      },
      usuario.id,
    );
  }

  revalidarChamado(id);
  return { ok: true, mensagem: "Chamado atualizado." };
}

export async function assumirChamado(id: string) {
  const usuario = await exigirPermissao("chamado:atender");
  const chamado = await prisma.chamado.findUnique({ where: { id } });
  if (!chamado) return;

  await prisma.chamado.update({
    where: { id },
    data: {
      responsavelId: usuario.id,
      status: chamado.status === "ABERTO" ? "EM_ANDAMENTO" : chamado.status,
    },
  });
  await registrarAuditoria({
    usuarioId: usuario.id,
    acao: "CHAMADO_ASSUMIDO",
    entidade: "Chamado",
    entidadeId: id,
  });
  await notificar([chamado.solicitanteId], {
    tipo: "CHAMADO",
    titulo: `Chamado ${numeroChamado(chamado.numero)} em atendimento`,
    mensagem: `${usuario.name} está cuidando do seu chamado.`,
    link: `/chamados/${id}`,
  });

  revalidarChamado(id);
}

/** Solicitante confirma que o problema foi resolvido. */
export async function confirmarSolucao(id: string) {
  const usuario = await exigirSessao();
  const resultado = await prisma.chamado.updateMany({
    where: { id, solicitanteId: usuario.id, status: "RESOLVIDO" },
    data: { status: "FECHADO" },
  });
  if (resultado.count === 0) return;

  await registrarAuditoria({ usuarioId: usuario.id, acao: "CHAMADO_FECHADO", entidade: "Chamado", entidadeId: id });
  revalidarChamado(id);
}

/** Solicitante informa que o problema continua. */
export async function reabrirChamado(id: string) {
  const usuario = await exigirSessao();
  const chamado = await prisma.chamado.findFirst({
    where: { id, solicitanteId: usuario.id, status: "RESOLVIDO" },
  });
  if (!chamado) return;

  await prisma.chamado.update({ where: { id }, data: { status: "EM_ANDAMENTO", resolvidoEm: null } });
  await registrarAuditoria({ usuarioId: usuario.id, acao: "CHAMADO_REABERTO", entidade: "Chamado", entidadeId: id });
  await notificar(
    chamado.responsavelId ? [chamado.responsavelId] : await idsDaEquipe("TI"),
    {
      tipo: "CHAMADO",
      titulo: `Chamado ${numeroChamado(chamado.numero)} reaberto`,
      mensagem: "O usuário informou que o problema continua.",
      link: `/chamados/${id}`,
    },
    usuario.id,
  );
  revalidarChamado(id);
}
