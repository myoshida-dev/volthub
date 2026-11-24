import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Search } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirPermissao } from "@/lib/auth-guard";
import { descreverAcesso } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Usuários" };

const POR_PAGINA = 25;

type Params = { q?: string; situacao?: string; perfil?: string; pagina?: string };

export default async function PaginaUsuarios({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirPermissao("usuario:gerenciar");
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const termo = params.q?.trim();

  const where: Prisma.UsuarioWhereInput = {
    ...(params.situacao === "ativos" && { ativo: true }),
    ...(params.situacao === "inativos" && { ativo: false }),
    ...(params.perfil && ["COLABORADOR", "GESTOR", "EQUIPE", "ADMIN"].includes(params.perfil) && { perfil: params.perfil as Prisma.EnumPerfilFilter["equals"] }),
    ...(termo && {
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { email: { contains: termo, mode: "insensitive" } },
        { cargo: { contains: termo, mode: "insensitive" } },
      ],
    }),
  };

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: { unidade: { select: { nome: true } }, setor: { select: { nome: true } }, gestor: { select: { nome: true } } },
    }),
    prisma.usuario.count({ where }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Usuários"
        descricao={`${total} usuário(s).`}
        acoes={
          <Button asChild>
            <Link href="/admin/usuarios/novo"><Plus /> Novo usuário</Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={termo} placeholder="Nome, e-mail ou cargo" className="pl-9" aria-label="Buscar usuário" />
        </div>
        <SelectFiltro name="perfil" defaultValue={params.perfil ?? ""} className="w-44" aria-label="Perfil">
          <option value="">Todos os perfis</option>
          <option value="COLABORADOR">Colaborador</option>
          <option value="GESTOR">Gestor</option>
          <option value="EQUIPE">Equipe</option>
          <option value="ADMIN">Administrador</option>
        </SelectFiltro>
        <SelectFiltro name="situacao" defaultValue={params.situacao ?? ""} className="w-36" aria-label="Situação">
          <option value="">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </SelectFiltro>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      {usuarios.length === 0 ? (
        <EstadoVazio titulo="Nenhum usuário encontrado" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Lotação</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>Último acesso</TableHead>
                <TableHead className="w-10"><span className="sr-only">Editar</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id} className={u.ativo ? "" : "opacity-60"}>
                  <TableCell>
                    <p className="font-medium">{u.nome} {!u.ativo && <Badge variant="outline" className="ml-1">Inativo</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {u.cargo}
                    <span className="block text-xs text-muted-foreground">{u.setor.nome} · {u.unidade.nome}</span>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{descreverAcesso(u)}</Badge></TableCell>
                  <TableCell className="text-sm">{u.gestor?.nome ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.ultimoAcessoEm ? tempoRelativo(u.ultimoAcessoEm) : "Nunca"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/usuarios/${u.id}`} aria-label={`Editar ${u.nome}`}><Pencil /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Paginacao pagina={pagina} totalPaginas={Math.ceil(total / POR_PAGINA)} base="/admin/usuarios" params={{ q: termo, situacao: params.situacao, perfil: params.perfil }} />
    </>
  );
}
