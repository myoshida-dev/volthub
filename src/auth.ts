import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { loginSchema } from "@/features/auth/schemas";
import { registrarAuditoria } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        identificador: { label: "Usuário ou matrícula", type: "text" },
        senha: { label: "Senha", type: "password" },
        manter: { label: "Manter conectado", type: "checkbox" },
      },
      async authorize(credenciais) {
        const dados = loginSchema.safeParse(credenciais);
        if (!dados.success) return null;
        const { identificador, senha, manter } = dados.data;

        // Aceita usuário de rede, matrícula ou e-mail.
        const usuario = await prisma.usuario.findFirst({
          where: { OR: [{ login: identificador }, { matricula: identificador }, { email: identificador }] },
        });
        if (!usuario || !usuario.ativo) return null;

        const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaConfere) return null;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { ultimoAcessoEm: new Date() },
        });
        await registrarAuditoria({
          usuarioId: usuario.id,
          acao: "LOGIN",
          entidade: "Usuario",
          entidadeId: usuario.id,
          dados: { manterConectado: manter },
        });

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          image: usuario.avatarUrl,
          perfil: usuario.perfil,
          equipe: usuario.equipe,
          unidadeId: usuario.unidadeId,
          setorId: usuario.setorId,
          manterConectado: manter,
        };
      },
    }),
  ],
});
