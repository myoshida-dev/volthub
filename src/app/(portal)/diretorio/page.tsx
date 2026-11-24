import type { Metadata } from "next";
import { Search, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { CartaoPessoa, selecionarPessoa } from "@/components/cartao-pessoa";
import { EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Pessoas" };

const POR_PAGINA = 24;

type Params = { q?: string; unidade?: string; setor?: string; pagina?: string };

export default async function PaginaDiretorio({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirSessao();
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const termo = params.q?.trim();

  const where: Prisma.UsuarioWhereInput = {
    ativo: true,
    ...(params.unidade && { unidadeId: params.unidade }),
    ...(params.setor && { setorId: params.setor }),
    ...(termo && {
      OR: [
        { nome: { contains: termo, mode: "insensitive" } },
        { cargo: { contains: termo, mode: "insensitive" } },
        { email: { contains: termo, mode: "insensitive" } },
        { ramal: { contains: termo } },
      ],
    }),
  };

  const [pessoas, total, unidades, setores] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: selecionarPessoa,
      orderBy: { nome: "asc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.usuario.count({ where }),
    prisma.unidade.findMany({ orderBy: [{ matriz: "desc" }, { nome: "asc" }], select: { id: true, nome: true } }),
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <>
      <PageHeader titulo="Pessoas" descricao={`${total} colaborador(es) encontrado(s).`} />

      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={termo} placeholder="Nome, cargo, e-mail ou ramal" className="pl-9" aria-label="Buscar colaborador" />
        </div>
        <SelectFiltro name="unidade" defaultValue={params.unidade ?? ""} className="w-52" aria-label="Unidade">
          <option value="">Todas as unidades</option>
          {unidades.map((u) => (
            <option key={u.id} value={u.id}>{u.nome}</option>
          ))}
        </SelectFiltro>
        <SelectFiltro name="setor" defaultValue={params.setor ?? ""} className="w-56" aria-label="Setor">
          <option value="">Todos os setores</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>{s.nome}</option>
          ))}
        </SelectFiltro>
        <Button type="submit" variant="outline">Buscar</Button>
      </form>

      {pessoas.length === 0 ? (
        <EstadoVazio icone={Users} titulo="Ninguém encontrado" descricao="Tente outro nome ou remova os filtros." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pessoas.map((p) => (
            <CartaoPessoa key={p.id} pessoa={p} />
          ))}
        </div>
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/diretorio"
        params={{ q: termo, unidade: params.unidade, setor: params.setor }}
      />
    </>
  );
}
