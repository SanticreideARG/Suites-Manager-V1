import { describe, it, expect } from "vitest";
import { factorNoche, totalDesdeReglas, type ReglaTarifa } from "./tarifaCalc.js";

// 2026-06-26 = viernes, 27 = sábado, 28 = domingo, 29 = lunes
const finde: ReglaTarifa = {
  tipo: "finde",
  desde: null,
  hasta: null,
  factor: "1.5",
  monto: "0",
  prioridad: 10,
};
const temporada: ReglaTarifa = {
  tipo: "rango",
  desde: "2026-06-01",
  hasta: "2026-07-01",
  factor: "2",
  monto: "0",
  prioridad: 5,
};

describe("factorNoche", () => {
  it("sin reglas → factor 1", () => {
    expect(factorNoche("2026-06-27", [])).toBe(1);
  });
  it("finde aplica a sábado y domingo, no a días de semana", () => {
    expect(factorNoche("2026-06-27", [finde])).toBe(1.5); // sábado
    expect(factorNoche("2026-06-28", [finde])).toBe(1.5); // domingo
    expect(factorNoche("2026-06-26", [finde])).toBe(1); // viernes
  });
  it("rango aplica dentro de [desde, hasta)", () => {
    expect(factorNoche("2026-06-15", [temporada])).toBe(2);
    expect(factorNoche("2026-07-01", [temporada])).toBe(1); // hasta exclusivo
  });
  it("gana la regla de mayor prioridad", () => {
    // sábado: finde (prio 10) vs temporada (prio 5) → gana finde
    expect(factorNoche("2026-06-27", [finde, temporada])).toBe(1.5);
  });
});

describe("totalDesdeReglas", () => {
  it("sin reglas: base × noches", () => {
    const r = totalDesdeReglas(45000, "2026-06-26", "2026-06-29", []);
    expect(r).toEqual({ total: 135000, noches: 3 });
  });
  it("finde +50%: viernes normal + sábado + domingo recargados", () => {
    const r = totalDesdeReglas(45000, "2026-06-26", "2026-06-29", [finde]);
    // 45000 + 67500 + 67500
    expect(r.total).toBe(180000);
    expect(r.noches).toBe(3);
  });
  it("temporada ×2 sobre todas las noches del rango", () => {
    const r = totalDesdeReglas(30000, "2026-06-10", "2026-06-12", [temporada]);
    expect(r.total).toBe(120000); // 2 noches × 30000 × 2
  });
});
