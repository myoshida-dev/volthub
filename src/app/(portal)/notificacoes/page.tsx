import type { Metadata } from "next";
import { BellOff, CheckCheck } from "lucide-react";

import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { marcarTodasComoLidas } from "@/features/notificacoes/actions";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { cn, formatarDataHora, tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notificações" };

const POR_PAGINA = 20;

export default async function PaginaNotificacoes({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const usuario = await exigirSessao();
  const pagina = lerPagina((await searchParams).pagina);

  const [notificacoes, total, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({
      where: { usuarioId: usuario.id },
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.notificacao.count({ where: { usuarioId: usuario.id } }),
    prisma.notificacao.count({ where: { usuarioId: usuario.id, lida: false } }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Notificações"
        descricao={naoLidas > 0 ? `Você tem ${naoLidas} notificação(ões) não lida(s).` : "Tudo em dia por aqui."}
        acoes={
          naoLidas > 0 && (
            <form action={marcarTodasComoLidas}>
              <Button variant="outline" type="submit">
                <CheckCheck /> Marcar todas como lidas
              </Button>
            </form>
          )
        }
      />

      {notificacoes.length === 0 ? (
        <EstadoVazio icone={BellOff} titulo="Nenhuma notificação" descricao="Quando algo acontecer com seus pedidos, chamados ou reservas, você verá aqui." />
      ) : (
        <Card className="gap-0 divide-y py-0">
          {notificacoes.map((n) => (
            <a
              key={n.id}
              href={`/notificacoes/${n.id}`}
              className={cn(
                "flex items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/40",
                !n.lida && "bg-destaque/5",
              )}
            >
              <span
                className={cn("mt-2 size-2 shrink-0 rounded-full", n.lida ? "bg-border" : "bg-destaque")}
                aria-label={n.lida ? "Lida" : "Não lida"}
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className={cn("text-sm", !n.lida && "font-semibold")}>{n.titulo}</p>
                <p className="text-sm text-muted-foreground">{n.mensagem}</p>
              </div>
              <time
                dateTime={n.criadoEm.toISOString()}
                title={formatarDataHora(n.criadoEm)}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {tempoRelativo(n.criadoEm)}
              </time>
            </a>
          ))}
        </Card>
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/notificacoes"
        params={{}}
      />
    </>
  );
}
