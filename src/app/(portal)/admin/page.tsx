import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarRange, Gauge, History, Users } from "lucide-react";

import { GraficoBarras } from "@/components/grafico-barras";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { colaboradoresPorUnidade } from "@/features/indicadores/consultas";
import { exigirPermissao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { tempoRelativo } from "@/lib/utils";

export const metadata: Metadata = { title: "Administração" };

export default async function PaginaAdmin() {
  await exigirPermissao("usuario:gerenciar");

  const [ativos, inativos, salas, veiculos, unidades, setores, metas, ramais, ultimosLogs, porUnidade] =
    await Promise.all([
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.usuario.count({ where: { ativo: false } }),
      prisma.recurso.count({ where: { tipo: "SALA" } }),
      prisma.recurso.count({ where: { tipo: "VEICULO" } }),
      prisma.unidade.count(),
      prisma.setor.count(),
      prisma.metaMensal.count(),
      prisma.ramalUtil.count(),
      prisma.logAuditoria.findMany({
        orderBy: { criadoEm: "desc" },
        take: 7,
        include: { usuario: { select: { nome: true } } },
      }),
      colaboradoresPorUnidade(),
    ]);

  const secoes = [
    { href: "/admin/usuarios", icone: Users, titulo: "Usuários", descricao: `${ativos} ativos · ${inativos} inativos` },
    { href: "/admin/recursos", icone: CalendarRange, titulo: "Salas e veículos", descricao: `${salas} salas · ${veiculos} veículos` },
    { href: "/admin/estrutura", icone: Building2, titulo: "Unidades e setores", descricao: `${unidades} unidades · ${setores} setores` },
    { href: "/admin/painel", icone: Gauge, titulo: "Metas e ramais", descricao: `${metas} metas · ${ramais} ramais` },
    { href: "/admin/auditoria", icone: History, titulo: "Auditoria", descricao: "Trilha de ações no portal" },
  ];

  return (
    <>
      <PageHeader titulo="Administração" descricao="Configurações gerais do VoltHub." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {secoes.map(({ href, icone: Icone, titulo, descricao }) => (
          <Link key={href} href={href} className="group rounded-xl focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:outline-none">
            <Card className="h-full gap-3 transition-colors group-hover:border-primary/30">
              <CardHeader className="grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-destaque-suave text-primary">
                  <Icone className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base">{titulo}</CardTitle>
                  <CardDescription>{descricao}</CardDescription>
                </div>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-base">Colaboradores ativos por unidade</CardTitle>
            <CardDescription>{porUnidade.reduce((s, p) => s + p.valor, 0)} no total</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarras dados={porUnidade} medida="Colaboradores" orientacao="horizontal" altura={200} />
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">Atividade recente</CardTitle>
            <Link href="/admin/auditoria" className="text-sm font-medium text-primary hover:underline">Ver tudo</Link>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {ultimosLogs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{l.usuario?.nome ?? "Sistema"}</span>{" "}
                    <span className="font-mono text-xs text-muted-foreground">{l.acao}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{tempoRelativo(l.criadoEm)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
