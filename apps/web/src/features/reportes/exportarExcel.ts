import type { Habitacion, ReservaListItem } from "../../lib/types.js";
import { diffDays } from "../../lib/fechas.js";

const estadoLabel: Record<string, string> = {
  reservada: "Reservada",
  ocupada: "Ocupada",
  checkout: "Check-out",
  cancelada: "Cancelada",
};

/**
 * Genera un .xlsx con dos hojas (Reservas + Resumen de ingresos) a partir de
 * los datos visibles, y dispara la descarga. exceljs se carga en un chunk
 * aparte (import dinámico) para no inflar el bundle inicial.
 */
export async function exportarExcel(opts: {
  reservas: ReservaListItem[];
  habitaciones: Habitacion[];
  desde: string;
  hasta: string;
}) {
  const { default: ExcelJS } = await import("exceljs");
  const { reservas, habitaciones, desde, hasta } = opts;

  const nombreHab = new Map(habitaciones.map((h) => [h.id, h.nombre]));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suites Manager";
  wb.created = new Date();

  // ----- Hoja 1: Reservas -----
  const ws = wb.addWorksheet("Reservas");
  ws.columns = [
    { header: "Habitación", key: "habitacion", width: 18 },
    { header: "Huésped", key: "huesped", width: 26 },
    { header: "Check-in", key: "checkin", width: 13 },
    { header: "Check-out", key: "checkout", width: 13 },
    { header: "Noches", key: "noches", width: 9 },
    { header: "Estado", key: "estado", width: 13 },
    { header: "Total", key: "total", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of reservas) {
    ws.addRow({
      habitacion: nombreHab.get(r.habitacionId) ?? `#${r.habitacionId}`,
      huesped: r.huesped,
      checkin: r.checkin,
      checkout: r.checkout,
      noches: Math.max(1, diffDays(r.checkin, r.checkout)),
      estado: estadoLabel[r.estado] ?? r.estado,
      total: Number(r.total),
    });
  }
  ws.getColumn("total").numFmt = '"$"#,##0';

  // ----- Hoja 2: Resumen de ingresos por habitación -----
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Habitación", key: "habitacion", width: 18 },
    { header: "Reservas", key: "reservas", width: 10 },
    { header: "Noches", key: "noches", width: 9 },
    { header: "Ingresos", key: "ingresos", width: 14 },
  ];
  resumen.getRow(1).font = { bold: true };

  let totalGeneral = 0;
  for (const h of habitaciones) {
    const delHab = reservas.filter(
      (r) => r.habitacionId === h.id && r.estado !== "cancelada",
    );
    const noches = delHab.reduce(
      (acc, r) => acc + Math.max(1, diffDays(r.checkin, r.checkout)),
      0,
    );
    const ingresos = delHab.reduce((acc, r) => acc + Number(r.total), 0);
    totalGeneral += ingresos;
    resumen.addRow({
      habitacion: h.nombre,
      reservas: delHab.length,
      noches,
      ingresos,
    });
  }
  const filaTotal = resumen.addRow({
    habitacion: "TOTAL",
    ingresos: totalGeneral,
  });
  filaTotal.font = { bold: true };
  resumen.getColumn("ingresos").numFmt = '"$"#,##0';

  // ----- Descargar -----
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reservas_${desde}_a_${hasta}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
