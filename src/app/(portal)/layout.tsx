import { AppShell } from "@/components/layout/app-shell";
import { exigirSessao } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const usuarioSessao = await exigirSessao();

  const [usuario, notificacoes, naoLidas] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioSessao.id },
      select: { nome: true, email: true, cargo: true, avatarUrl: true, unidade: { select: { nome: true } } },
    }),
    prisma.notificacao.findMany({
      where: { usuarioId: usuarioSessao.id },
      orderBy: { criadoEm: "desc" },
      take: 6,
      select: { id: true, titulo: true, mensagem: true, link: true, lida: true, criadoEm: true },
    }),
    prisma.notificacao.count({ where: { usuarioId: usuarioSessao.id, lida: false } }),
  ]);

  return (
    <AppShell
      usuario={{
        nome: usuario?.nome ?? usuarioSessao.name ?? "",
        email: usuario?.email ?? usuarioSessao.email ?? "",
        imagem: usuario?.avatarUrl ?? null,
        cargo: usuario?.cargo ?? "",
        unidade: usuario?.unidade.nome ?? "",
        perfil: usuarioSessao.perfil,
        equipe: usuarioSessao.equipe,
      }}
      notificacoes={notificacoes.map((n) => ({ ...n, criadoEm: n.criadoEm.toISOString() }))}
      naoLidas={naoLidas}
    >
      {children}
    </AppShell>
  );
}
