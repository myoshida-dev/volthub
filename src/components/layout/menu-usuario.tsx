"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Bell, LogOut, Settings, UserRound } from "lucide-react";

import type { UsuarioShell } from "@/components/layout/tipos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sair } from "@/features/auth/actions";
import { descreverAcesso, pode } from "@/lib/permissions";
import { iniciais } from "@/lib/utils";

export function MenuUsuario({ usuario }: { usuario: UsuarioShell }) {
  const [saindo, iniciarSaida] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30"
        aria-label={`Menu de ${usuario.nome}`}
      >
        <Avatar className="size-9">
          {usuario.imagem && <AvatarImage src={usuario.imagem} alt="" />}
          <AvatarFallback className="text-[13px] font-bold">{iniciais(usuario.nome)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1.5 py-2">
          <p className="truncate text-sm font-semibold">{usuario.nome}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {usuario.cargo} · {usuario.unidade}
          </p>
          <Badge variant="destaque">{descreverAcesso(usuario)}</Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <UserRound /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/notificacoes">
            <Bell /> Notificações
          </Link>
        </DropdownMenuItem>
        {pode(usuario, "usuario:gerenciar") && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Settings /> Administração
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={saindo}
          onSelect={() => iniciarSaida(() => sair())}
        >
          <LogOut />
          {saindo ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
