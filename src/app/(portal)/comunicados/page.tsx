import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Pin, Plus, Users } from "lucide-react";

import { AbasLink, BadgeRotulo, EstadoVazio, lerPagina, Paginacao, urlCom } from "@/components/comuns";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { BotaoCiente, descreverPublico } from "@/features/comunicados/componentes";
import { filtroVisiveis } from "@/features/comunicados/consultas";
import { exigirSessao } from "@/lib/auth-guard";
import { pode } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_COMUNICADO } from "@/lib/rotulos";
import { cn, formatarDataHora, tempoRelativo } from "@/lib/utils";
import type { CategoriaComunicado, Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Comunicados" };

const POR_PAGINA = 10;

type Params = { filtro?: string; pagina?: string };

export default async function PaginaComunicados({ searchParams }: { searchParams: Promise<Params> }) {
  const usuario = await exigirSessao();
  const params = await searchParams;
  const pagina = lerPagina(params.pagina);
  const filtro = params.filtro ?? "todos";

  const visiveis = filtroVisiveis(usuario);
  const naoLidos: Prisma.ComunicadoWhereInput = { leituras: { none: { usuarioId: usuario.id } } };

  let where: Prisma.ComunicadoWhereInput = visiveis;
  if (filtro === "nao-lidos") where = { AND: [visiveis, naoLidos] };
  else if (filtro in CATEGORIA_COMUNICADO)
    where = { AND: [visiveis, { categoria: filtro as CategoriaComunicado }] };

  const [comunicados, total, totalNaoLidos] = await Promise.all([
    prisma.comunicado.findMany({
      where,
      orderBy: [{ fixado: "desc" }, { publicadoEm: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: {
        autor: { select: { nome: true, cargo: true } },
        unidades: { select: { nome: true } },
        setores: { select: { nome: true } },
        leituras: { where: { usuarioId: usuario.id }, select: { id: true } },
        _count: { select: { leituras: true } },
      },
    }),
    prisma.comunicado.count({ where }),
    prisma.comunicado.count({ where: { AND: [visiveis, naoLidos] } }),
  ]);

  const abas = [
    { valor: "todos", rotulo: "Todos" },
    { valor: "nao-lidos", rotulo: "Não lidos", contador: totalNaoLidos },
    ...Object.entries(CATEGORIA_COMUNICADO).map(([valor, { rotulo }]) => ({ valor, rotulo })),
  ].map((a) => ({ ...a, href: urlCom("/comunicados", {}, { filtro: a.valor === "todos" ? undefined : a.valor }) }));

  return (
    <>
      <PageHeader
        titulo="Comunicados"
        descricao="Avisos e novidades da Volt para você."
        acoes={
          pode(usuario, "comunicado:publicar") && (
            <Button asChild>
              <Link href="/comunicados/novo">
                <Plus /> Novo comunicado
              </Link>
            </Button>
          )
        }
      />

      <div className="mb-6 overflow-x-auto">
        <AbasLink abas={abas} atual={filtro} />
      </div>

      {comunicados.length === 0 ? (
        <EstadoVazio
          icone={Megaphone}
          titulo={filtro === "nao-lidos" ? "Você leu tudo!" : "Nenhum comunicado por aqui"}
          descricao={
            filtro === "nao-lidos"
              ? "Não há comunicados pendentes de leitura."
              : "Quando houver avisos para você, eles aparecem neste mural."
          }
        />
      ) : (
        <div className="space-y-4">
          {comunicados.map((c) => (
            <Card
              key={c.id}
              className={cn("gap-4", c.fixado && "border-destaque/60 ring-1 ring-destaque/30")}
            >
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {c.fixado && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <Pin className="size-3.5" fill="currentColor" /> Fixado
                    </span>
                  )}
                  <BadgeRotulo {...CATEGORIA_COMUNICADO[c.categoria]} />
                  {c.leituras.length === 0 && (
                    <span className="size-2 rounded-full bg-destaque" aria-label="Não lido" />
                  )}
                </div>
                <Link
                  href={`/comunicados/${c.id}`}
                  className="text-lg font-semibold text-primary hover:underline"
                >
                  {c.titulo}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {c.autor.nome} ·{" "}
                  <time dateTime={c.publicadoEm.toISOString()} title={formatarDataHora(c.publicadoEm)}>
                    {tempoRelativo(c.publicadoEm)}
                  </time>{" "}
                  · Para: {descreverPublico(c.unidades, c.setores)}
                </p>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
                  {c.conteudo}
                </p>
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-3">
                <BotaoCiente comunicadoId={c.id} ciente={c.leituras.length > 0} />
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" />
                  {c._count.leituras} ciente(s)
                  <Link href={`/comunicados/${c.id}`} className="ml-3 font-medium text-primary hover:underline">
                    Ler completo
                  </Link>
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Paginacao
        pagina={pagina}
        totalPaginas={Math.ceil(total / POR_PAGINA)}
        base="/comunicados"
        params={{ filtro: params.filtro }}
      />
    </>
  );
}
