import type { Metadata } from "next";
import Link from "next/link";
import { Car, DoorOpen, Pencil, Plus } from "lucide-react";

import { BadgeRotulo } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { TIPO_RECURSO } from "@/lib/rotulos";

export const metadata: Metadata = { title: "Salas e veículos" };

export default async function PaginaRecursos() {
  await exigirPermissao("recurso:gerenciar");
  const recursos = await prisma.recurso.findMany({
    orderBy: [{ unidade: { nome: "asc" } }, { tipo: "asc" }, { nome: "asc" }],
    include: {
      unidade: { select: { nome: true } },
      _count: { select: { reservas: { where: { status: "CONFIRMADA", fim: { gt: new Date() } } } } },
    },
  });

  return (
    <>
      <PageHeader
        titulo="Salas e veículos"
        descricao="Recursos disponíveis para reserva em cada unidade."
        acoes={
          <Button asChild>
            <Link href="/admin/recursos/novo"><Plus /> Novo recurso</Link>
          </Button>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Reservas futuras</TableHead>
              <TableHead className="w-10"><span className="sr-only">Editar</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recursos.map((r) => (
              <TableRow key={r.id} className={r.ativo ? "" : "opacity-60"}>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium">
                    {r.tipo === "VEICULO" ? <Car className="size-4 text-muted-foreground" /> : <DoorOpen className="size-4 text-muted-foreground" />}
                    {r.nome}
                    {!r.ativo && <Badge variant="outline">Inativo</Badge>}
                  </span>
                </TableCell>
                <TableCell><BadgeRotulo {...TIPO_RECURSO[r.tipo]} /></TableCell>
                <TableCell className="text-sm">{r.unidade.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.tipo === "SALA"
                    ? `${r.capacidade} lugares${r.localizacao ? ` · ${r.localizacao}` : ""}`
                    : `${r.modelo ?? ""} · ${r.placa} · ${r.kmAtual?.toLocaleString("pt-BR") ?? "—"} km`}
                </TableCell>
                <TableCell className="text-sm tabular-nums">{r._count.reservas}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/recursos/${r.id}`} aria-label={`Editar ${r.nome}`}><Pencil /></Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
