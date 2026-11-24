import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Abre uma notificação: marca como lida e redireciona para o link dela.
 * Os links que apontam para cá são <a> comuns (sem prefetch), para não marcar antes do clique.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await auth();
  if (!sessao?.user) return NextResponse.redirect(new URL("/login", request.url));

  const { id } = await params;
  const notificacao = await prisma.notificacao.findFirst({
    where: { id, usuarioId: sessao.user.id },
    select: { id: true, link: true },
  });
  if (!notificacao) return NextResponse.redirect(new URL("/notificacoes", request.url));

  await prisma.notificacao.update({ where: { id: notificacao.id }, data: { lida: true } });

  const destino = notificacao.link?.startsWith("/") ? notificacao.link : "/notificacoes";
  return NextResponse.redirect(new URL(destino, request.url));
}
