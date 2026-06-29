import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, signOut } from "../../lib/auth.js";
import { useUi } from "../../store/ui.js";
import { usandoMock } from "../../lib/api.js";
import logo from "../../assets/suites-man-logo.png";

export function NavBar({ onOpenLogin }: { onOpenLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const { tema } = useUi();
  const navigate = useNavigate();
  const isDark = tema === "dark";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = role === "admin" || role === "gestor";
  const isCliente = role === "cliente";

  // Clases del contenedor según tema y estado de scroll
  const headerClass = isDark
    ? "bg-[rgba(11,28,48,0.7)] backdrop-blur-md border-b border-white/10"
    : scrolled
      ? "border-b border-slate-200/40 bg-white/15 backdrop-blur-md"
      : "bg-transparent";

  // Color del texto de los links según tema y scroll
  const linkClass = isDark
    ? "text-white/70 hover:text-white"
    : scrolled
      ? "text-slate-600 hover:text-slate-900"
      : "text-white/85 hover:text-white";

  const logoTextClass = isDark
    ? "text-white"
    : scrolled
      ? "text-slate-800"
      : "text-white";

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${headerClass}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-3"
        >
          <img src={logo} alt="" className="h-9 w-9 rounded-xl" />
          <span className={`text-lg font-bold transition-colors ${logoTextClass}`}>
            Suites Manager
          </span>
        </button>

        {/* Nav links (desktop) */}
        <nav className="hidden items-center gap-7 md:flex">
          {(
            [
              ["Inicio", "#", true],
              ["Alojamientos", "#alojamientos", false],
              ["Servicios", "#alojamientos", false],
              ["Contacto", "#contacto", false],
            ] as [string, string, boolean][]
          ).map(([label, href, active]) => (
            <a
              key={label}
              href={href}
              className={`relative text-sm font-medium transition-colors ${linkClass} ${
                active
                  ? "after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-[#0058be]"
                  : ""
              }`}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          {/* Toggle tema */}
          <button
            onClick={toggleTema}
            title={tema === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            className={`rounded-lg p-2 text-base transition hover:bg-white/10 ${linkClass}`}
          >
            {tema === "dark" ? "☀️" : "🌙"}
          </button>

          {usandoMock ? (
            <button
              onClick={() => navigate("/panel")}
              className="rounded-lg bg-[#0058be] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2170e4]"
            >
              Panel demo
            </button>
          ) : isStaff ? (
            <button
              onClick={() => navigate("/panel")}
              className="rounded-lg bg-[#0058be] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2170e4]"
            >
              Ir al Panel
            </button>
          ) : isCliente ? (
            <button
              onClick={() => signOut()}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${linkClass}`}
            >
              Salir
            </button>
          ) : (
            <>
              <button
                onClick={onOpenLogin}
                className={`hidden rounded-lg px-4 py-2 text-sm font-medium transition sm:block ${linkClass}`}
              >
                Iniciar sesión
              </button>
              <button
                onClick={onOpenLogin}
                className="rounded-lg bg-[#0058be] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2170e4] active:scale-[0.98]"
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
