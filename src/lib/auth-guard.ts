import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { pode, type Permissao } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/**
 * Retorna o usuário logado ou redireciona para o login.
 *
 * Além do token, confere no banco se o usuário ainda existe e está ativo:
 * quem foi desativado perde o acesso na hora, sem esperar o JWT expirar.
 * O `cache` do React evita repetir a consulta no layout e na página.
 */
export const exigirSessao = cache(async () => {
  const sessao = await auth();
  if (!sessao?.user) redirect("/login");

  const usuario = await prisma.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { ativo: true },
  });
  if (!usuario?.ativo) redirect("/sair");

  return sessao.user;
});

/**
 * Garante que o usuário logado tem a permissão. Use no topo de páginas e
 * server actions restritas: o `proxy.ts` sozinho não basta, porque as
 * server actions podem ser chamadas diretamente.
 */
export async function exigirPermissao(permissao: Permissao) {
  const usuario = await exigirSessao();
  if (!pode(usuario, permissao)) redirect("/acesso-negado");
  return usuario;
}
