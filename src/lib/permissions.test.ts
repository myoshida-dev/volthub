import { describe, expect, it } from "vitest";

import { descreverAcesso, pode, podeAcessarRota, type UsuarioComAcesso } from "@/lib/permissions";

const colaborador: UsuarioComAcesso = { perfil: "COLABORADOR", equipe: null };
const gestor: UsuarioComAcesso = { perfil: "GESTOR", equipe: null };
const gestorRh: UsuarioComAcesso = { perfil: "GESTOR", equipe: "RH" };
const rh: UsuarioComAcesso = { perfil: "EQUIPE", equipe: "RH" };
const ti: UsuarioComAcesso = { perfil: "EQUIPE", equipe: "TI" };
const admin: UsuarioComAcesso = { perfil: "ADMIN", equipe: null };

describe("pode()", () => {
  it("nega tudo para usuário ausente", () => {
    expect(pode(null, "comunicado:publicar")).toBe(false);
    expect(pode(undefined, "usuario:gerenciar")).toBe(false);
  });

  it("colaborador não tem permissões de gestão", () => {
    for (const p of ["comunicado:publicar", "solicitacao:aprovar", "chamado:atender", "usuario:gerenciar"] as const) {
      expect(pode(colaborador, p)).toBe(false);
    }
  });

  it("gestor aprova e publica, mas não atende chamados", () => {
    expect(pode(gestor, "solicitacao:aprovar")).toBe(true);
    expect(pode(gestor, "comunicado:publicar")).toBe(true);
    expect(pode(gestor, "chamado:atender")).toBe(false);
    expect(pode(gestor, "solicitacao:gerenciar")).toBe(false);
  });

  it("equipe é definida pelo campo equipe, independente do perfil", () => {
    expect(pode(rh, "solicitacao:gerenciar")).toBe(true);
    expect(pode(rh, "chamado:atender")).toBe(false);
    expect(pode(ti, "chamado:atender")).toBe(true);
    expect(pode(ti, "solicitacao:gerenciar")).toBe(false);
    expect(pode(gestorRh, "solicitacao:gerenciar")).toBe(true);
  });

  it("admin pode tudo", () => {
    for (const p of ["comunicado:publicar", "solicitacao:aprovar", "solicitacao:gerenciar", "chamado:atender", "documento:gerenciar", "recurso:gerenciar", "usuario:gerenciar", "auditoria:ver"] as const) {
      expect(pode(admin, p)).toBe(true);
    }
  });
});

describe("podeAcessarRota()", () => {
  it("libera rotas comuns para qualquer logado", () => {
    expect(podeAcessarRota("/", colaborador)).toBe(true);
    expect(podeAcessarRota("/chamados", colaborador)).toBe(true);
    expect(podeAcessarRota("/solicitacoes/nova", colaborador)).toBe(true);
  });

  it("bloqueia rotas restritas, incluindo subrotas", () => {
    expect(podeAcessarRota("/admin", colaborador)).toBe(false);
    expect(podeAcessarRota("/admin/usuarios/123", gestor)).toBe(false);
    expect(podeAcessarRota("/chamados/fila", rh)).toBe(false);
    expect(podeAcessarRota("/solicitacoes/aprovacoes", colaborador)).toBe(false);
  });

  it("não confunde prefixos parecidos", () => {
    // "/administrativo" não é "/admin"
    expect(podeAcessarRota("/administrativo", colaborador)).toBe(true);
  });

  it("libera cada área para o perfil certo", () => {
    expect(podeAcessarRota("/chamados/fila", ti)).toBe(true);
    expect(podeAcessarRota("/solicitacoes/gestao", rh)).toBe(true);
    expect(podeAcessarRota("/solicitacoes/aprovacoes", gestor)).toBe(true);
    expect(podeAcessarRota("/admin/auditoria", admin)).toBe(true);
  });
});

describe("descreverAcesso()", () => {
  it("mostra a equipe junto do perfil", () => {
    expect(descreverAcesso(rh)).toBe("Equipe · RH");
    expect(descreverAcesso(gestorRh)).toBe("Gestor · RH");
    expect(descreverAcesso(colaborador)).toBe("Colaborador");
    expect(descreverAcesso({ perfil: "ADMIN", equipe: "TI" })).toBe("Administrador");
  });
});
