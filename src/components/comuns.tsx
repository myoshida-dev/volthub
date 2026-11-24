import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Rotulo } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

/** Badge colorido a partir de um mapa de `lib/rotulos.ts`. */
export function BadgeRotulo({ rotulo, classe, className }: Rotulo & { className?: string }) {
  return (
    <Badge variant="outline" className={cn(classe, className)}>
      {rotulo}
    </Badge>
  );
}

export function EstadoVazio({
  icone: Icone = Inbox,
  titulo,
  descricao,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icone className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{titulo}</p>
        {descricao && <p className="max-w-sm text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}

/** Monta uma URL mantendo os parâmetros atuais e trocando alguns. */
export function urlCom(
  base: string,
  atuais: Record<string, string | undefined>,
  novos: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atuais, ...novos })) {
    if (valor !== undefined && valor !== "") params.set(chave, String(valor));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Abas que são links (estado na URL, funcionam sem JavaScript). */
export function AbasLink({
  abas,
  atual,
}: {
  abas: { valor: string; rotulo: string; href: string; contador?: number }[];
  atual: string;
}) {
  return (
    <nav className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1" aria-label="Filtro">
      {abas.map((aba) => {
        const ativa = aba.valor === atual;
        return (
          <Link
            key={aba.valor}
            href={aba.href}
            aria-current={ativa ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              ativa
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {aba.rotulo}
            {aba.contador !== undefined && aba.contador > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  ativa ? "bg-destaque text-destaque-foreground" : "bg-background",
                )}
              >
                {aba.contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Paginacao({
  pagina,
  totalPaginas,
  base,
  params,
}: {
  pagina: number;
  totalPaginas: number;
  base: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
      <span>
        Página {pagina} de {totalPaginas}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          {pagina <= 1 ? (
            <span aria-disabled className="pointer-events-none opacity-50">
              <ChevronLeft /> Anterior
            </span>
          ) : (
            <Link href={urlCom(base, params, { pagina: pagina - 1 })}>
              <ChevronLeft /> Anterior
            </Link>
          )}
        </Button>
        <Button variant="outline" size="sm" asChild>
          {pagina >= totalPaginas ? (
            <span aria-disabled className="pointer-events-none opacity-50">
              Próxima <ChevronRight />
            </span>
          ) : (
            <Link href={urlCom(base, params, { pagina: pagina + 1 })}>
              Próxima <ChevronRight />
            </Link>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Lê ?pagina= com segurança. */
export function lerPagina(valor: string | undefined) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Bloco "rótulo: valor" usado em páginas de detalhe. */
export function ItemDetalhe({
  rotulo,
  children,
  className,
}: {
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  );
}
