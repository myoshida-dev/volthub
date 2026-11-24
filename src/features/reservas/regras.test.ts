import { describe, expect, it } from "vitest";

import { sobrepoe, validarKmRetorno, validarPeriodo } from "@/features/reservas/regras";

const h = (hora: string) => new Date(`2026-12-01T${hora}:00-03:00`);

describe("sobrepoe()", () => {
  const reuniao = { inicio: h("10:00"), fim: h("11:00") };

  it("detecta sobreposição parcial e total", () => {
    expect(sobrepoe(reuniao, { inicio: h("10:30"), fim: h("11:30") })).toBe(true);
    expect(sobrepoe(reuniao, { inicio: h("09:00"), fim: h("12:00") })).toBe(true);
    expect(sobrepoe(reuniao, { inicio: h("10:15"), fim: h("10:45") })).toBe(true);
  });

  it("horários encostados não conflitam (intervalo semiaberto)", () => {
    expect(sobrepoe(reuniao, { inicio: h("11:00"), fim: h("12:00") })).toBe(false);
    expect(sobrepoe(reuniao, { inicio: h("09:00"), fim: h("10:00") })).toBe(false);
  });
});

describe("validarPeriodo()", () => {
  const agora = h("08:00");

  it("aceita um período válido", () => {
    expect(validarPeriodo("SALA", h("09:00"), h("10:00"), agora)).toBeNull();
  });

  it("recusa término antes do início e horários passados", () => {
    expect(validarPeriodo("SALA", h("10:00"), h("09:00"), agora)).toMatch(/depois do início/);
    expect(validarPeriodo("SALA", h("06:00"), h("07:00"), agora)).toMatch(/já passou/);
  });

  it("aplica o limite de duração por tipo de recurso", () => {
    const amanha = new Date(h("09:00").getTime() + 24 * 3600_000);
    expect(validarPeriodo("SALA", h("09:00"), amanha, agora)).toMatch(/12 horas/);
    expect(validarPeriodo("VEICULO", h("09:00"), amanha, agora)).toBeNull();
  });
});

describe("validarKmRetorno()", () => {
  it("exige km de retorno maior ou igual ao de saída", () => {
    expect(validarKmRetorno(10_000, 10_250)).toBeNull();
    expect(validarKmRetorno(10_000, 9_999)).toMatch(/menor que o de saída/);
  });

  it("desconfia de valores absurdos", () => {
    expect(validarKmRetorno(10_000, 20_000)).toMatch(/Confira/);
  });
});
