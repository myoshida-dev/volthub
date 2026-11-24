import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { podeAcessarRota } from "@/lib/permissions";

const { auth } = NextAuth(authConfig);

/**
 * Proteção de rotas (Next.js 16+: `proxy.ts`, antigo `middleware.ts`).
 * - Sem sessão → /login?callbackUrl=...
 * - Logado tentando abrir /login → início
 * - Sem permissão para a rota → /acesso-negado
 */
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const usuario = req.auth?.user;

  if (pathname === "/login") {
    return usuario ? NextResponse.redirect(new URL("/", req.nextUrl)) : NextResponse.next();
  }

  if (!usuario) {
    const login = new URL("/login", req.nextUrl);
    if (pathname !== "/") login.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(login);
  }

  if (!podeAcessarRota(pathname, usuario)) {
    return NextResponse.redirect(new URL("/acesso-negado", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Ignora API, arquivos estáticos e imagens.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
