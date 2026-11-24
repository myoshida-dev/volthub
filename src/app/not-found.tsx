import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <div className="space-y-1">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold">Página não encontrada</h1>
        <p className="text-muted-foreground">O endereço acessado não existe ou foi movido.</p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}
