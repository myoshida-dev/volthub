import Link from "next/link";
import { ChevronRight, MessageSquare } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { BadgeRotulo } from "@/components/comuns";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CATEGORIA_CHAMADO, PRIORIDADE_CHAMADO, STATUS_CHAMADO, STATUS_CHAMADO_TI } from "@/lib/rotulos";
import { numeroChamado, tempoRelativo } from "@/lib/utils";

export const incluirNaTabelaChamados = {
  solicitante: { select: { nome: true, unidade: { select: { nome: true } } } },
  responsavel: { select: { nome: true } },
  _count: { select: { comentarios: true } },
} satisfies Prisma.ChamadoInclude;

type LinhaChamado = Prisma.ChamadoGetPayload<{ include: typeof incluirNaTabelaChamados }>;

export function TabelaChamados({ chamados, visaoTi = false }: { chamados: LinhaChamado[]; visaoTi?: boolean }) {
  const rotulosStatus = visaoTi ? STATUS_CHAMADO_TI : STATUS_CHAMADO;
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Nº</TableHead>
            <TableHead>Chamado</TableHead>
            {visaoTi && <TableHead>Solicitante</TableHead>}
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>{visaoTi ? "Responsável" : "Atendente"}</TableHead>
            <TableHead>Atualizado</TableHead>
            <TableHead className="w-10"><span className="sr-only">Abrir</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chamados.map((c) => (
            <TableRow key={c.id} className="group relative">
              <TableCell className="font-mono text-xs text-muted-foreground">{numeroChamado(c.numero)}</TableCell>
              <TableCell className="max-w-80">
                <p className="truncate font-medium">{c.titulo}</p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {CATEGORIA_CHAMADO[c.categoria].rotulo}
                  {c._count.comentarios > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <MessageSquare className="size-3" /> {c._count.comentarios}
                    </span>
                  )}
                </p>
              </TableCell>
              {visaoTi && (
                <TableCell className="text-sm">
                  {c.solicitante.nome}
                  <span className="block text-xs text-muted-foreground">{c.solicitante.unidade.nome}</span>
                </TableCell>
              )}
              <TableCell><BadgeRotulo {...PRIORIDADE_CHAMADO[c.prioridade]} /></TableCell>
              <TableCell><BadgeRotulo {...rotulosStatus[c.status]} /></TableCell>
              <TableCell className="text-sm whitespace-nowrap">
                {c.responsavel?.nome ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{tempoRelativo(c.atualizadoEm)}</TableCell>
              <TableCell>
                <Link
                  href={`/chamados/${c.id}`}
                  className="text-muted-foreground after:absolute after:inset-0 group-hover:text-primary"
                  aria-label={`Abrir chamado ${numeroChamado(c.numero)}`}
                >
                  <ChevronRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
