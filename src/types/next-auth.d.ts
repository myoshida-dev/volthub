import type { Equipe, Perfil } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Campos extras que o VoltHub guarda no usuário, no token JWT e na sessão.
 * O JWT é tipado em "@auth/core/jwt", módulo que o next-auth reexporta.
 */
declare module "next-auth" {
  interface User {
    perfil: Perfil;
    equipe: Equipe | null;
    unidadeId: string;
    setorId: string;
    /** Marcado no login ("Manter conectado neste computador"). */
    manterConectado?: boolean;
  }

  interface Session {
    user: {
      id: string;
      perfil: Perfil;
      equipe: Equipe | null;
      unidadeId: string;
      setorId: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    perfil: Perfil;
    equipe: Equipe | null;
    unidadeId: string;
    setorId: string;
    /** Instante (ms) em que esta sessão expira. */
    expiraEm?: number;
  }
}
