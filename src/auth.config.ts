import type { NextAuthConfig } from "next-auth";

const DEZ_HORAS = 10 * 60 * 60;
const TRINTA_DIAS = 30 * 24 * 60 * 60;

/**
 * Configuração "leve" do Auth.js: sem Prisma nem bcrypt.
 * É usada pelo `proxy.ts`, que só precisa ler o token JWT. O provider de
 * credenciais (que consulta o banco) fica em `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Teto do cookie. A validade real de cada sessão fica em `token.expiraEm`.
    maxAge: TRINTA_DIAS,
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` só existe no momento do login: copiamos os dados de acesso para o token.
      if (user) {
        token.id = user.id!;
        token.perfil = user.perfil;
        token.equipe = user.equipe;
        token.unidadeId = user.unidadeId;
        token.setorId = user.setorId;
        // "Manter conectado": 30 dias; caso contrário, um dia de trabalho (10 h).
        token.expiraEm = Date.now() + (user.manterConectado ? TRINTA_DIAS : DEZ_HORAS) * 1000;
      }
      // Sessão vencida: retornar null encerra a sessão.
      if (token.expiraEm && Date.now() > token.expiraEm) return null;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.perfil = token.perfil;
      session.user.equipe = token.equipe;
      session.user.unidadeId = token.unidadeId;
      session.user.setorId = token.setorId;
      return session;
    },
  },
} satisfies NextAuthConfig;
