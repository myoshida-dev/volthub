import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/utils";

export const metadata: Metadata = { title: "Auditoria" };

const POR_PAGINA = 30;

/** Link para o registro afetado, quando existe uma página para ele. */
function linkEntidade(entidade: string, id: string | null) {
  if (!id) return null;
  const rotas: Record<string, string> = {
    Solicitacao: `/solicitacoes/${id}`,
    Chamado: `/chamados/${id}`,
    Comunicado: `/comunicados/${id}`,
    Usuario: `/admin/usuarios/${id}`,
    Recurso: `/admin/recursos/${id}`,
  };
  return rotas[entidade] ?? null;
}

type Params = { entidade?: string; usuario?: string; pagina?: string };

export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirPermissao("auditoria:ver");
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);

  const where: Prisma.LogAuditoriaWhereInput = {
    ...(params.entidade && { entidade: params.entidade }),
    ...(params.usuario && { usuarioId: params.usuario }),
  };

  const [logs, total, entidades, usuarios] = await Promise.all([
    prisma.logAuditoria.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { usuario: { select: { nome: true } } },
    }),
    prisma.logAuditoria.count({ where }),
    prisma.logAuditoria.findMany({ distinct: ["entidade"], select: { entidade: true }, orderBy: { entidade: "asc" } }),
    prisma.usuario.findMany({ where: { logsAuditoria: { some: {} } }, select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
  ]);

  return (
    <>
      <PageHeader titulo="Auditoria" descricao={`${total} registro(s). Logins, aprovações, alterações e exclusões ficam registrados aqui.`} />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <SelectFiltro name="entidade" defaultValue={params.entidade ?? ""} className="w-48" aria-label="Entidade">
          <option value="">Todas as entidades</option>
          {entidades.map((e) => <option key={e.entidade} value={e.entidade}>{e.entidade}</option>)}
        </SelectFiltro>
        <SelectFiltro name="usuario" defaultValue={params.usuario ?? ""} className="w-56" aria-label="Usuário">
          <option value="">Todos os usuários</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </SelectFiltro>
      </form>

      {logs.length === 0 ? (
        <EstadoVazio icone={History} titulo="Nenhum registro" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Quem</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => {
                const href = linkEntidade(l.entidade, l.entidadeId);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatarDataHora(l.criadoEm)}</TableCell>
                    <TableCell className="text-sm">{l.usuario?.nome ?? "Sistema"}</TableCell>
                    <TableCell><span className="font-mono text-xs">{l.acao}</span></TableCell>
                    <TableCell className="text-sm">
                      {href ? <Link href={href} className="text-primary hover:underline">{l.entidade}</Link> : l.entidade}
                    </TableCell>
                    <TableCell className="max-w-72 truncate font-mono text-xs text-muted-foreground" title={l.dados ? JSON.stringify(l.dados) : undefined}>
                      {l.dados ? JSON.stringify(l.dados) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <Paginacao pagina={pagina} totalPaginas={Math.ceil(total / POR_PAGINA)} base="/admin/auditoria" params={{ entidade: params.entidade, usuario: params.usuario }} />
    </>
  );
}
