import type { Equipe, Perfil } from "@prisma/client";

/** Contas de demonstração (criadas pelo seed). Todas usam a mesma senha. */
export const SENHA_DEMO = "volt123";

export const CONTAS_DEMO: {
  login: string;
  nome: string;
  perfil: Perfil;
  equipe: Equipe | null;
  descricao: string;
}[] = [
  { login: "juliana.costa", nome: "Juliana Costa", perfil: "COLABORADOR", equipe: null, descricao: "Vendedora · Comercial" },
  { login: "ricardo.almeida", nome: "Ricardo Almeida", perfil: "GESTOR", equipe: null, descricao: "Gerente Comercial" },
  { login: "patricia.souza", nome: "Patrícia Souza", perfil: "EQUIPE", equipe: "RH", descricao: "Analista de RH" },
  { login: "lucas.ferreira", nome: "Lucas Ferreira", perfil: "EQUIPE", equipe: "TI", descricao: "Analista de Suporte" },
  { login: "carla.mendes", nome: "Carla Mendes", perfil: "ADMIN", equipe: "TI", descricao: "Administradora de Sistemas" },
];
