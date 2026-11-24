"use client";

import Link from "next/link";
import { Bell, BellOff } from "lucide-react";

import type { NotificacaoShell } from "@/components/layout/tipos";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, tempoRelativo } from "@/lib/utils";

type MenuNotificacoesProps = {
  notificacoes: NotificacaoShell[];
  naoLidas: number;
};

export function MenuNotificacoes({ notificacoes, naoLidas }: MenuNotificacoesProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
        >
          <Bell className="size-5" />
          {naoLidas > 0 && (
            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destaque px-1 text-[10px] font-bold text-destaque-foreground ring-2 ring-card">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notificações
          {naoLidas > 0 && (
            <span className="text-xs font-normal text-muted-foreground">{naoLidas} não lidas</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notificacoes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
            <BellOff className="size-6" />
            Você está em dia. Nenhuma notificação.
          </div>
        ) : (
          notificacoes.map((n) => (
            <DropdownMenuItem key={n.id} asChild className="items-start">
              {/* <a> (não <Link>): navegação completa, para o contador do sino atualizar. */}
              <a href={`/notificacoes/${n.id}`}>
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.lida ? "bg-transparent" : "bg-destaque",
                  )}
                />
                <span className="min-w-0 space-y-0.5">
                  <span className={cn("block text-sm", !n.lida && "font-medium")}>{n.titulo}</span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground">
                    {n.mensagem}
                  </span>
                  <span className="block text-[11px] text-muted-foreground/80">
                    {tempoRelativo(n.criadoEm)}
                  </span>
                </span>
              </a>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm font-medium text-primary">
          <Link href="/notificacoes">Ver todas</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
