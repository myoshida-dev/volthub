import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Acesso negado" };

export default function PaginaAcessoNegado() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destaque/15 text-primary">
        <ShieldAlert className="size-8" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-primary">Acesso negado</h1>
        <p className="max-w-md text-muted-foreground">
          Seu perfil não tem permissão para acessar esta página. Se acha que isso é um engano, fale
          com a equipe de TI.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
