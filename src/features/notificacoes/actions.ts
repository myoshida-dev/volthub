"use server";

import { revalidatePath } from "next/cache";

import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function marcarTodasComoLidas() {
  const usuario = await exigirSessao();
  await prisma.notificacao.updateMany({
    where: { usuarioId: usuario.id, lida: false },
    data: { lida: true },
  });
  revalidatePath("/", "layout");
}
