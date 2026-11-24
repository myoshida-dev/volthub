"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { hrefAtivo, type ItemSubsecao } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

/** Sub-abas de uma seção (ex.: RH → Minhas solicitações · Aprovações · Gestão de RH). */
export function SubNav({ itens }: { itens: Omit<ItemSubsecao, "permissao">[] }) {
  const pathname = usePathname();
  const ativo = hrefAtivo(pathname, itens.map((i) => i.href));

  return (
    <nav aria-label="Seções" className="-mt-2 mb-8 overflow-x-auto overflow-y-hidden border-b">
      <ul className="flex min-w-max gap-6">
        {itens.map(({ href, titulo }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={href === ativo ? "page" : undefined}
              className={cn(
                "-mb-px block border-b-2 pb-3 text-sm font-medium transition-colors",
                href === ativo
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {titulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
