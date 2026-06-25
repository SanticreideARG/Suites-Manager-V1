import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";

function inicioDeMes(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function inicioMesSiguiente(d = new Date()): string {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-01`;
}
const ars = (n: number) => "$" + n.toLocaleString("es-AR");

export function ReportesPage() {
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(inicioMesSiguiente());
  const [exportando, setExportando] = useState(false);

  const q = useQuery({
    queryKey: ["reportes", desde, hasta],
    queryFn: () => api.reportes.resumen(desde, hasta),
    enabled: hasta > desde,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-slate-500">Desde</span>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">Hasta</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="mt-1 block rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        {hasta <= desde && (
          <p className="text-sm text-rose-600">
            El "hasta" debe ser posterior al "desde".
          </p>
        )}
        <button
          disabled={!q.data || exportando}
          onClick={async () => {
            if (!q.data) return;
            setExportando(true);
            try {
              const { exportarReporteExcel } = await import(
                "./exportarReporteExcel.js"
              );
              await exportarReporteExcel(q.data);
            } finally {
              setExportando(false);
            }
          }}
          className="ml-auto rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {exportando ? "Exportando…" : "⬇ Excel"}
        </button>
      </div>

      {q.isLoading && <p className="text-sm text-slate-400">Cargando…</p>}
      {q.isError && (
        <p className="text-sm text-rose-600">No se pudo cargar el reporte.</p>
      )}

      {q.data && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label="Ocupación" valor={`${q.data.ocupacionPct}%`} />
            <Kpi label="Ingresos" valor={ars(q.data.ingresos)} />
            <Kpi label="Reservas" valor={String(q.data.reservas)} />
            <Kpi label="Noches ocupadas" valor={String(q.data.nochesOcupadas)} />
            <Kpi label="Estadía promedio" valor={`${q.data.estadiaPromedio} n`} />
            <Kpi label="Cancelaciones" valor={String(q.data.cancelaciones)} />
          </div>

          {/* Ingresos por habitación */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Ingresos por habitación
            </h3>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Habitación</th>
                    <th className="px-4 py-2 text-right font-semibold">Reservas</th>
                    <th className="px-4 py-2 text-right font-semibold">Noches</th>
                    <th className="px-4 py-2 text-right font-semibold">Ingresos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {q.data.porHabitacion.map((r) => (
                    <tr key={r.habitacion}>
                      <td className="px-4 py-2 font-medium text-slate-800">
                        {r.habitacion}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500">
                        {r.reservas}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-500">
                        {r.noches}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-slate-700">
                        {ars(r.ingresos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Huéspedes frecuentes */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Huéspedes frecuentes (histórico)
            </h3>
            {q.data.frecuentes.length === 0 ? (
              <p className="text-sm text-slate-400">Sin datos todavía.</p>
            ) : (
              <ol className="space-y-1">
                {q.data.frecuentes.map((f, i) => (
                  <li
                    key={f.huesped}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm"
                  >
                    <span>
                      <span className="mr-2 text-slate-400">{i + 1}.</span>
                      <span className="font-medium text-slate-800">
                        {f.huesped}
                      </span>
                    </span>
                    <span className="text-slate-500">
                      {f.estadias} estadía(s) · {ars(f.total)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800">{valor}</div>
    </div>
  );
}
