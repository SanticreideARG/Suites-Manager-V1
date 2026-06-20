import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { negocio } from "../../lib/negocio.js";
import { diffDays } from "../../lib/fechas.js";

export interface DatosComprobante {
  numero: string;
  emitido: string; // YYYY-MM-DD
  huesped: string;
  habitacion: string;
  checkin: string;
  checkout: string;
  noches: number;
  tarifa: number;
  total: number;
}

const ars = (n: number) =>
  n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica", color: "#0f172a" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "2 solid #0f172a",
    paddingBottom: 12,
    marginBottom: 20,
  },
  negocio: { fontSize: 16, fontWeight: "bold" },
  muted: { color: "#64748b", fontSize: 9, marginTop: 2 },
  tituloDoc: { fontSize: 20, fontWeight: "bold", textAlign: "right" },
  meta: { fontSize: 9, color: "#64748b", textAlign: "right", marginTop: 4 },
  seccion: { marginBottom: 18 },
  etiqueta: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 },
  valor: { fontSize: 11 },
  fila: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  tablaHead: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
  },
  tablaRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1 solid #e2e8f0",
    fontSize: 10,
  },
  colDesc: { flex: 3 },
  colNum: { flex: 1, textAlign: "right" },
  totalBox: {
    marginTop: 16,
    alignSelf: "flex-end",
    width: 220,
  },
  totalFila: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "2 solid #0f172a",
    marginTop: 6,
    paddingTop: 6,
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 8,
  },
});

export function ComprobanteDoc({ datos }: { datos: DatosComprobante }) {
  return (
    <Document title={`Comprobante ${datos.numero}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.negocio}>{negocio.nombre}</Text>
            <Text style={styles.muted}>{negocio.razonSocial}</Text>
            <Text style={styles.muted}>CUIT {negocio.cuit}</Text>
            <Text style={styles.muted}>{negocio.domicilio}</Text>
            <Text style={styles.muted}>
              {negocio.telefono} · {negocio.email}
            </Text>
          </View>
          <View>
            <Text style={styles.tituloDoc}>COMPROBANTE</Text>
            <Text style={styles.meta}>N° {datos.numero}</Text>
            <Text style={styles.meta}>Fecha: {datos.emitido}</Text>
          </View>
        </View>

        <View style={[styles.seccion, { flexDirection: "row", gap: 40 }]}>
          <View>
            <Text style={styles.etiqueta}>Huésped</Text>
            <Text style={styles.valor}>{datos.huesped}</Text>
          </View>
          <View>
            <Text style={styles.etiqueta}>Alojamiento</Text>
            <Text style={styles.valor}>{datos.habitacion}</Text>
          </View>
        </View>

        <View style={[styles.seccion, { flexDirection: "row", gap: 40 }]}>
          <View>
            <Text style={styles.etiqueta}>Check-in</Text>
            <Text style={styles.valor}>{datos.checkin}</Text>
          </View>
          <View>
            <Text style={styles.etiqueta}>Check-out</Text>
            <Text style={styles.valor}>{datos.checkout}</Text>
          </View>
          <View>
            <Text style={styles.etiqueta}>Noches</Text>
            <Text style={styles.valor}>{datos.noches}</Text>
          </View>
        </View>

        <View>
          <View style={styles.tablaHead}>
            <Text style={styles.colDesc}>Detalle</Text>
            <Text style={styles.colNum}>Noches</Text>
            <Text style={styles.colNum}>Tarifa</Text>
            <Text style={styles.colNum}>Subtotal</Text>
          </View>
          <View style={styles.tablaRow}>
            <Text style={styles.colDesc}>
              Estadía en {datos.habitacion}
            </Text>
            <Text style={styles.colNum}>{datos.noches}</Text>
            <Text style={styles.colNum}>{ars(datos.tarifa)}</Text>
            <Text style={styles.colNum}>{ars(datos.tarifa * datos.noches)}</Text>
          </View>
        </View>

        <View style={styles.totalBox}>
          <View style={styles.totalFila}>
            <Text>Subtotal</Text>
            <Text>{ars(datos.total)}</Text>
          </View>
          <View style={styles.totalFinal}>
            <Text>TOTAL</Text>
            <Text>{ars(datos.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Comprobante no válido como factura. Documento generado por Suites Manager.
        </Text>
      </Page>
    </Document>
  );
}

/** Construye los datos del comprobante a partir de una reserva. */
export function armarDatos(input: {
  reservaId: number;
  huesped: string;
  habitacion: string;
  checkin: string;
  checkout: string;
  total: number;
}): DatosComprobante {
  const noches = Math.max(1, diffDays(input.checkin, input.checkout));
  return {
    numero: String(input.reservaId).padStart(8, "0"),
    emitido: new Date().toISOString().slice(0, 10),
    huesped: input.huesped,
    habitacion: input.habitacion,
    checkin: input.checkin,
    checkout: input.checkout,
    noches,
    tarifa: input.total / noches,
    total: input.total,
  };
}

/** Genera el PDF y dispara la descarga en el navegador. */
export async function descargarComprobante(datos: DatosComprobante) {
  const blob = await pdf(<ComprobanteDoc datos={datos} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-${datos.numero}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
