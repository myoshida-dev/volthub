import Link from "next/link";
import { ChevronRight, Paperclip } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { BadgeRotulo } from "@/components/comuns";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CAMPOS_ATUALIZACAO, type CampoAtualizacao } from "@/features/solicitacoes/schemas";
import { STATUS_SOLICITACAO, TIPO_SOLICITACAO } from "@/lib/rotulos";
import { diasEntre, formatarData, formatarDataHora, plural } from "@/lib/utils";

export const incluirNaTabela = {
  solicitante: { select: { nome: true, cargo: true, unidade: { select: { nome: true } } } },
} satisfies Prisma.SolicitacaoInclude;

type LinhaSolicitacao = Prisma.SolicitacaoGetPayload<{ include: typeof incluirNaTabela }>;

/** "10/01/2027 a 19/01/2027 (10 dias)" ou "Telefone celular". */
export function descreverPedido(s: {
  dataInicio: Date | null;
  dataFim: Date | null;
  dados: Prisma.JsonValue;
}) {
  if (s.dataInicio && s.dataFim) {
    const dias = diasEntre(s.dataInicio, s.dataFim);
    return `${formatarData(s.dataInicio)} a ${formatarData(s.dataFim)} (${plural(dias, "dia", "dias")})`;
  }
  const campo = (s.dados as { campo?: CampoAtualizacao } | null)?.campo;
  return campo ? CAMPOS_ATUALIZACAO[campo] : "—";
}

export function TabelaSolicitacoes({
  solicitacoes,
  mostrarSolicitante = false,
}: {
  solicitacoes: LinhaSolicitacao[];
  mostrarSolicitante?: boolean;
}) {
  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow>
            {mostrarSolicitante && <TableHead>Colaborador</TableHead>}
            <TableHead>Tipo</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviada em</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Abrir</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {solicitacoes.map((s) => (
            <TableRow key={s.id} className="group relative">
              {mostrarSolicitante && (
                <TableCell>
                  <p className="font-medium">{s.solicitante.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.solicitante.cargo} · {s.solicitante.unidade.nome}
                  </p>
                </TableCell>
              )}
              <TableCell>
                <span className="inline-flex items-center gap-1.5">
                  <BadgeRotulo {...TIPO_SOLICITACAO[s.tipo]} />
                  {s.anexoUrl && <Paperclip className="size-3.5 text-muted-foreground" aria-label="Com anexo" />}
                </span>
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap">{descreverPedido(s)}</TableCell>
              <TableCell>
                <BadgeRotulo {...STATUS_SOLICITACAO[s.status]} />
              </TableCell>
              <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                {formatarDataHora(s.criadoEm)}
              </TableCell>
              <TableCell>
                {/* O link cobre a linha inteira (after:absolute) para facilitar o clique. */}
                <Link
                  href={`/solicitacoes/${s.id}`}
                  className="text-muted-foreground after:absolute after:inset-0 group-hover:text-primary"
                  aria-label={`Abrir solicitação de ${TIPO_SOLICITACAO[s.tipo].rotulo}`}
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
