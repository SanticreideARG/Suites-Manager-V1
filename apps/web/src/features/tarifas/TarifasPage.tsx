import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { TarifaRegla } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";
import { CatalogoCargos } from "./CatalogoCargos.js";

function describeAjuste(r: TarifaRegla) {
  const factor = Number(r.factor);
  const monto = Number(r.monto ?? 0);
  const parts: string[] = [];
  if (factor !== 1) {
    const d = Math.round((factor - 1) * 100);
    parts.push(d > 0 ? `×${factor.toFixed(2)} (+${d}%)` : `×${factor.toFixed(2)} (${d}%)`);
  }
  if (monto !== 0) {
    parts.push(monto > 0 ? `+$${monto.toFixed(0)}` : `-$${Math.abs(monto).toFixed(0)}`);
  }
  return parts.length > 0 ? parts.join(" ") : "sin cambio";
}

export function TarifasPage() {
  const qc = useQueryClient();
  const qReglas = useQuery({ queryKey: ["tarifas"], queryFn: api.tarifas.list });
  const qHabs = useQuery({ queryKey: ["habitaciones"], queryFn: api.habitaciones.list });
  const [editar, setEditar] = useState<TarifaRegla | null>(null);
  const [creando, setCreando] = useState(false);

  const remove = useMutation({
    mutationFn: (id: number) => api.tarifas.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });
  const toggle = useMutation({
    mutationFn: (r: TarifaRegla) => api.tarifas.update(r.id, { activa: !r.activa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas"] }),
  });

  return (
    <div className="space-y-8">
      {/* ── Precios base ─────────────────────────────────────────── */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest">
          Precio base por habitación
        </h3>
        {qHabs.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
        {qHabs.data && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#1a2b42]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.04] dark:text-white/40">
                <tr>
                  <th className="px-4 py-2 font-semibold">Habitación</th>
                  <th className="px-4 py-2 font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-right font-semibold">Precio base/noche</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {qHabs.data.map((h) => (
                  <HabRow key={h.id} hab={h} />
                ))}
                {qHabs.data.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      Sin habitaciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Reglas dinámicas ─────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-white/70 uppercase tracking-widest">
              Reglas de ajuste
            </h3>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-white/30">
              Gana la regla de mayor prioridad. Factor × precio base + monto fijo.
            </p>
          </div>
          <button
            onClick={() => setCreando(true)}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-[#0058be] dark:hover:bg-[#2170e4]"
          >
            + Regla
          </button>
        </div>

        {qReglas.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
        {qReglas.isError && <p className="text-sm text-rose-600">No se pudo cargar.</p>}

        {qReglas.data && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#1a2b42]">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-white/[0.04] dark:text-white/40">
                <tr>
                  <th className="px-4 py-2 font-semibold">Nombre</th>
                  <th className="px-4 py-2 font-semibold">Aplica</th>
                  <th className="px-4 py-2 text-right font-semibold">Ajuste</th>
                  <th className="px-4 py-2 text-right font-semibold">Prioridad</th>
                  <th className="px-4 py-2 text-center font-semibold">Activa</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {qReglas.data.map((r) => (
                  <tr key={r.id}>
                    <td
                      className="cursor-pointer px-4 py-2 font-medium text-slate-800 dark:text-white hover:underline"
                      onClick={() => setEditar(r)}
                    >
                      {r.nombre}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-white/50">
                      {r.tipo === "finde" ? "Sáb y Dom" : `${r.desde} → ${r.hasta}`}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-white/80">
                      {describeAjuste(r)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500 dark:text-white/50">
                      {r.prioridad}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => toggle.mutate(r)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.activa
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-white/30"
                        }`}
                      >
                        {r.activa ? "Sí" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${r.nombre}"?`)) remove.mutate(r.id); }}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
                {qReglas.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Sin reglas. La tarifa base se aplica tal cual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Catálogo de cargos y servicios ──────────────────────── */}
      <CatalogoCargos />

      {creando && <ReglaForm onClose={() => setCreando(false)} />}
      {editar && <ReglaForm regla={editar} onClose={() => setEditar(null)} />}
    </div>
  );
}

// ── Fila editable de precio base ────────────────────────────────
function HabRow({ hab }: { hab: { id: number; nombre: string; tipo: string; tarifaBase: string } }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(hab.tarifaBase);

  const save = useMutation({
    mutationFn: () => api.habitaciones.update(hab.id, { tarifaBase: Number(valor) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["habitaciones"] }); setEditando(false); },
  });

  return (
    <tr>
      <td className="px-4 py-2 font-medium text-slate-800 dark:text-white">{hab.nombre}</td>
      <td className="px-4 py-2 text-slate-500 dark:text-white/50">{hab.tipo}</td>
      <td className="px-4 py-2 text-right">
        {editando ? (
          <input
            type="number"
            min={0}
            step={100}
            value={valor}
            autoFocus
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save.mutate(); if (e.key === "Escape") setEditando(false); }}
            className="w-28 rounded border border-slate-300 px-2 py-1 text-right text-sm dark:border-white/20 dark:bg-white/[0.05] dark:text-white"
          />
        ) : (
          <span className="font-medium text-slate-700 dark:text-white/80">
            ${Number(hab.tarifaBase).toLocaleString("es-AR")}
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-right">
        {editando ? (
          <div className="flex justify-end gap-2">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="text-xs text-[#0058be] hover:underline">
              {save.isPending ? "…" : "Guardar"}
            </button>
            <button onClick={() => setEditando(false)} className="text-xs text-slate-400 hover:underline">
              Cancelar
            </button>
          </div>
        ) : (
          <button onClick={() => { setValor(hab.tarifaBase); setEditando(true); }} className="text-xs text-[#0058be] hover:underline">
            Editar
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Formulario de regla ──────────────────────────────────────────
function ReglaForm({ regla, onClose }: { regla?: TarifaRegla; onClose: () => void }) {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState(regla?.nombre ?? "");
  const [tipo, setTipo] = useState<"rango" | "finde">(regla?.tipo ?? "finde");
  const [desde, setDesde] = useState(regla?.desde ?? "");
  const [hasta, setHasta] = useState(regla?.hasta ?? "");
  const [modo, setModo] = useState<"factor" | "monto">(
    regla && Number(regla.monto ?? 0) !== 0 ? "monto" : "factor",
  );
  const [factor, setFactor] = useState(Number(regla?.factor ?? 1));
  const [monto, setMonto] = useState(Number(regla?.monto ?? 0));
  const [prioridad, setPrioridad] = useState(regla?.prioridad ?? 0);
  const [error, setError] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () => {
      const payload = {
        nombre,
        tipo,
        desde: tipo === "rango" ? desde : undefined,
        hasta: tipo === "rango" ? hasta : undefined,
        factor: modo === "factor" ? factor : 1,
        monto: modo === "monto" ? monto : 0,
        prioridad,
      };
      return regla
        ? api.tarifas.update(regla.id, payload)
        : api.tarifas.create({ ...payload, activa: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarifas"] });
      onClose();
    },
    onError: () => setError("Revisá los datos (para 'rango' van desde y hasta)."),
  });

  const input = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-white/20 dark:bg-white/[0.05] dark:text-white";
  const invalido = !nombre || (tipo === "rango" && (!desde || hasta <= desde));

  const factorPct = Math.round((factor - 1) * 100);
  const factorLabel = factorPct === 0 ? "sin multiplicador" : factorPct > 0 ? `+${factorPct}%` : `${factorPct}%`;
  const montoLabel = monto === 0 ? "" : monto > 0 ? ` + $${monto.toFixed(0)}` : ` − $${Math.abs(monto).toFixed(0)}`;

  return (
    <Modal titulo={regla ? "Editar regla" : "Nueva regla de tarifa"} onClose={onClose}>
      <label className="block text-sm">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className={input}
          placeholder="Ej. Temporada alta, Fin de semana…"
        />
      </label>

      <label className="block text-sm">
        Aplica a
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "rango" | "finde")} className={input}>
          <option value="finde">Fines de semana (sáb/dom)</option>
          <option value="rango">Rango de fechas (temporada/feriado)</option>
        </select>
      </label>

      {tipo === "rango" && (
        <div className="flex gap-3">
          <label className="block flex-1 text-sm">
            Desde
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={input} />
          </label>
          <label className="block flex-1 text-sm">
            Hasta
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={input} />
          </label>
        </div>
      )}

      <div>
        <span className="block text-sm text-slate-600 dark:text-white/70">Tipo de ajuste</span>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-white/30">
          Una regla es de un solo tipo: coeficiente o monto fijo, no ambos a la vez.
        </p>
        <div className="mt-1.5 flex gap-1 rounded-lg bg-slate-100 p-0.5 w-fit dark:bg-white/[0.05]">
          {(["factor", "monto"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setModo(m);
                if (m === "factor") setMonto(0);
                else setFactor(1);
              }}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                modo === m
                  ? "bg-white text-slate-800 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-white/40 dark:hover:text-white/70"
              }`}
            >
              {m === "factor" ? "Coeficiente (×)" : "Monto fijo ($)"}
            </button>
          ))}
        </div>
      </div>

      {modo === "factor" ? (
        <label className="block text-sm">
          Factor <span className="text-slate-400 text-xs">({factorLabel})</span>
          <input
            type="number"
            step={0.05}
            min={0.1}
            value={factor}
            onChange={(e) => setFactor(Number(e.target.value))}
            className={input}
          />
        </label>
      ) : (
        <label className="block text-sm">
          Monto fijo ($) <span className="text-slate-400 text-xs">(+ recargo / − descuento)</span>
          <input
            type="number"
            step={100}
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className={input}
          />
        </label>
      )}

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-white/40">
        {modo === "factor" ? (
          <>
            Precio/noche = base × factor
            <br />
            <span className="text-slate-400 dark:text-white/30">Factor 1 = sin cambio.</span>
          </>
        ) : (
          <>
            Precio/noche = base{montoLabel}
            <br />
            <span className="text-slate-400 dark:text-white/30">Monto positivo = recargo; negativo = descuento.</span>
          </>
        )}
      </div>

      <label className="block text-sm">
        Prioridad
        <input
          type="number"
          min={0}
          value={prioridad}
          onChange={(e) => setPrioridad(Number(e.target.value))}
          className={input}
        />
      </label>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        disabled={invalido || guardar.isPending}
        onClick={() => { setError(null); guardar.mutate(); }}
        className="mt-2 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-[#0058be] dark:hover:bg-[#2170e4]"
      >
        {guardar.isPending ? "Guardando…" : "Guardar"}
      </button>
    </Modal>
  );
}
