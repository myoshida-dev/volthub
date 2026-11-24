import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LifeBuoy, Megaphone, SearchX, Users } from "lucide-react";

import { CartaoPessoa, selecionarPessoa } from "@/components/cartao-pessoa";
import { BadgeRotulo, EstadoVazio } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { filtroVisiveis } from "@/features/comunicados/consultas";
import { exigirSessao } from "@/lib/auth-guard";
import { ehDaEquipe } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_COMUNICADO, CATEGORIA_DOCUMENTO, STATUS_CHAMADO } from "@/lib/rotulos";
import { numeroChamado, tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Busca" };

const LIMITE = 6;

function Secao({ icone: Icone, titulo, total, verTodos, children }: {
  icone: typeof Users;
  titulo: string;
  total: number;
  verTodos?: string;
  children: React.ReactNode;
}) {
  if (total === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-primary">
          <Icone className="size-4" /> {titulo}
          <span className="text-sm font-normal text-muted-foreground">({total})</span>
        </h2>
        {verTodos && total > LIMITE && (
          <Link href={verTodos} className="text-sm font-medium text-primary hover:underline">Ver todos</Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function PaginaBusca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const usuario = await exigirSessao();
  const termo = (await searchParams).q?.trim() ?? "";

  if (termo.length < 2) {
    return (
      <>
        <PageHeader titulo="Busca" />
        <EstadoVazio icone={SearchX} titulo="Digite pelo menos 2 letras" descricao="Use a barra de busca no topo para procurar pessoas, comunicados, documentos e chamados." />
      </>
    );
  }

  const contem = { contains: termo, mode: "insensitive" as const };
  const wherePessoas = { ativo: true, OR: [{ nome: contem }, { cargo: contem }, { email: contem }] };
  const whereComunicados = { AND: [filtroVisiveis(usuario), { OR: [{ titulo: contem }, { conteudo: contem }] }] };
  const whereDocumentos = { OR: [{ titulo: contem }, { descricao: contem }] };
  const whereChamados = {
    ...(ehDaEquipe(usuario, "TI") ? {} : { solicitanteId: usuario.id }),
    OR: [{ titulo: contem }, { descricao: contem }, ...(Number.isInteger(Number(termo.replace("#", ""))) ? [{ numero: Number(termo.replace("#", "")) }] : [])],
  };

  const [pessoas, totalPessoas, comunicados, totalComunicados, documentos, totalDocumentos, chamados, totalChamados] =
    await Promise.all([
      prisma.usuario.findMany({ where: wherePessoas, select: selecionarPessoa, orderBy: { nome: "asc" }, take: LIMITE }),
      prisma.usuario.count({ where: wherePessoas }),
      prisma.comunicado.findMany({ where: whereComunicados, orderBy: { publicadoEm: "desc" }, take: LIMITE }),
      prisma.comunicado.count({ where: whereComunicados }),
      prisma.documento.findMany({ where: whereDocumentos, orderBy: { titulo: "asc" }, take: LIMITE }),
      prisma.documento.count({ where: whereDocumentos }),
      prisma.chamado.findMany({ where: whereChamados, orderBy: { atualizadoEm: "desc" }, take: LIMITE }),
      prisma.chamado.count({ where: whereChamados }),
    ]);

  const total = totalPessoas + totalComunicados + totalDocumentos + totalChamados;

  return (
    <div className="space-y-8">
      <PageHeader titulo={`Resultados para “${termo}”`} descricao={`${total} resultado(s) encontrado(s).`} />

      {total === 0 && <EstadoVazio icone={SearchX} titulo="Nada encontrado" descricao="Tente outra palavra ou verifique a grafia." />}

      <Secao icone={Users} titulo="Pessoas" total={totalPessoas} verTodos={`/diretorio?q=${encodeURIComponent(termo)}`}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pessoas.map((p) => <CartaoPessoa key={p.id} pessoa={p} />)}
        </div>
      </Secao>

      <Secao icone={Megaphone} titulo="Comunicados" total={totalComunicados}>
        <Card className="gap-0 divide-y py-0">
          {comunicados.map((c) => (
            <Link key={c.id} href={`/comunicados/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.titulo}</span>
                <span className="block text-xs text-muted-foreground">{tempoRelativo(c.publicadoEm)}</span>
              </span>
              <BadgeRotulo {...CATEGORIA_COMUNICADO[c.categoria]} />
            </Link>
          ))}
        </Card>
      </Secao>

      <Secao icone={FileText} titulo="Documentos" total={totalDocumentos} verTodos={`/documentos?q=${encodeURIComponent(termo)}`}>
        <Card className="gap-0 divide-y py-0">
          {documentos.map((d) => (
            <a key={d.id} href={d.arquivoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
              <span className="min-w-0 truncate font-medium">{d.titulo}</span>
              <BadgeRotulo {...CATEGORIA_DOCUMENTO[d.categoria]} />
            </a>
          ))}
        </Card>
      </Secao>

      <Secao icone={LifeBuoy} titulo="Chamados" total={totalChamados}>
        <Card className="gap-0 divide-y py-0">
          {chamados.map((c) => (
            <Link key={c.id} href={`/chamados/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{numeroChamado(c.numero)}</span>
                  {c.titulo}
                </span>
              </span>
              <BadgeRotulo {...STATUS_CHAMADO[c.status]} />
            </Link>
          ))}
        </Card>
      </Secao>
    </div>
  );
}
