"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { removeToken } from "@/lib/api";

interface HeaderProps {
  titulo: string;
  subtitulo?: string;
  volverA?: string;
  volverLabel?: string;
  extras?: React.ReactNode;
}

function saludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function Header({ titulo, subtitulo, volverA, volverLabel, extras }: HeaderProps) {
  const [ahora, setAhora] = useState(new Date());
  const [nombre, setNombre] = useState<string | null>(null);

  useEffect(() => {
    // Leer nombre del token guardado en localStorage
    const token = localStorage.getItem("smartagro_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setNombre(payload.nombre ?? payload.email ?? null);
      } catch { /* noop */ }
    }
    const interval = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fechaStr = ahora.toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long",
  });
  const horaStr = ahora.toLocaleTimeString("es-CL", {
    hour: "2-digit", minute: "2-digit",
  });

  function cerrarSesion() {
    removeToken();
    window.location.href = "/login";
  }

  return (
    <div style={{ background: "#2d6a4f", padding: "14px 20px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>

          {/* Izquierda: nav + título */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {volverA && (
              <Link href={volverA}>
                <button style={s.btnGhost}>{volverLabel ?? "← Volver"}</button>
              </Link>
            )}
            <div>
              <Link href="/" style={{ textDecoration:"none" }}><div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", cursor:"pointer" }}>SmartAgro</div></Link>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>{titulo}</h1>
              {subtitulo && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 1 }}>{subtitulo}</div>}
            </div>
          </div>

          {/* Derecha: saludo + fecha/hora + sesión */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {nombre && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>
                {saludo()}, {nombre.split(" ")[0]} 👋
              </div>
            )}
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "capitalize" }}>
              {fechaStr} · {horaStr}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {extras}
            <Link href="/"><button style={s.btnGhost}>🏠 Inicio</button></Link>
              <Link href="/asistente"><button style={s.btnGhost}>🤖 Asistente</button></Link>
              <Link href="/mis-lotes"><button style={s.btnGhost}>📋 Lotes</button></Link>
              <Link href="/calendario"><button style={s.btnGhost}>📅 Calendario</button></Link>
              <Link href="/economico"><button style={s.btnGhost}>💰 Económico</button></Link>
              <Link href="/exportar"><button style={s.btnGhost}>📄 PDF</button></Link>
              <Link href="/admin/fichas"><button style={s.btnGhost}>⚙️</button></Link>
              <button onClick={cerrarSesion} style={s.btnGhost}>Salir</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  btnGhost: {
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.25)",
    color: "#fff",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
};
