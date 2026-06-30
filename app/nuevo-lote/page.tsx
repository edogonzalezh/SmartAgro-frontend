"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearUsuario, crearPredio, crearLote } from "@/lib/api";

const FICHAS = [
  { id:"tomate_talca",  nombre:"Tomate",  zona:"Talca", emoji:"🍅" },
  { id:"lechuga_talca", nombre:"Lechuga", zona:"Talca", emoji:"🥬" },
];

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"var(--green)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid var(--green-pale,#d8ede2)" }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

export default function NuevoLotePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "", email: "",
    predio: "", ubicacion: "Talca, VII Región",
    lote: "", fichaId: FICHAS[0].id,
    fechaInicio: new Date().toISOString().split("T")[0],
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const usuario = await crearUsuario(form.nombre, form.email);
      const predio  = await crearPredio(form.predio, form.ubicacion, usuario.id);
      await crearLote({ nombre: form.lote, predioId: predio.id, fichaId: form.fichaId, fechaInicio: form.fechaInicio });
      router.push("/");
    } catch {
      setError("No se pudo crear el lote. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const fichaSeleccionada = FICHAS.find((f) => f.id === form.fichaId);

  return (
    <div style={{ background:"var(--bg-page)", minHeight:"100vh" }}>
      {/* Header */}
      <div style={{ background:"var(--green)", padding:"18px 20px" }}>
        <div style={{ maxWidth:520, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <Link href="/">
            <button style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:"var(--radius-sm)", padding:"6px 12px", fontSize:13, cursor:"pointer" }}>
              ← Volver
            </button>
          </Link>
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", color:"rgba(255,255,255,0.55)", textTransform:"uppercase" }}>SmartAgro</div>
            <h1 style={{ fontSize:18, fontWeight:700, color:"#fff", marginTop:1 }}>Nuevo lote</h1>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>
        <form onSubmit={handleSubmit}>

          <Seccion titulo="Tus datos">
            <Campo label="Nombre completo">
              <input value={form.nombre} onChange={set("nombre")} placeholder="Juan Pérez" required />
            </Campo>
            <Campo label="Correo electrónico">
              <input type="email" value={form.email} onChange={set("email")} placeholder="juan@ejemplo.cl" required />
            </Campo>
          </Seccion>

          <Seccion titulo="Predio">
            <Campo label="Nombre del predio">
              <input value={form.predio} onChange={set("predio")} placeholder="Fundo El Maule" required />
            </Campo>
            <Campo label="Ubicación">
              <input value={form.ubicacion} onChange={set("ubicacion")} />
            </Campo>
          </Seccion>

          <Seccion titulo="Cultivo">
            {/* Selector visual de cultivo */}
            <div style={{ display:"flex", gap:10, marginBottom:18 }}>
              {FICHAS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, fichaId: f.id }))}
                  style={{
                    flex:1, padding:"14px 10px",
                    borderRadius:"var(--radius-md)",
                    border: form.fichaId === f.id ? "2px solid var(--green)" : "1px solid var(--border)",
                    background: form.fichaId === f.id ? "var(--green-pale,#d8ede2)" : "var(--bg-card)",
                    cursor:"pointer", textAlign:"center",
                    transition:"all 0.15s",
                  }}
                >
                  <div style={{ fontSize:28 }}>{f.emoji}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)", marginTop:4 }}>{f.nombre}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)" }}>{f.zona}</div>
                </button>
              ))}
            </div>

            <Campo label="Nombre del lote">
              <input value={form.lote} onChange={set("lote")} placeholder="Ej: Lote 1 · Invernadero norte" required />
            </Campo>

            <Campo label="Fecha de siembra (almácigo)">
              <input type="date" value={form.fechaInicio} onChange={set("fechaInicio")} required />
            </Campo>
          </Seccion>

          {/* Resumen */}
          {form.lote && form.predio && (
            <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", padding:"14px 16px", marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Resumen</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 0" }}>
                {[
                  ["Cultivo", `${fichaSeleccionada?.emoji} ${fichaSeleccionada?.nombre}`],
                  ["Predio", form.predio],
                  ["Lote", form.lote],
                  ["Siembra", new Date(form.fechaInicio).toLocaleDateString("es-CL", { day:"numeric", month:"long", year:"numeric" })],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", flexDirection:"column" }}>
                    <span style={{ fontSize:11, color:"var(--text-3)" }}>{k}</span>
                    <span style={{ fontSize:13, fontWeight:500, color:"var(--text-1)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background:"#fde8e6", border:"1px solid #f5b8b5", borderRadius:"var(--radius-sm)", padding:"10px 14px", marginBottom:16, fontSize:14, color:"var(--red,#c0392b)" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={enviando}
            style={{ width:"100%", padding:"14px 20px", background: enviando ? "#7aad94" : "var(--green)", color:"#fff", border:"none", borderRadius:"var(--radius-md)", fontSize:16, fontWeight:700, cursor: enviando ? "default" : "pointer", letterSpacing:"0.01em" }}>
            {enviando ? "Creando calendario..." : `Crear lote y generar calendario ${fichaSeleccionada?.emoji}`}
          </button>
        </form>
      </div>
    </div>
  );
}
