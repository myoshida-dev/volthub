import type { Equipe, Perfil } from "@prisma/client";

/** Dados do usuário logado que o shell (client) precisa exibir. */
export type UsuarioShell = {
  nome: string;
  email: string;
  imagem: string | null;
  perfil: Perfil;
  equipe: Equipe | null;
  cargo: string;
  unidade: string;
};

/** Notificação já serializada para o client (datas em ISO). */
export type NotificacaoShell = {
  id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  criadoEm: string;
};
