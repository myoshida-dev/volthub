import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type EntradaAuditoria = {
  usuarioId?: string | null;
  acao: string;
  entidade: string;
  entidadeId?: string | null;
  dados?: Prisma.InputJsonValue;
};

/**
 * Registra uma ação na trilha de auditoria.
 * Falhas aqui não devem derrubar a operação principal: apenas são logadas.
 */
export async function registrarAuditoria(entrada: EntradaAuditoria) {
  try {
    await prisma.logAuditoria.create({ data: entrada });
  } catch (erro) {
    console.error("[auditoria] Falha ao registrar:", entrada.acao, erro);
  }
}
