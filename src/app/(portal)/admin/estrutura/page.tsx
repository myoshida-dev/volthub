import type { Metadata } from "next";
import { Star } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogoSetor, DialogoUnidade } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Unidades e setores" };

export default async function PaginaEstrutura() {
  await exigirPermissao("usuario:gerenciar");
  const [unidades, setores] = await Promise.all([
    prisma.unidade.findMany({
      orderBy: [{ matriz: "desc" }, { nome: "asc" }],
      include: { _count: { select: { usuarios: { where: { ativo: true } }, recursos: true } } },
    }),
    prisma.setor.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { usuarios: { where: { ativo: true } } } } },
    }),
  ]);

  return (
    <>
      <PageHeader titulo="Unidades e setores" descricao="Estrutura organizacional usada em todo o portal." />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="gap-4 pb-0">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Unidades</CardTitle>
            <DialogoUnidade />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Pessoas</TableHead>
                  <TableHead>Recursos</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Editar</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unidades.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="flex items-center gap-1.5 font-medium">
                        {u.nome}
                        {u.matriz && <Star className="size-3.5 text-amber-500" fill="currentColor" aria-label="Matriz" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.cidade}/{u.uf}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">{u._count.usuarios}</TableCell>
                    <TableCell className="tabular-nums">{u._count.recursos}</TableCell>
                    <TableCell>
                      <DialogoUnidade id={u.id} inicial={u} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="gap-4 pb-0">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Setores</CardTitle>
            <DialogoSetor />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Pessoas</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Editar</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {setores.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{s.sigla}</TableCell>
                    <TableCell className="tabular-nums">{s._count.usuarios}</TableCell>
                    <TableCell>
                      <DialogoSetor id={s.id} inicial={s} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
