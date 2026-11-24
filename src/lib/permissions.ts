/**
 * Regras de acesso do VoltHub, centralizadas num só lugar.
 *
 * Usado em três pontos:
 *  - `src/proxy.ts`: bloqueia rotas antes de renderizar;
 *  - `src/lib/auth-guard.ts`: checagem no servidor (páginas e server actions);
 *  - menu lateral: esconde o que o usuário não pode acessar.
 *
 * Este arquivo não importa nada em tempo de execução, só tipos, e pode rodar
 * em qualquer ambiente.
 */
import type { Equipe, Perfil } from "@prisma/client";

export type UsuarioComAcesso = {
  perfil: Perfil;
  equipe: Equipe | null;
};

const ehAdmin = (u: UsuarioComAcesso) => u.perfil === "ADMIN";

/** Pertence à equipe (RH ou TI) ou é ADMIN. */
export const ehDaEquipe = (u: UsuarioComAcesso, equipe: Equipe) =>
  ehAdmin(u) || u.equipe === equipe;

/** Ações protegidas por perfil. Os módulos usam estas chaves com `pode()`. */
const PERMISSOES = {
  "comunicado:publicar": (u) => ehAdmin(u) || u.perfil === "GESTOR" || u.equipe === "RH",
  "solicitacao:aprovar": (u) => ehAdmin(u) || u.perfil === "GESTOR",
  "solicitacao:gerenciar": (u) => ehDaEquipe(u, "RH"),
  "chamado:atender": (u) => ehDaEquipe(u, "TI"),
  "documento:gerenciar": (u) => ehDaEquipe(u, "RH"),
  "recurso:gerenciar": ehAdmin,
  "usuario:gerenciar": ehAdmin,
  "auditoria:ver": ehAdmin,
} satisfies Record<string, (u: UsuarioComAcesso) => boolean>;

export type Permissao = keyof typeof PERMISSOES;

export function pode(usuario: UsuarioComAcesso | null | undefined, permissao: Permissao) {
  if (!usuario) return false;
  return PERMISSOES[permissao](usuario);
}

/**
 * Rotas restritas. Qualquer rota que não esteja aqui fica liberada para
 * qualquer usuário logado.
 */
const ROTAS_RESTRITAS: { prefixo: string; permissao: Permissao }[] = [
  { prefixo: "/admin", permissao: "usuario:gerenciar" },
  { prefixo: "/solicitacoes/aprovacoes", permissao: "solicitacao:aprovar" },
  { prefixo: "/solicitacoes/gestao", permissao: "solicitacao:gerenciar" },
  { prefixo: "/chamados/fila", permissao: "chamado:atender" },
];

const casaPrefixo = (caminho: string, prefixo: string) =>
  caminho === prefixo || caminho.startsWith(`${prefixo}/`);

export function podeAcessarRota(caminho: string, usuario: UsuarioComAcesso) {
  return ROTAS_RESTRITAS.filter((regra) => casaPrefixo(caminho, regra.prefixo)).every((regra) =>
    pode(usuario, regra.permissao),
  );
}

export const ROTULO_PERFIL: Record<Perfil, string> = {
  COLABORADOR: "Colaborador",
  GESTOR: "Gestor",
  EQUIPE: "Equipe",
  ADMIN: "Administrador",
};

/** "Equipe · TI", "Gestor · RH", "Colaborador" */
export function descreverAcesso(u: UsuarioComAcesso) {
  const perfil = ROTULO_PERFIL[u.perfil];
  return u.equipe && u.perfil !== "ADMIN" ? `${perfil} · ${u.equipe}` : perfil;
}
