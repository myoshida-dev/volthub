import {
  CalendarDays,
  ClipboardList,
  FolderOpen,
  House,
  LifeBuoy,
  Megaphone,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permissao } from "@/lib/permissions";

export type ItemNavegacao = {
  titulo: string;
  href: string;
  icone: LucideIcon;
  /** Sem permissão = visível para qualquer usuário logado. */
  permissao?: Permissao;
};

export type ItemSubsecao = { titulo: string; href: string; permissao?: Permissao };

/** Abas da barra superior. */
export const NAVEGACAO: ItemNavegacao[] = [
  { titulo: "Meu dia", href: "/", icone: House },
  { titulo: "Comunicados", href: "/comunicados", icone: Megaphone },
  { titulo: "RH", href: "/solicitacoes", icone: ClipboardList },
  { titulo: "TI", href: "/chamados", icone: LifeBuoy },
  { titulo: "Reservas", href: "/reservas", icone: CalendarDays },
  { titulo: "Pessoas", href: "/diretorio", icone: Users },
  { titulo: "Documentos", href: "/documentos", icone: FolderOpen },
  { titulo: "Admin", href: "/admin", icone: Settings, permissao: "usuario:gerenciar" },
];

/** Sub-abas de cada seção (aparecem logo abaixo da barra superior). */
export const SUBSECOES = {
  "/solicitacoes": [
    { titulo: "Minhas solicitações", href: "/solicitacoes" },
    { titulo: "Aprovações", href: "/solicitacoes/aprovacoes", permissao: "solicitacao:aprovar" },
    { titulo: "Gestão de RH", href: "/solicitacoes/gestao", permissao: "solicitacao:gerenciar" },
  ],
  "/chamados": [
    { titulo: "Meus chamados", href: "/chamados" },
    { titulo: "Fila de TI", href: "/chamados/fila", permissao: "chamado:atender" },
  ],
  "/admin": [
    { titulo: "Visão geral", href: "/admin" },
    { titulo: "Usuários", href: "/admin/usuarios" },
    { titulo: "Salas e veículos", href: "/admin/recursos" },
    { titulo: "Unidades e setores", href: "/admin/estrutura" },
    { titulo: "Metas e ramais", href: "/admin/painel" },
    { titulo: "Auditoria", href: "/admin/auditoria" },
  ],
} satisfies Record<string, ItemSubsecao[]>;

/** O href mais específico que casa com a rota atual ("/" só casa com "/"). */
export function hrefAtivo(pathname: string, hrefs: string[]) {
  return hrefs
    .filter((href) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}
