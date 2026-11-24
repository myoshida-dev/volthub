import type { Metadata } from "next";
import { Trash2 } from "lucide-react";

import { BotaoEnviar, FormConfirmacao } from "@/components/formulario";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { excluirMeta, excluirRamal } from "@/features/admin/actions";
import { DialogoMeta, DialogoRamal } from "@/features/admin/formularios";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { moedaCompacta } from "@/lib/utils";

export const metadata: Metadata = { title: "Metas e ramais" };

const nomeMes = (mes: Date) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(mes);

function BotaoExcluir({ acao, mensagem, rotulo }: { acao: () => Promise<void>; mensagem: string; rotulo: string }) {
  return (
    <FormConfirmacao action={acao} mensagem={mensagem}>
      <BotaoEnviar variant="ghost" size="icon" aria-label={rotulo} className="text-destructive hover:bg-destructive/10 hover:text-destructive" textoEnviando="">
        <Trash2 />
      </BotaoEnviar>
    </FormConfirmacao>
  );
}

export default async function PaginaPainelAdmin() {
  await exigirPermissao("usuario:gerenciar");

  const [metas, ramais, setores, unidades] = await Promise.all([
    prisma.metaMensal.findMany({
      orderBy: [{ mes: "desc" }, { titulo: "asc" }],
      take: 24,
      include: { setor: { select: { nome: true } } },
    }),
    prisma.ramalUtil.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      include: { unidade: { select: { nome: true } } },
    }),
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Metas e ramais"
        descricao='O que aparece nos cartões "Meta" e "Ramais úteis" do painel Meu dia.'
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="gap-4 pb-0">
          <CardHeader className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Metas do mês</CardTitle>
              <CardDescription>
                Cada pessoa vê a meta do próprio setor; sem meta do setor, vê a meta geral.
              </CardDescription>
            </div>
            <DialogoMeta setores={setores} />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meta</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metas.map((m) => {
                  const pct = Math.round((m.valorRealizado / m.valorMeta) * 100);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium">{m.titulo}</p>
                        <p className="text-xs text-muted-foreground">{m.setor?.nome ?? "Empresa toda"}</p>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{nomeMes(m.mes)}</TableCell>
                      <TableCell className="text-right">
                        <p className="font-mono text-sm tabular-nums">{pct}%</p>
                        <p className="text-xs text-muted-foreground">
                          {moedaCompacta(m.valorRealizado)} de {moedaCompacta(m.valorMeta)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DialogoMeta
                            id={m.id}
                            setores={setores}
                            inicial={{
                              titulo: m.titulo,
                              mes: m.mes.toISOString().slice(0, 7),
                              setorId: m.setorId,
                              valorMeta: m.valorMeta,
                              valorRealizado: m.valorRealizado,
                            }}
                          />
                          <BotaoExcluir acao={excluirMeta.bind(null, m.id)} mensagem={`Excluir "${m.titulo}" de ${nomeMes(m.mes)}?`} rotulo={`Excluir ${m.titulo}`} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="h-fit gap-4 pb-0">
          <CardHeader className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Ramais úteis</CardTitle>
              <CardDescription>Atalhos de contato no painel, por unidade.</CardDescription>
            </div>
            <DialogoRamal unidades={unidades} />
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ramal</TableHead>
                  <TableHead className="w-24"><span className="sr-only">Ações</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ramais.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">{r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.unidade?.nome ?? "Todas as unidades"}</p>
                    </TableCell>
                    <TableCell className="font-mono">{r.numero}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DialogoRamal
                          id={r.id}
                          unidades={unidades}
                          inicial={{ nome: r.nome, numero: r.numero, ordem: r.ordem, unidadeId: r.unidadeId }}
                        />
                        <BotaoExcluir acao={excluirRamal.bind(null, r.id)} mensagem={`Excluir o ramal "${r.nome}"?`} rotulo={`Excluir ${r.nome}`} />
                      </div>
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
