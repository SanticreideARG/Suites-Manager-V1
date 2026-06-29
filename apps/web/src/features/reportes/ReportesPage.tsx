import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { api } from "../../lib/api.js";

// ── Utilidades ───────────────────────────────────────────────────
function inicioDeMes(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function inicioMesSiguiente(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`;
}
function mesAnterior(ref = new Date()): [string, string] {
  const d = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return [inicioDeMes(d), inicioMesSiguiente(d)];
}
function mismoMesAnnoAnterior(ref = new Date()): [string, string] {
  const d = new Date(ref.getFullYear() - 1, ref.getMonth(), 1);
  return [inicioDeMes(d), inicioMesSiguiente(d)];
}
const ars = (n: number) =>
  "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
function delta(a: number, b: number) {
  if (b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}
function fmtPeriodo(desde: string, hasta: string) {
  const d = new Date(desde + "T00:00:00");
  const h = new Date(hasta + "T00:00:00");
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  if (d.getMonth() !== h.getMonth() || d.getFullYear() !== h.getFullYear()) {
    return `${meses[d.getMonth()]} ${d.getFullYear()} – ${meses[h.getMonth()-1] ?? meses[11]} ${h.getFullYear()}`;
  }
  return `${meses[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Componentes aux ───────────────────────────────────────────────
function Kpi({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-slate-100">{valor}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function Delta({ val }: { val: number | null }) {
  if (val === null) return <span className="text-xs text-slate-400">—</span>;
  const pos = val >= 0;
  return (
    <span className={`text-xs font-medium ${pos ? "text-emerald-600" : "text-rose-500"}`}>
      {pos ? "▲" : "▼"} {Math.abs(val)}%
    </span>
  );
}

// ── ReportesPage ─────────────────────────────────────────────────
export function ReportesPage() {
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(inicioMesSiguiente());
  const [exportando, setExportando] = useState(false);
  const [mostrarComp, setMostrarComp] = useState(false);
  const [horizonte, setHorizonte] = useState<30 | 60 | 90>(30);

  // Comparativa: período 2 (por defecto: mes anterior)
  const [comp2, setComp2] = useState<[string, string]>(mesAnterior());

  const q = useQuery({
    queryKey: ["reportes", desde, hasta],
    queryFn: () => api.reportes.resumen(desde, hasta),
    enabled: hasta > desde,
  });

  const qComp = useQuery({
    queryKey: ["reportes.comp", desde, hasta, ...comp2],
    queryFn: () => api.reportes.comparativa(desde, hasta, comp2[0], comp2[1]),
    enabled: mostrarComp && hasta > desde,
  });

  const qForecast = useQuery({
    queryKey: ["reportes.forecast", horizonte],
    queryFn: () => api.reportes.forecast(horizonte),
  });

  return (
    <div className="space-y-8 print:space-y-6">
      {/* ── Controles (ocultos al imprimir) ── */}
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500 dark:text-slate-400">Hasta</span>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-2 py-1.5 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
        </label>
        {hasta <= desde && <p className="text-sm text-rose-600">El "hasta" debe ser posterior al "desde".</p>}

        <div className="ml-auto flex items-center gap-2">
          <button
            disabled={!q.data || exportando}
            onClick={async () => {
              if (!q.data) return;
              setExportando(true);
              try { const { exportarReporteExcel } = await import("./exportarReporteExcel.js"); await exportarReporteExcel(q.data); }
              finally { setExportando(false); }
            }}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            {exportando ? "Exportando…" : "⬇ Excel"}
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
          >
            🖨 PDF
          </button>
          <button
            onClick={() => setMostrarComp((v) => !v)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              mostrarComp
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            ⇄ Comparar
          </button>
        </div>
      </div>

      {/* Título imprimible */}
      <div className="hidden print:block">
        <h2 className="text-xl font-bold text-slate-800">Reporte de período</h2>
        <p className="text-sm text-slate-500">{desde} → {hasta}</p>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {q.isError && <p className="text-sm text-rose-600">No se pudo cargar el reporte.</p>}

      {q.data && (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Ocupación" valor={`${q.data.ocupacionPct}%`} />
            <Kpi label="Ingresos" valor={ars(q.data.ingresos)} />
            <Kpi label="Reservas" valor={String(q.data.reservas)} />
            <Kpi label="Noches ocupadas" valor={String(q.data.nochesOcupadas)} />
            <Kpi label="Estadía promedio" valor={`${q.data.estadiaPromedio} n`} />
            <Kpi label="Cancelaciones" valor={String(q.data.cancelaciones)} />
          </div>

          {/* ── Gráfico: ingresos por alojamiento ── */}
          {q.data.porHabitacion.some((h) => h.ingresos > 0) && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ingresos por alojamiento
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={q.data.porHabitacion} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <XAxis dataKey="habitacion" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v) => [ars(Number(v)), "Ingresos"]} />
                  <Bar dataKey="ingresos" radius={[4, 4, 0, 0]}>
                    {q.data.porHabitacion.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#0f172a" : "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* ── Gráfico: ocupación % por alojamiento ── */}
          {q.data.porHabitacion.some((h) => h.ocupacionPct > 0) && (
            <section>
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ocupación por alojamiento
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={q.data.porHabitacion} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <XAxis dataKey="habitacion" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
                  <Tooltip formatter={(v) => [`${v}%`, "Ocupación"]} />
                  <Bar dataKey="ocupacionPct" radius={[4, 4, 0, 0]}>
                    {q.data.porHabitacion.map((row, i) => (
                      <Cell
                        key={i}
                        fill={
                          row.ocupacionPct >= 75 ? "#10b981"
                          : row.ocupacionPct >= 40 ? "#f59e0b"
                          : "#e2e8f0"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="mt-1 text-xs text-slate-400">Verde ≥ 75% · Amarillo ≥ 40% · Gris &lt; 40%</p>
            </section>
          )}

          {/* ── Tabla por habitación ── */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Detalle por alojamiento
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Alojamiento</th>
                    <th className="px-4 py-2 font-semibold">Tipo</th>
                    <th className="px-4 py-2 text-right font-semibold">Reservas</th>
                    <th className="px-4 py-2 text-right font-semibold">Noches</th>
                    <th className="px-4 py-2 text-right font-semibold">Ocup.</th>
                    <th className="px-4 py-2 text-right font-semibold">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {q.data.porHabitacion.map((r) => (
                    <tr key={r.habitacion}>
                      <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{r.habitacion}</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{r.tipo}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{r.reservas}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{r.noches}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{r.ocupacionPct}%</td>
                      <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{ars(r.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Huéspedes frecuentes ── */}
          {q.data.frecuentes.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Huéspedes frecuentes (histórico)
              </h3>
              <ol className="space-y-1">
                {q.data.frecuentes.map((f, i) => (
                  <li key={f.huesped}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span>
                      <span className="mr-2 text-slate-400">{i + 1}.</span>
                      <span className="font-medium text-slate-800 dark:text-slate-100">{f.huesped}</span>
                    </span>
                    <span className="text-slate-500">{f.estadias} estadía(s) · {ars(f.total)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </>
      )}

      {/* ── Comparativa ── */}
      {mostrarComp && (
        <section className="print:hidden rounded-xl border border-sky-200 bg-sky-50/50 p-5 dark:border-sky-800 dark:bg-sky-950/30">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Comparativa — período actual vs.
            </h3>
            <div className="flex gap-1">
              {[
                { label: "Mes anterior", fn: mesAnterior },
                { label: "Mismo mes año ant.", fn: mismoMesAnnoAnterior },
              ].map((p) => (
                <button key={p.label}
                  onClick={() => setComp2(p.fn())}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <input type="date" value={comp2[0]} onChange={(e) => setComp2([e.target.value, comp2[1]])}
                className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800" />
              <span>→</span>
              <input type="date" value={comp2[1]} onChange={(e) => setComp2([comp2[0], e.target.value])}
                className="rounded border border-slate-300 px-2 py-1 dark:border-slate-600 dark:bg-slate-800" />
            </div>
          </div>

          {qComp.isLoading && <p className="text-sm text-slate-400">Cargando comparativa…</p>}
          {qComp.data && (() => {
            const { metricas, periodo1, periodo2 } = qComp.data;
            const rows: { label: string; key: keyof typeof metricas; fmt: (v: number) => string }[] = [
              { label: "Ingresos", key: "ingresos", fmt: ars },
              { label: "Ocupación %", key: "ocupacionPct", fmt: (v) => `${v}%` },
              { label: "Reservas", key: "reservas", fmt: String },
              { label: "Noches ocupadas", key: "nochesOcupadas", fmt: String },
              { label: "Estadía promedio", key: "estadiaPromedio", fmt: (v) => `${v} n` },
              { label: "Cancelaciones", key: "cancelaciones", fmt: String },
            ];
            return (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Métrica</th>
                      <th className="px-4 py-2 text-right font-semibold">{fmtPeriodo(periodo1.desde, periodo1.hasta)}</th>
                      <th className="px-4 py-2 text-right font-semibold">{fmtPeriodo(periodo2.desde, periodo2.hasta)}</th>
                      <th className="px-4 py-2 text-right font-semibold">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {rows.map(({ label, key, fmt }) => {
                      const [v1, v2] = metricas[key];
                      return (
                        <tr key={key}>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400">{label}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">{fmt(v1)}</td>
                          <td className="px-4 py-2 text-right text-slate-500">{fmt(v2)}</td>
                          <td className="px-4 py-2 text-right"><Delta val={delta(v1, v2)} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </section>
      )}

      {/* ── Forecast ── */}
      <section className="print:hidden">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ingresos comprometidos (próximas reservas)
          </h3>
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
            {([30, 60, 90] as const).map((d) => (
              <button key={d} onClick={() => setHorizonte(d)}
                className={`rounded px-3 py-0.5 text-xs font-medium transition ${
                  horizonte === d ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100" : "text-slate-500"
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
        </div>
        {qForecast.isLoading && <p className="text-sm text-slate-400">Cargando forecast…</p>}
        {qForecast.data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30 sm:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Ingresos comprometidos
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                {ars(qForecast.data.ingresosFuturos)}
              </p>
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">
                {qForecast.data.reservasFuturas} reservas · próximos {horizonte} días
              </p>
            </div>
            {qForecast.data.porHabitacion.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:col-span-2">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Alojamiento</th>
                      <th className="px-4 py-2 text-right font-semibold">Reservas</th>
                      <th className="px-4 py-2 text-right font-semibold">Noches</th>
                      <th className="px-4 py-2 text-right font-semibold">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {qForecast.data.porHabitacion.map((r) => (
                      <tr key={r.habitacion}>
                        <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{r.habitacion}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{r.reservas}</td>
                        <td className="px-4 py-2 text-right text-slate-500">{r.noches}</td>
                        <td className="px-4 py-2 text-right font-medium text-slate-700 dark:text-slate-200">{ars(r.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
