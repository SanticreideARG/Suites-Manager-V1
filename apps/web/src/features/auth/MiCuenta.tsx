import { useState } from "react";
import { changePassword, changeEmail, deleteUser, signIn, signOut, useSession } from "../../lib/auth.js";
import { Modal } from "../habitaciones/NuevaHabitacion.js";

type Seccion = "password" | "email" | "eliminar";

const input = "mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

function Campo({
  label, tipo = "text", valor, onChange,
}: {
  label: string;
  tipo?: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      <input type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} className={input} />
    </label>
  );
}

/** Modal de cuenta propia. Cambiar contraseña/email o eliminar la cuenta
 *  exige re-autenticación (contraseña actual) antes de ejecutarse. */
export function MiCuenta({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const [seccion, setSeccion] = useState<Seccion>("password");
  const email = session?.user?.email ?? "";

  return (
    <Modal titulo="Mi cuenta" onClose={onClose}>
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
        {(["password", "email", "eliminar"] as Seccion[]).map((s) => (
          <button
            key={s}
            onClick={() => setSeccion(s)}
            className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${
              seccion === s
                ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {s === "password" ? "Contraseña" : s === "email" ? "Email" : "Eliminar cuenta"}
          </button>
        ))}
      </div>

      {seccion === "password" && <CambiarPassword />}
      {seccion === "email" && <CambiarEmail emailActual={email} />}
      {seccion === "eliminar" && <EliminarCuenta />}
    </Modal>
  );
}

function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(null);
    setOk(false);
    if (nueva.length < 8) return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (nueva !== confirmar) return setError("Las contraseñas no coinciden.");
    setCargando(true);
    try {
      // better-auth verifica `currentPassword` server-side: es la re-autenticación.
      const res = await changePassword({ currentPassword: actual, newPassword: nueva, revokeOtherSessions: true });
      if (res.error) setError(res.error.message ?? "No se pudo cambiar la contraseña.");
      else {
        setOk(true);
        setActual("");
        setNueva("");
        setConfirmar("");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Se verifica tu contraseña actual antes de aplicar el cambio.
      </p>
      <Campo label="Contraseña actual" tipo="password" valor={actual} onChange={setActual} />
      <Campo label="Nueva contraseña" tipo="password" valor={nueva} onChange={setNueva} />
      <Campo label="Confirmar nueva contraseña" tipo="password" valor={confirmar} onChange={setConfirmar} />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">✓ Contraseña actualizada.</p>}
      <button
        disabled={cargando || !actual || !nueva || !confirmar}
        onClick={enviar}
        className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
      >
        {cargando ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </div>
  );
}

function CambiarEmail({ emailActual }: { emailActual: string }) {
  const [password, setPassword] = useState("");
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(null);
    setOk(false);
    if (!nuevoEmail.includes("@")) return setError("Ingresá un email válido.");
    setCargando(true);
    try {
      // better-auth no exige password en /change-email: re-autenticamos acá
      // reintentando el login con la contraseña actual antes de continuar.
      const verificacion = await signIn.email({ email: emailActual, password });
      if (verificacion.error) {
        setError("Contraseña incorrecta.");
        return;
      }
      const res = await changeEmail({ newEmail: nuevoEmail });
      if (res.error) setError(res.error.message ?? "No se pudo cambiar el email.");
      else {
        setOk(true);
        setPassword("");
        setNuevoEmail("");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        Email actual: <span className="font-medium text-slate-600 dark:text-slate-300">{emailActual}</span>
      </p>
      <Campo label="Contraseña actual" tipo="password" valor={password} onChange={setPassword} />
      <Campo label="Nuevo email" tipo="email" valor={nuevoEmail} onChange={setNuevoEmail} />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">✓ Email actualizado.</p>}
      <button
        disabled={cargando || !password || !nuevoEmail}
        onClick={enviar}
        className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
      >
        {cargando ? "Guardando…" : "Cambiar email"}
      </button>
    </div>
  );
}

function EliminarCuenta() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const eliminar = async () => {
    setError(null);
    setCargando(true);
    try {
      // better-auth verifica `password` contra la cuenta server-side antes de borrar.
      const res = await deleteUser({ password });
      if (res.error) {
        setError(res.error.message ?? "No se pudo eliminar la cuenta.");
        return;
      }
      await signOut();
      window.location.href = "/";
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-rose-600">
        Esta acción es irreversible: se borra tu cuenta y perdés el acceso al panel.
      </p>
      <Campo label="Contraseña actual" tipo="password" valor={password} onChange={setPassword} />
      <label className="block text-sm">
        <span className="text-slate-600 dark:text-slate-300">Escribí ELIMINAR para confirmar</span>
        <input value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={input} />
      </label>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        disabled={cargando || !password || confirmacion !== "ELIMINAR"}
        onClick={eliminar}
        className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
      >
        {cargando ? "Eliminando…" : "Eliminar mi cuenta"}
      </button>
    </div>
  );
}
