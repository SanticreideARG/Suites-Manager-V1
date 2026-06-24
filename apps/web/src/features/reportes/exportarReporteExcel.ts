import type { ReporteResumen } from "../../lib/api.js";

/**
 * Exporta un reporte a .xlsx (3 hojas: Resumen, Por habitación, Frecuentes).
 * exceljs se carga en un chunk aparte (import dinámico).
 */
export async function exportarReporteExcel(reporte: ReporteResumen) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Suites Manager";

  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Métrica", key: "k", width: 22 },
    { header: "Valor", key: "v", width: 24 },
  ];
  resumen.getRow(1).font = { bold: true };
  resumen.addRow({
    k: "Período",
    v: `${reporte.periodo.desde} a ${reporte.periodo.hasta}`,
  });
  resumen.addRow({ k: "Días", v: reporte.periodo.dias });
  resumen.addRow({ k: "Ocupación %", v: reporte.ocupacionPct });
  resumen.addRow({ k: "Ingresos", v: reporte.ingresos });
  resumen.addRow({ k: "Reservas", v: reporte.reservas });
  resumen.addRow({ k: "Noches ocupadas", v: reporte.nochesOcupadas });

  const porHab = wb.addWorksheet("Por habitación");
  porHab.columns = [
    { header: "Habitación", key: "habitacion", width: 18 },
    { header: "Reservas", key: "reservas", width: 10 },
    { header: "Noches", key: "noches", width: 10 },
    { header: "Ingresos", key: "ingresos", width: 14 },
  ];
  porHab.getRow(1).font = { bold: true };
  for (const r of reporte.porHabitacion) porHab.addRow(r);
  porHab.getColumn("ingresos").numFmt = '"$"#,##0';

  const frec = wb.addWorksheet("Frecuentes");
  frec.columns = [
    { header: "Huésped", key: "huesped", width: 26 },
    { header: "Estadías", key: "estadias", width: 10 },
    { header: "Total", key: "total", width: 14 },
  ];
  frec.getRow(1).font = { bold: true };
  for (const f of reporte.frecuentes) frec.addRow(f);
  frec.getColumn("total").numFmt = '"$"#,##0';

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte_${reporte.periodo.desde}_a_${reporte.periodo.hasta}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
