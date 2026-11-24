import { PrismaClient } from "@prisma/client";

/**
 * Instância única do Prisma Client.
 * Em desenvolvimento o hot reload recria módulos; guardar a instância no
 * `globalThis` evita abrir uma conexão nova a cada recarga.
 */
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalParaPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;
