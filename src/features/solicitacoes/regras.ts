import type { StatusSolicitacao } from "@prisma/client";

import { ehDaEquipe, type UsuarioComAcesso } from "@/lib/permissions";

/**
 * Regras do fluxo de solicitações (funções puras, cobertas por testes).
 *
 * - O pedido vai para o gestor direto do solicitante (`aprovadorId`).
 * - Sem gestor (ex.: diretoria), qualquer pessoa do RH decide.
 * - ADMIN pode decidir qualquer pedido. Ninguém aprova o próprio pedido.
 */
type Usuario = UsuarioComAcesso & { id: string };
type Solicitacao = {
  solicitanteId: string;
  aprovadorId: string | null;
  status: StatusSolicitacao;
};

export function podeVerSolicitacao(u: Usuario, s: Solicitacao) {
  return s.solicitanteId === u.id || s.aprovadorId === u.id || ehDaEquipe(u, "RH");
}

export function podeDecidirSolicitacao(u: Usuario, s: Solicitacao) {
  if (s.status !== "PENDENTE" || s.solicitanteId === u.id) return false;
  if (u.perfil === "ADMIN") return true;
  if (s.aprovadorId) return s.aprovadorId === u.id;
  return u.equipe === "RH";
}

export function podeCancelarSolicitacao(u: Usuario, s: Solicitacao) {
  return s.status === "PENDENTE" && s.solicitanteId === u.id;
}
