import "server-only";

import { prisma } from "@/lib/prisma";

/** Listas usadas nos selects do formulário de usuário. */
export async function opcoesFormularioUsuario(excluirId?: string) {
  const [unidades, setores, gestores] = await Promise.all([
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.usuario.findMany({
      where: { ativo: true, ...(excluirId && { id: { not: excluirId } }) },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, cargo: true },
    }),
  ]);
  return {
    unidades,
    setores,
    gestores: gestores.map((g) => ({ id: g.id, nome: `${g.nome} — ${g.cargo}` })),
  };
}
