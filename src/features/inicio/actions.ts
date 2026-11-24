"use server";

import { exigirSessao } from "@/lib/auth-guard";
import type { EstadoFormulario } from "@/lib/formularios";
import { notificar } from "@/lib/notificacoes";
import { prisma } from "@/lib/prisma";
import { primeiroNome } from "@/lib/utils";

/** Envia os parabéns de aniversário (uma vez por dia para cada colega). */
export async function parabenizar(aniversarianteId: string): Promise<EstadoFormulario> {
  const usuario = await exigirSessao();
  if (aniversarianteId === usuario.id) return { erro: "Não dá para se parabenizar 😄" };

  const [aniversariante, autor] = await Promise.all([
    prisma.usuario.findFirst({ where: { id: aniversarianteId, ativo: true }, select: { nome: true } }),
    prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id }, select: { nome: true } }),
  ]);
  if (!aniversariante) return { erro: "Colaborador não encontrado." };

  const titulo = `🎉 ${autor.nome} te deu parabéns!`;
  const jaEnviou = await prisma.notificacao.findFirst({
    where: { usuarioId: aniversarianteId, titulo, criadoEm: { gte: new Date(Date.now() - 24 * 3_600_000) } },
    select: { id: true },
  });
  if (jaEnviou) return { ok: true, mensagem: `Você já parabenizou ${primeiroNome(aniversariante.nome)} hoje.` };

  await notificar([aniversarianteId], {
    tipo: "SISTEMA",
    titulo,
    mensagem: "Feliz aniversário! Um abraço de toda a equipe Volt.",
    link: `/diretorio/${usuario.id}`,
  });
  return { ok: true, mensagem: `Parabéns enviados para ${primeiroNome(aniversariante.nome)}!` };
}
