import "server-only";

import type { Equipe, TipoNotificacao } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type DadosNotificacao = {
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  link?: string;
};

/**
 * Cria a mesma notificação para vários usuários.
 * Ignora ids vazios e repetidos, e nunca notifica quem fez a ação (`autorId`).
 */
export async function notificar(
  usuarioIds: (string | null | undefined)[],
  dados: DadosNotificacao,
  autorId?: string,
) {
  const ids = [...new Set(usuarioIds)].filter(
    (id): id is string => Boolean(id) && id !== autorId,
  );
  if (ids.length === 0) return;

  try {
    await prisma.notificacao.createMany({
      data: ids.map((usuarioId) => ({ usuarioId, ...dados })),
    });
  } catch (erro) {
    console.error("[notificacoes] Falha ao notificar:", dados.titulo, erro);
  }
}

/** Ids dos membros ativos de uma equipe (RH ou TI). */
export async function idsDaEquipe(equipe: Equipe) {
  const membros = await prisma.usuario.findMany({
    where: { equipe, ativo: true },
    select: { id: true },
  });
  return membros.map((m) => m.id);
}
