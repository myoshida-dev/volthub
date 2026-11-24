import "server-only";

import type { Perfil, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type Leitor = { id: string; perfil: Perfil; unidadeId: string; setorId: string };

/**
 * Comunicados que o usuário pode ver: os que têm a unidade E o setor dele no
 * público-alvo (lista vazia = todos) e ainda não expiraram. O autor sempre vê
 * os próprios, e o ADMIN vê tudo.
 */
export function filtroVisiveis(usuario: Leitor): Prisma.ComunicadoWhereInput {
  if (usuario.perfil === "ADMIN") return {};
  return {
    OR: [
      { autorId: usuario.id },
      {
        AND: [
          { OR: [{ unidades: { none: {} } }, { unidades: { some: { id: usuario.unidadeId } } }] },
          { OR: [{ setores: { none: {} } }, { setores: { some: { id: usuario.setorId } } }] },
          { OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }] },
        ],
      },
    ],
  };
}

/** Filtro de usuários que fazem parte do público-alvo de um comunicado. */
export function filtroPublicoAlvo(unidadeIds: string[], setorIds: string[]): Prisma.UsuarioWhereInput {
  return {
    ativo: true,
    ...(unidadeIds.length > 0 && { unidadeId: { in: unidadeIds } }),
    ...(setorIds.length > 0 && { setorId: { in: setorIds } }),
  };
}

export function podeEditarComunicado(
  usuario: { id: string; perfil: Perfil },
  comunicado: { autorId: string },
) {
  return usuario.perfil === "ADMIN" || comunicado.autorId === usuario.id;
}

/** Unidades e setores para os checkboxes de público-alvo. */
export async function opcoesPublicoAlvo() {
  const [unidades, setores] = await Promise.all([
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return { unidades, setores };
}
