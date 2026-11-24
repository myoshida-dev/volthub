"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { loginSchema } from "@/features/auth/schemas";

export type EstadoLogin = { erro?: string };

/** Só aceita caminhos internos, para evitar open redirect via ?callbackUrl= */
function destinoSeguro(url: FormDataEntryValue | null) {
  if (typeof url === "string" && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/";
}

export async function entrar(_estado: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const dados = loginSchema.safeParse({
    identificador: formData.get("identificador"),
    senha: formData.get("senha"),
    manter: formData.get("manter"),
  });
  if (!dados.success) {
    return { erro: dados.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await signIn("credentials", {
      identificador: dados.data.identificador,
      senha: dados.data.senha,
      manter: String(dados.data.manter),
      redirectTo: destinoSeguro(formData.get("callbackUrl")),
    });
  } catch (erro) {
    if (erro instanceof AuthError) {
      return {
        erro:
          erro.type === "CredentialsSignin"
            ? "Usuário ou senha incorretos."
            : "Não foi possível entrar agora. Tente novamente.",
      };
    }
    // Em caso de sucesso, o signIn lança um redirect, que precisa ser propagado.
    throw erro;
  }

  return {};
}

export async function sair() {
  await signOut({ redirectTo: "/login" });
}
