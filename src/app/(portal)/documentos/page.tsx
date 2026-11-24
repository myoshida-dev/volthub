import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileImage, FileSpreadsheet, FileText, FolderOpen, Plus, Presentation, Search, Trash2 } from "lucide-react";
import type { CategoriaDocumento, Prisma } from "@prisma/client";

import { BadgeRotulo, EstadoVazio, lerPagina, Paginacao } from "@/components/comuns";
import { SelectFiltro } from "@/components/filtro-auto";
import { BotaoEnviar, FormConfirmacao } from "@/components/formulario";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { excluirDocumento } from "@/features/documentos/actions";
import { exigirSessao } from "@/lib/auth-guard";
import { pode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_DOCUMENTO, opcoes } from "@/lib/rotulos";
import { linkDownload } from "@/lib/uploads";
import { formatarBytes, formatarData } from "@/lib/utils";

export const metadata: Metadata = { title: "Documentos" };

const POR_PAGINA = 20;

function IconeArquivo({ mime }: { mime: string }) {
  const classe = "size-5";
  if (mime.startsWith("image/")) return <FileImage className={classe} />;
  if (mime.includes("spreadsheet")) return <FileSpreadsheet className={classe} />;
  if (mime.includes("presentation")) return <Presentation className={classe} />;
  return <FileText className={classe} />;
}

type Params = { q?: string; categoria?: string; setor?: string; pagina?: string };

export default async function PaginaDocumentos({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirSessao();
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const termo = params.q?.trim();
  const podeGerenciar = pode(usuario, "documento:gerenciar");

  const where: Prisma.DocumentoWhereInput = {
    ...(params.categoria && params.categoria in CATEGORIA_DOCUMENTO && { categoria: params.categoria as CategoriaDocumento }),
    ...(params.setor && { setorId: params.setor }),
    ...(termo && {
      OR: [
        { titulo: { contains: termo, mode: "insensitive" } },
        { descricao: { contains: termo, mode: "insensitive" } },
        { arquivoNome: { contains: termo, mode: "insensitive" } },
      ],
    }),
  };

  const [documentos, total, setores] = await Promise.all([
    prisma.documento.findMany({
      where,
      include: { setor: { select: { nome: true } }, autor: { select: { nome: true } } },
      orderBy: [{ categoria: "asc" }, { titulo: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.documento.count({ where }),
    prisma.setor.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  return (
    <>
      <PageHeader
        titulo="Documentos"
        descricao="Políticas, manuais, formulários e modelos da empresa."
        acoes={
          podeGerenciar && (
            <Button asChild>
              <Link href="/documentos/novo">
                <Plus /> Novo documento
              </Link>
            </Button>
          )
        }
      />

      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" type="search" defaultValue={termo} placeholder="Buscar por título ou descrição" className="pl-9" aria-label="Buscar documento" />
        </div>
        <SelectFiltro name="categoria" defaultValue={params.categoria ?? ""} className="w-48" aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {opcoes(CATEGORIA_DOCUMENTO).map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
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

      {documentos.length === 0 ? (
        <EstadoVazio icone={FolderOpen} titulo="Nenhum documento encontrado" descricao="Tente outros termos ou remova os filtros." />
      ) : (
        <Card className="gap-0 divide-y py-0">
          {documentos.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <IconeArquivo mime={d.mimeType} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{d.titulo}</p>
                  <BadgeRotulo {...CATEGORIA_DOCUMENTO[d.categoria]} />
                </div>
                {d.descricao && <p className="line-clamp-2 text-sm text-muted-foreground">{d.descricao}</p>}
                <p className="text-xs text-muted-foreground">
                  {d.setor?.nome ?? "Geral"} · {formatarBytes(d.tamanhoBytes)} · atualizado em {formatarData(d.atualizadoEm)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={d.arquivoUrl} target="_blank" rel="noreferrer">Abrir</a>
                </Button>
                <Button size="sm" asChild>
                  <a href={linkDownload(d.arquivoUrl, d.arquivoNome)}>
                    <Download /> Baixar
                  </a>
                </Button>
                {podeGerenciar && (
                  <FormConfirmacao action={excluirDocumento.bind(null, d.id)} mensagem={`Excluir "${d.titulo}"?`}>
                    <BotaoEnviar variant="ghost" size="icon" aria-label={`Excluir ${d.titulo}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" textoEnviando="">
                      <Trash2 />
                    </BotaoEnviar>
                  </FormConfirmacao>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/documentos"
        params={{ q: termo, categoria: params.categoria, setor: params.setor }}
      />
    </>
  );
}
