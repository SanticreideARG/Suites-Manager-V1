import { describe, it, expect } from "vitest";
import { politicaAplicable, cargoCancelacion, type PoliticaCancelacion } from "./cancelacionCalc.js";

const p7: PoliticaCancelacion = { diasMinimos: 7, porcentaje: "0", activa: true };
const p3: PoliticaCancelacion = { diasMinimos: 3, porcentaje: "30", activa: true };
const p0: PoliticaCancelacion = { diasMinimos: 0, porcentaje: "100", activa: true };
const inactiva: PoliticaCancelacion = { diasMinimos: 5, porcentaje: "50", activa: false };

describe("politicaAplicable", () => {
  it("sin políticas → null", () => {
    expect(politicaAplicable(10, [])).toBeNull();
  });
  it("elige la de mayor diasMinimos que no supere los días restantes", () => {
    expect(politicaAplicable(10, [p7, p3, p0])).toBe(p7);
    expect(politicaAplicable(5, [p7, p3, p0])).toBe(p3);
    expect(politicaAplicable(1, [p7, p3, p0])).toBe(p0);
  });
  it("ignora políticas inactivas", () => {
    expect(politicaAplicable(5, [inactiva])).toBeNull();
  });
  it("días restantes negativos (checkin ya pasó) igual matchean diasMinimos=0", () => {
    expect(politicaAplicable(-2, [p7, p3, p0])).toBe(p0);
  });
});

describe("cargoCancelacion", () => {
  it("sin política aplicable → 0", () => {
    expect(cargoCancelacion(100000, 20, [p7, p3, p0])).toEqual({ porcentaje: 0, monto: 0 });
  });
  it("aplica el porcentaje de la política vigente sobre el total", () => {
    expect(cargoCancelacion(100000, 5, [p7, p3, p0])).toEqual({ porcentaje: 30, monto: 30000 });
    expect(cargoCancelacion(100000, 1, [p7, p3, p0])).toEqual({ porcentaje: 100, monto: 100000 });
  });
});
