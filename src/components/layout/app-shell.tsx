"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Search } from "lucide-react";

import { Logo } from "@/components/logo";
import { MenuNotificacoes } from "@/components/layout/menu-notificacoes";
import { MenuUsuario } from "@/components/layout/menu-usuario";
import { hrefAtivo, NAVEGACAO, SUBSECOES, type ItemSubsecao } from "@/components/layout/nav-config";
import type { NotificacaoShell, UsuarioShell } from "@/components/layout/tipos";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { pode } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AppShellProps = {
  usuario: UsuarioShell;
  notificacoes: NotificacaoShell[];
  naoLidas: number;
  children: React.ReactNode;
};

/** Teclas que não devem disparar o atalho "/" (o usuário está digitando). */
const ehCampoDeTexto = (alvo: EventTarget | null) =>
  alvo instanceof HTMLElement &&
  (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));

export function AppShell({ usuario, notificacoes, naoLidas, children }: AppShellProps) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const busca = useRef<HTMLInputElement>(null);

  const itens = NAVEGACAO.filter((item) => !item.permissao || pode(usuario, item.permissao));
  const ativo = hrefAtivo(pathname, itens.map((i) => i.href));

  // Atalho "/" foca a busca, como no GitHub e no Slack.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "/" && !ehCampoDeTexto(evento.target)) {
        evento.preventDefault();
        busca.current?.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);

  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-[60px] max-w-[1440px] items-center gap-4 px-4 md:px-8 lg:gap-8">
          <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>

          <Link href="/" aria-label="VoltHub — Meu dia" className="shrink-0">
            <Logo />
          </Link>

          <nav aria-label="Menu principal" className="hidden items-center gap-1 lg:flex">
            {itens.map(({ href, titulo }) => (
              <Link
                key={href}
                href={href}
                aria-current={href === ativo ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[15px] font-medium transition-colors xl:px-4",
                  href === ativo
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                {titulo}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <form action="/busca" role="search" className="relative hidden md:block">
              <input
                ref={busca}
                name="q"
                type="search"
                placeholder="Buscar"
                aria-label="Buscar pessoas, comunicados, documentos e chamados"
                className="h-9 w-48 rounded-lg border border-transparent bg-muted pr-9 pl-3 text-sm outline-none placeholder:text-muted-foreground focus:border-input focus:bg-card focus:ring-[3px] focus:ring-ring/20 xl:w-56 [&::-webkit-search-cancel-button]:hidden"
              />
              <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border bg-card px-1.5 font-mono text-[11px] text-muted-foreground">
                /
              </kbd>
            </form>
            <Button variant="ghost" size="icon" asChild className="md:hidden">
              <Link href="/busca" aria-label="Buscar"><Search className="size-5" /></Link>
            </Button>
            <MenuNotificacoes notificacoes={notificacoes} naoLidas={naoLidas} />
            <MenuUsuario usuario={usuario} />
          </div>
        </div>
      </header>

      {/* Celular/tablet: as abas viram uma gaveta, com as sub-seções embaixo de cada uma */}
      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-[60px] items-center border-b px-5">
            <Logo />
          </div>
          <nav aria-label="Menu principal" className="flex-1 space-y-1 overflow-y-auto p-3">
            {itens.map(({ href, titulo, icone: Icone }) => {
              const subsecoes = ((SUBSECOES[href as keyof typeof SUBSECOES] as ItemSubsecao[] | undefined) ?? []).filter(
                (s) => !s.permissao || pode(usuario, s.permissao),
              );
              return (
                <div key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuAberto(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium",
                      href === ativo ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    <Icone className="size-[18px]" />
                    {titulo}
                  </Link>
                  {subsecoes.length > 1 &&
                    subsecoes.slice(1).map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={() => setMenuAberto(false)}
                        className={cn(
                          "ml-9 block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                          pathname.startsWith(s.href) && "font-semibold text-foreground",
                        )}
                      >
                        {s.titulo}
                      </Link>
                    ))}
                </div>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-8 md:py-10">{children}</main>
    </div>
  );
}
