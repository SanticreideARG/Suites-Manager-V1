import { useState, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api.js";
import type { AuditLogEntry, AuditVerifyResult } from "../../lib/types.js";

const ENTIDADES = ["reservas", "huespedes", "habitaciones", "pagos", "tarifas", "usuarios"];
const ACCIONES = ["crear", "editar", "eliminar"] as const;

const ACCION_LABEL: Record<string, string> = {
  crear: "Crear",
  editar: "Editar",
  eliminar: "Eliminar",
};

const ACCION_COLOR: Record<string, string> = {
  crear: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  editar: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  eliminar: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};

export function ActividadPage() {
  const [userId, setUserId] = useState("");
  const [entidad, setEntidad] = useState("");
  const [accion, setAccion] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [verificacion, setVerificacion] = useState<AuditVerifyResult | null>(null);

  const verificar = useMutation({
    mutationFn: () => api.auditLog.verify(),
    onSuccess: setVerificacion,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["audit-log", { userId, entidad, accion, desde, hasta, q, page }],
    queryFn: () =>
      api.auditLog.list({
        userId: userId || undefined,
        entidad: entidad || undefined,
        accion: accion || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        q: q || undefined,
        page,
      }),
  });

  const usuariosQ = useQuery({
    queryKey: ["usuarios"],
    queryFn: api.usuarios.list,
  });

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  function resetFiltros() {
    setUserId("");
    setEntidad("");
    setAccion("");
    setDesde("");
    setHasta("");
    setQ("");
    setPage(1);
    setExpandedId(null);
  }

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
    setExpandedId(null);
  }

  return (
    <div className="space-y-4">
      {/* Integridad de la cadena de hashes */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Registro de actividad</h2>
          <p className="text-xs text-slate-400">
            Cada acción queda encadenada por hash (sha256) a la anterior — un cambio directo en la
            base rompería la cadena.
          </p>
        </div>
        <button
          onClick={() => verificar.mutate()}
          disabled={verificar.isPending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {verificar.isPending ? "Verificando…" : "🔒 Verificar integridad"}
        </button>
      </div>

      {verificacion && (
        <div
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            verificacion.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-400"
          }`}
        >
          {verificacion.ok
            ? `✓ Cadena íntegra: ${verificacion.filasVerificadas} filas verificadas${
                verificacion.legacySinHash > 0 ? ` (${verificacion.legacySinHash} anteriores al hash, no verificables)` : ""
              }.`
            : `⚠️ Cadena rota en la fila #${verificacion.rotoEnId} — posible edición o borrado directo en la base.`}
        </div>
      )}

      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap gap-3">
          {/* Búsqueda texto */}
          <div className="relative flex-1 min-w-48">
            <input
              type="text"
              placeholder="Buscar usuario, entidad…"
              value={q}
              onChange={(e) => handleFilterChange(() => setQ(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-8 text-sm text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <svg className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          {/* Usuario */}
          <select
            value={userId}
            onChange={(e) => handleFilterChange(() => setUserId(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Todos los usuarios</option>
            {usuariosQ.data?.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>

          {/* Entidad */}
          <select
            value={entidad}
            onChange={(e) => handleFilterChange(() => setEntidad(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Todas las entidades</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
            ))}
          </select>

          {/* Acción */}
          <select
            value={accion}
            onChange={(e) => handleFilterChange(() => setAccion(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="">Todas las acciones</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>{ACCION_LABEL[a]}</option>
            ))}
          </select>

          {/* Rango de fechas */}
          <input
            type="date"
            value={desde}
            onChange={(e) => handleFilterChange(() => setDesde(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />
          <input
            type="date"
            value={hasta}
            onChange={(e) => handleFilterChange(() => setHasta(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          />

          {(q || userId || entidad || accion || desde || hasta) && (
            <button
              onClick={resetFiltros}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Limpiar
            </button>
          )}
        </div>
        {data && (
          <p className="mt-2 text-xs text-slate-400">
            {data.total} {data.total === 1 ? "registro" : "registros"} encontrados
          </p>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {isLoading && (
          <div className="py-10 text-center text-sm text-slate-400">Cargando…</div>
        )}
        {isError && (
          <div className="py-10 text-center text-sm text-rose-500">Error al cargar el registro.</div>
        )}
        {data && data.items.length === 0 && (
          <div className="py-10 text-center text-sm text-slate-400">Sin resultados para los filtros aplicados.</div>
        )}
        {data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-3 text-left">Fecha/Hora</th>
                <th className="px-4 py-3 text-left">Usuario</th>
                <th className="px-4 py-3 text-left">Acción</th>
                <th className="px-4 py-3 text-left">Entidad</th>
                <th className="px-4 py-3 text-left">Detalle</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ← Anterior
          </button>
          <span className="text-sm text-slate-500">
            Pág. {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const diff = useMemo(() => {
    if (!entry.diff) return null;
    try {
      return JSON.parse(entry.diff) as Record<string, { antes: unknown; despues: unknown }>;
    } catch {
      return null;
    }
  }, [entry.diff]);

  const hasDiff = diff && Object.keys(diff).length > 0;
  const fecha = new Date(entry.timestamp);
  const fechaStr = fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaStr = fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <tr
        className={`border-b border-slate-100 transition-colors dark:border-slate-800 ${hasDiff ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""} ${expanded ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}
        onClick={hasDiff ? onToggle : undefined}
      >
        <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
          <div>{fechaStr}</div>
          <div className="text-xs text-slate-400">{horaStr}</div>
        </td>
        <td className="px-4 py-3">
          <div className="font-medium text-slate-800 dark:text-slate-100">{entry.userName}</div>
          <div className="text-xs text-slate-400">{entry.userEmail}</div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${ACCION_COLOR[entry.accion] ?? ""}`}>
            {ACCION_LABEL[entry.accion] ?? entry.accion}
          </span>
        </td>
        <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">
          {entry.entidad}
        </td>
        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
          {entry.entidadLabel ?? entry.entidadId ?? "—"}
        </td>
        <td className="px-2 py-3 text-slate-400">
          {hasDiff && (
            <svg className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </td>
      </tr>
      {expanded && diff && (
        <tr className="border-b border-slate-100 dark:border-slate-800">
          <td colSpan={6} className="bg-slate-50 px-6 pb-4 pt-2 dark:bg-slate-800/40">
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Campo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Antes</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400">Después</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(diff).map(([campo, { antes, despues }]) => (
                    <tr key={campo} className="border-b border-slate-100 last:border-0 dark:border-slate-700/50">
                      <td className="px-3 py-1.5 font-mono text-slate-600 dark:text-slate-300">{campo}</td>
                      <td className="px-3 py-1.5 text-rose-600 dark:text-rose-400">
                        {antes === null || antes === undefined ? <span className="italic text-slate-400">—</span> : String(antes)}
                      </td>
                      <td className="px-3 py-1.5 text-emerald-600 dark:text-emerald-400">
                        {despues === null || despues === undefined ? <span className="italic text-slate-400">—</span> : String(despues)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
