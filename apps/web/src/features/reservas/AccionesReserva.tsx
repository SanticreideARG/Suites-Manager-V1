import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../../lib/api.js";
import type { ReservaListItem, MetodoPago, PagoRegistrado } from "../../lib/api.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";
import type { Servicio, Consumo } from "../../lib/types.js";

export function AccionesReserva({
  reserva,
  habitacionNombre,
  onClose,
}: {
  reserva: ReservaListItem;
  habitacionNombre: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const refrescar = () => qc.invalidateQueries({ queryKey: ["reservas"] });
  const [generando, setGenerando] = useState(false);
  const configQ = useQuery({ queryKey: ["config"], queryFn: api.config.get });
  const [editando, setEditando] = useState(false);
  const [checkinEd, setCheckinEd] = useState(reserva.checkin);
  const [checkoutEd, setCheckoutEd] = useState(reserva.checkout);
  const [error, setError] = useState<string | null>(null);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<string | null>(null);

  const editable = reserva.estado === "reservada" || reserva.estado === "ocupada";

  // Carga react-pdf de forma diferida (chunk aparte) recién al hacer clic.
  const generarComprobante = async () => {
    setGenerando(true);
    try {
      const [{ armarDatos, descargarComprobante }, consumos] = await Promise.all([
        import("../facturacion/Comprobante.js"),
        api.consumos.list(reserva.id),
      ]);
      const cfg = configQ.data;
      const negocio = cfg
        ? {
            nombre: cfg.nombre,
            razonSocial: cfg.razonSocial ?? "",
            cuit: cfg.cuit ?? "",
            domicilio: [cfg.direccion, cfg.cp, cfg.ciudad, cfg.provincia, cfg.pais]
              .filter(Boolean)
              .join(", "),
            telefono: cfg.telefono ?? "",
            email: cfg.email ?? "",
          }
        : undefined;
      await descargarComprobante(
        armarDatos({
          reservaId: reserva.id,
          huesped: reserva.huesped ?? "—",
          habitacion: habitacionNombre,
          checkin: reserva.checkin,
          checkout: reserva.checkout,
          total: Number(reserva.total),
          extras: consumos.map((c) => ({
            descripcion: c.descripcion,
            cantidad: Number(c.cantidad),
            precioUnit: Number(c.precioUnit),
            subtotal: Number(c.subtotal),
          })),
        }),
        negocio,
      );
    } finally {
      setGenerando(false);
    }
  };

  const guardar = useMutation({
    mutationFn: () =>
      api.reservas.update(reserva.id, {
        checkin: checkinEd,
        checkout: checkoutEd,
      }),
    onSuccess: () => {
      refrescar();
      onClose();
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.esOverbooking
          ? "⚠️ Las nuevas fechas se solapan con otra reserva."
          : "No se pudieron guardar los cambios.",
      ),
  });

  const checkin = useMutation({
    mutationFn: () => api.reservas.checkin(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });
  const checkout = useMutation({
    mutationFn: () => api.reservas.checkout(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });
  const cancelar = useMutation({
    mutationFn: () => api.reservas.cancelar(reserva.id),
    onSuccess: () => {
      refrescar();
      onClose();
    },
    onError: (err) =>
      setErrorCancelar(
        err instanceof ApiError ? err.message : "No se pudo cancelar la reserva.",
      ),
  });

  // Bloqueo de mantenimiento: vista simplificada (solo eliminar el bloqueo).
  if (reserva.estado === "mantenimiento") {
    return (
      <Modal titulo="🔧 Bloqueo de mantenimiento" onClose={onClose}>
        <dl className="space-y-1 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt className="text-slate-400">Habitación</dt>
            <dd className="font-medium">{habitacionNombre}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Fechas</dt>
            <dd>
              {reserva.checkin} → {reserva.checkout}
            </dd>
          </div>
        </dl>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button
          onClick={() => {
            setError(null);
            cancelar.mutate();
          }}
          disabled={cancelar.isPending}
          className="w-full rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          {cancelar.isPending ? "Eliminando…" : "Eliminar bloqueo"}
        </button>
      </Modal>
    );
  }

  return (
    <Modal titulo={`Reserva · ${reserva.huesped ?? "—"}`} onClose={onClose}>
      {!editando ? (
        <dl className="space-y-1 text-sm text-slate-600">
          <div className="flex justify-between">
            <dt className="text-slate-400">Estado</dt>
            <dd className="font-medium">{reserva.estado}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Fechas</dt>
            <dd>
              {reserva.checkin} → {reserva.checkout}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">Total</dt>
            <dd>${Number(reserva.total).toLocaleString("es-AR")}</dd>
          </div>
        </dl>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <label className="block flex-1 text-sm">
              Check-in
              <input
                type="date"
                value={checkinEd}
                onChange={(e) => setCheckinEd(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
            <label className="block flex-1 text-sm">
              Check-out
              <input
                type="date"
                value={checkoutEd}
                onChange={(e) => setCheckoutEd(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5"
              />
            </label>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              disabled={checkoutEd <= checkinEd || guardar.isPending}
              onClick={() => {
                setError(null);
                guardar.mutate();
              }}
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {guardar.isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setError(null);
                setCheckinEd(reserva.checkin);
                setCheckoutEd(reserva.checkout);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Volver
            </button>
          </div>
        </div>
      )}

      {!editando && !confirmandoCancelar && (
        <>
          {editable && (
            <button
              onClick={() => setEditando(true)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              ✏️ Modificar fechas
            </button>
          )}

          <button
            onClick={generarComprobante}
            disabled={generando}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {generando ? "Generando…" : "📄 Descargar comprobante (PDF)"}
          </button>

          <ExtrasSection reservaId={reserva.id} />

          <PagosSection reservaId={reserva.id} totalReserva={Number(reserva.total)} />

          <div className="flex gap-2 pt-2">
            {reserva.estado === "reservada" && (
              <button
                onClick={() => checkin.mutate()}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Check-in
              </button>
            )}
            {reserva.estado === "ocupada" && (
              <button
                onClick={() => checkout.mutate()}
                className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
              >
                Check-out
              </button>
            )}
            {reserva.estado !== "checkout" && (
              <button
                onClick={() => { setErrorCancelar(null); setConfirmandoCancelar(true); }}
                className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </>
      )}

      {!editando && confirmandoCancelar && (
        <CancelarPanel
          reserva={reserva}
          pending={cancelar.isPending}
          error={errorCancelar}
          onConfirmar={() => cancelar.mutate()}
          onVolver={() => { setConfirmandoCancelar(false); setErrorCancelar(null); }}
        />
      )}
    </Modal>
  );
}

// ── Confirmación de cancelación ──────────────────────────────────────────────

function CancelarPanel({
  reserva,
  pending,
  error,
  onConfirmar,
  onVolver,
}: {
  reserva: ReservaListItem;
  pending: boolean;
  error: string | null;
  onConfirmar: () => void;
  onVolver: () => void;
}) {
  const consumosQ = useQuery({
    queryKey: ["consumos", reserva.id],
    queryFn: () => api.consumos.list(reserva.id),
  });
  const cotizacionQ = useQuery({
    queryKey: ["cotizar-cancelacion", reserva.id],
    queryFn: () => api.reservas.cotizarCancelacion(reserva.id),
    enabled: reserva.huespedId != null,
  });

  const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
  const bloqueada = reserva.estado === "ocupada" && (consumosQ.data?.length ?? 0) > 0;
  const cotizacion = cotizacionQ.data;

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 p-4 dark:border-rose-900/40">
      {bloqueada ? (
        <>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            No se puede cancelar: la reserva ya hizo check-in y tiene cargos asociados.
          </p>
          <p className="text-xs text-slate-400">
            Quitá los cargos desde "Extras" si igual necesitás cancelarla.
          </p>
          <button
            onClick={onVolver}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
          >
            Volver
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700 dark:text-slate-200">¿Confirmás cancelar esta reserva?</p>
          {cotizacion && cotizacion.monto > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Se aplicará un cargo por cancelación del {cotizacion.porcentaje}% ({fmt(cotizacion.monto)}) —
              faltan {cotizacion.diasRestantes} días para el check-in.
            </p>
          )}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onConfirmar}
              disabled={pending}
              className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {pending ? "Cancelando…" : "Sí, cancelar"}
            </button>
            <button
              onClick={onVolver}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              No, volver
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sección de extras (servicios adicionales / consumos) ────────────────────

const CATEGORIA_LABEL: Record<string, string> = {
  servicios: "Servicios",
  consumos: "Consumos",
  cargos: "Cargos",
  bonificaciones: "Bonificación",
};

function ExtrasSection({ reservaId }: { reservaId: number }) {
  const qc = useQueryClient();
  const consumosQ = useQuery({
    queryKey: ["consumos", reservaId],
    queryFn: () => api.consumos.list(reservaId),
  });
  const serviciosQ = useQuery({
    queryKey: ["servicios"],
    queryFn: api.servicios.list,
  });

  const [abierto, setAbierto] = useState(false);
  const [servicioId, setServicioId] = useState<number | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<"servicios" | "consumos" | "cargos" | "bonificaciones">("servicios");
  const [cantidad, setCantidad] = useState("1");
  const [precioUnit, setPrecioUnit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const serviciosActivos = (serviciosQ.data ?? []).filter((s) => s.activo);

  const aplicarServicio = (id: number | "") => {
    setServicioId(id);
    const s = serviciosActivos.find((x) => x.id === id);
    if (s) {
      setDescripcion(s.nombre);
      setPrecioUnit(s.precio);
      setCategoria(s.categoria);
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["consumos", reservaId] });
    qc.invalidateQueries({ queryKey: ["reservas"] });
  };

  const agregar = useMutation({
    mutationFn: () =>
      api.consumos.create({
        reservaId,
        servicioId: servicioId === "" ? undefined : servicioId,
        descripcion,
        categoria,
        cantidad: Number(cantidad),
        precioUnit: Number(precioUnit),
      }),
    onSuccess: () => {
      refrescar();
      setAbierto(false);
      setServicioId("");
      setDescripcion("");
      setCategoria("servicios");
      setCantidad("1");
      setPrecioUnit("");
      setError(null);
    },
    onError: () => setError("No se pudo agregar el cargo."),
  });

  const quitar = useMutation({
    mutationFn: (id: number) => api.consumos.remove(id),
    onSuccess: refrescar,
  });

  const consumos = consumosQ.data ?? [];
  const totalExtras = consumos.reduce(
    (acc, c) => acc + (c.categoria === "bonificaciones" ? -Number(c.subtotal) : Number(c.subtotal)),
    0,
  );
  const subtotal = (Number(cantidad) || 0) * (Number(precioUnit) || 0);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          🧾 Extras{totalExtras !== 0 ? ` · ${totalExtras < 0 ? "−" : ""}${fmt(Math.abs(totalExtras))}` : ""}
        </span>
        {!abierto && (
          <button
            onClick={() => setAbierto(true)}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
          >
            + Agregar cargo
          </button>
        )}
      </div>

      {consumos.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {consumos.map((c: Consumo) => {
            const esBonificacion = c.categoria === "bonificaciones";
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{c.descripcion}</span>
                  <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                  </span>
                  <div className="text-xs text-slate-400">
                    {c.cantidad} × {fmt(Number(c.precioUnit))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${esBonificacion ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {esBonificacion ? "−" : ""}{fmt(Number(c.subtotal))}
                  </span>
                  <button
                    onClick={() => quitar.mutate(c.id)}
                    disabled={quitar.isPending}
                    className="text-rose-500 hover:text-rose-600 disabled:opacity-50"
                    aria-label="Quitar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {abierto && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Del catálogo (opcional)</span>
            <select
              value={servicioId}
              onChange={(e) => aplicarServicio(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Cargo personalizado…</option>
              {serviciosActivos.map((s: Servicio) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({fmt(Number(s.precio))}/{s.unidad})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Descripción</span>
            <input
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Desayuno, transfer, lavandería…"
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as typeof categoria)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              {Object.entries(CATEGORIA_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {categoria === "bonificaciones" && (
              <span className="mt-1 block text-xs text-emerald-600 dark:text-emerald-400">
                Esta categoría resta del total de la reserva.
              </span>
            )}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Cantidad</span>
              <input
                type="number" min={1} step={1}
                value={cantidad}
                onChange={(e) => setCantidad(String(Math.max(1, Math.floor(Number(e.target.value)))))}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Precio unitario ($)</span>
              <input
                type="number" min={0} step={0.01}
                value={precioUnit}
                onChange={(e) => setPrecioUnit(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          {subtotal > 0 && (
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Subtotal: {fmt(subtotal)}
            </p>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex gap-2">
            <button
              disabled={!descripcion || !precioUnit || subtotal <= 0 || agregar.isPending}
              onClick={() => { setError(null); agregar.mutate(); }}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {agregar.isPending ? "Agregando…" : "Confirmar cargo"}
            </button>
            <button
              onClick={() => { setAbierto(false); setError(null); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sección de pagos ─────────────────────────────────────────────────────────

const TIPO_ICONO: Record<string, string> = {
  efectivo: "💵", transferencia: "🏦", tarjeta: "💳", qr: "📱", billetera: "👜",
};

function PagosSection({ reservaId, totalReserva }: { reservaId: number; totalReserva: number }) {
  const qc = useQueryClient();
  const pagosQ = useQuery({
    queryKey: ["pagos", reservaId],
    queryFn: () => api.pagos.list(reservaId),
  });
  const metodosQ = useQuery({
    queryKey: ["metodos-pago"],
    queryFn: api.metodosPago.list,
  });

  const [abierto, setAbierto] = useState(false);
  const [metodoId, setMetodoId] = useState<number | "">("");
  const [montoBase, setMontoBase] = useState("");
  const [montoExtras, setMontoExtras] = useState("0");
  const [referencia, setReferencia] = useState("");
  const [errPago, setErrPago] = useState<string | null>(null);

  const metodosActivos = (metodosQ.data ?? []).filter((m) => m.activo);
  const metodoSel = metodosActivos.find((m) => m.id === Number(metodoId)) ?? null;

  const base = Number(montoBase) || 0;
  const extras = Number(montoExtras) || 0;
  const recargo = metodoSel ? Number(metodoSel.recargoPct) : 0;
  const total = Math.round((base + extras) * (1 + recargo / 100) * 100) / 100;

  const registrar = useMutation({
    mutationFn: () => {
      if (!metodoId || !montoBase) throw new Error();
      return api.pagos.registrar({
        reservaId,
        metodoId: Number(metodoId),
        montoBase: base,
        montoExtras: extras,
        referencia: referencia || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pagos", reservaId] });
      setAbierto(false);
      setMetodoId("");
      setMontoBase("");
      setMontoExtras("0");
      setReferencia("");
      setErrPago(null);
    },
    onError: () => setErrPago("No se pudo registrar el pago."),
  });

  const pagos = pagosQ.data ?? [];
  const totalPagado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const pendiente = Math.max(0, totalReserva - totalPagado);
  const pct = totalReserva > 0 ? Math.min(100, (totalPagado / totalReserva) * 100) : 0;
  const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
          💰 Pagos
        </span>
        {!abierto && (
          <button
            onClick={() => setAbierto(true)}
            className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700 dark:bg-slate-600"
          >
            + Registrar pago
          </button>
        )}
      </div>

      {/* Barra de saldo */}
      {totalReserva > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Cobrado: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalPagado)}</span></span>
            <span>Total: <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(totalReserva)}</span></span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-amber-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {pendiente > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Pendiente: {fmt(pendiente)}
            </p>
          )}
          {pendiente === 0 && totalPagado > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ Saldo completo</p>
          )}
        </div>
      )}

      {/* Lista de pagos existentes */}
      {pagos.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
          {pagos.map((p) => (
            <PagoItem key={p.id} pago={p} metodos={metodosQ.data ?? []} />
          ))}
        </div>
      )}

      {/* Formulario inline */}
      {abierto && (
        <div className="border-t border-slate-100 dark:border-slate-700 p-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Método de pago</span>
            <select
              value={metodoId}
              onChange={(e) => setMetodoId(e.target.value === "" ? "" : Number(e.target.value))}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Seleccioná un método…</option>
              {metodosActivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {TIPO_ICONO[m.tipo] ?? "💰"} {m.nombre}
                  {Number(m.recargoPct) > 0 ? ` (+${Number(m.recargoPct).toFixed(2)}%)` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Monto base ($)</span>
              <input
                type="number" min={0} step={0.01}
                value={montoBase}
                onChange={(e) => setMontoBase(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600 dark:text-slate-300">Extras ($)</span>
              <input
                type="number" min={0} step={0.01}
                value={montoExtras}
                onChange={(e) => setMontoExtras(e.target.value)}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-slate-600 dark:text-slate-300">Referencia (opcional)</span>
            <input
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="N.º transferencia, N.º cupon, etc."
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          {/* Resumen */}
          {base > 0 && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span>${(base + extras).toLocaleString("es-AR")}</span>
              </div>
              {recargo > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Recargo {recargo.toFixed(2)}%</span>
                  <span>+${((base + extras) * recargo / 100).toLocaleString("es-AR", { maximumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-1">
                <span>Total a cobrar</span>
                <span>${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          )}

          {errPago && <p className="text-xs text-rose-600">{errPago}</p>}

          <div className="flex gap-2">
            <button
              disabled={!metodoId || !montoBase || base <= 0 || registrar.isPending}
              onClick={() => { setErrPago(null); registrar.mutate(); }}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {registrar.isPending ? "Registrando…" : "Confirmar pago"}
            </button>
            <button
              onClick={() => { setAbierto(false); setErrPago(null); }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PagoItem({ pago, metodos }: { pago: PagoRegistrado; metodos: MetodoPago[] }) {
  const metodo = metodos.find((m) => m.id === pago.metodoId);
  const icono = TIPO_ICONO[metodo?.tipo ?? ""] ?? "💰";
  const fecha = new Date(pago.fecha).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span>{icono}</span>
        <div>
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {pago.metodoPago ?? "—"}
          </span>
          {pago.referencia && (
            <span className="ml-2 text-xs text-slate-400">#{pago.referencia}</span>
          )}
          <div className="text-xs text-slate-400">{fecha}</div>
        </div>
      </div>
      <span className="font-semibold text-slate-800 dark:text-slate-100">
        ${Number(pago.monto).toLocaleString("es-AR")}
      </span>
    </div>
  );
}
