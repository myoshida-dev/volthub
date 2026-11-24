import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  podeCancelarSolicitacao,
  podeDecidirSolicitacao,
  podeVerSolicitacao,
} from "@/features/solicitacoes/regras";
import { solicitacaoSchema } from "@/features/solicitacoes/schemas";

const juliana = { id: "juliana", perfil: "COLABORADOR" as const, equipe: null };
const ricardo = { id: "ricardo", perfil: "GESTOR" as const, equipe: null };
const outroGestor = { id: "marcos", perfil: "GESTOR" as const, equipe: null };
const patricia = { id: "patricia", perfil: "EQUIPE" as const, equipe: "RH" as const };
const carla = { id: "carla", perfil: "ADMIN" as const, equipe: null };

const pedido = { solicitanteId: "juliana", aprovadorId: "ricardo", status: "PENDENTE" as const };

describe("quem vê e decide uma solicitação", () => {
  it("solicitante, aprovador e RH veem; outro gestor não", () => {
    expect(podeVerSolicitacao(juliana, pedido)).toBe(true);
    expect(podeVerSolicitacao(ricardo, pedido)).toBe(true);
    expect(podeVerSolicitacao(patricia, pedido)).toBe(true);
    expect(podeVerSolicitacao(outroGestor, pedido)).toBe(false);
  });

  it("só o gestor direto (ou ADMIN) decide", () => {
    expect(podeDecidirSolicitacao(ricardo, pedido)).toBe(true);
    expect(podeDecidirSolicitacao(carla, pedido)).toBe(true);
    expect(podeDecidirSolicitacao(outroGestor, pedido)).toBe(false);
    expect(podeDecidirSolicitacao(patricia, pedido)).toBe(false);
  });

  it("sem gestor, o RH decide", () => {
    const semGestor = { ...pedido, aprovadorId: null };
    expect(podeDecidirSolicitacao(patricia, semGestor)).toBe(true);
    expect(podeDecidirSolicitacao(ricardo, semGestor)).toBe(false);
  });

  it("ninguém aprova o próprio pedido, nem um pedido já decidido", () => {
    const doAdmin = { ...pedido, solicitanteId: "carla" };
    expect(podeDecidirSolicitacao(carla, doAdmin)).toBe(false);
    expect(podeDecidirSolicitacao(ricardo, { ...pedido, status: "APROVADA" })).toBe(false);
  });

  it("só o solicitante cancela, e só enquanto pendente", () => {
    expect(podeCancelarSolicitacao(juliana, pedido)).toBe(true);
    expect(podeCancelarSolicitacao(ricardo, pedido)).toBe(false);
    expect(podeCancelarSolicitacao(juliana, { ...pedido, status: "REPROVADA" })).toBe(false);
  });
});

describe("validação do formulário de solicitação", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-24T12:00:00-03:00"));
  });
  afterEach(() => vi.useRealTimers());

  const erros = (dados: Record<string, string>) => {
    const r = solicitacaoSchema.safeParse(dados);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };

  it("aceita férias futuras de 10 dias", () => {
    expect(erros({ tipo: "FERIAS", dataInicio: "2027-01-04", dataFim: "2027-01-13" })).toEqual([]);
  });

  it("recusa férias curtas, longas ou no passado", () => {
    expect(erros({ tipo: "FERIAS", dataInicio: "2027-01-04", dataFim: "2027-01-06" }).join()).toMatch(/pelo menos 5 dias/);
    expect(erros({ tipo: "FERIAS", dataInicio: "2027-01-01", dataFim: "2027-02-15" }).join()).toMatch(/máximo é de 30/);
    expect(erros({ tipo: "FERIAS", dataInicio: "2026-11-01", dataFim: "2026-11-10" }).join()).toMatch(/data futura/);
  });

  it("recusa data final antes da inicial", () => {
    expect(erros({ tipo: "FOLGA", dataInicio: "2026-12-10", dataFim: "2026-12-09" }).join()).toMatch(/antes da inicial/);
  });

  it("limita folgas a 3 dias e aceita atestado retroativo", () => {
    expect(erros({ tipo: "FOLGA", dataInicio: "2026-12-01", dataFim: "2026-12-05" }).join()).toMatch(/no máximo 3 dias/);
    expect(erros({ tipo: "ATESTADO", dataInicio: "2026-11-20", dataFim: "2026-11-21" })).toEqual([]);
  });

  it("atualização de dados exige campo e valor", () => {
    expect(erros({ tipo: "ATUALIZACAO_DADOS", campo: "TELEFONE", valor: "(19) 98888-7777" })).toEqual([]);
    expect(erros({ tipo: "ATUALIZACAO_DADOS", campo: "TELEFONE", valor: "" }).length).toBeGreaterThan(0);
  });
});
