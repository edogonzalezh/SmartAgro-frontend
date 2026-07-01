"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearUsuario, crearPredio, crearLote, obtenerFichas, type FichaCultivo } from "@/lib/api";
import { useEffect, useState as useStateF } from "react";
import { Header } from "@/components/Header";

const EMOJI_MAP: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", pimenton:"🫑", cebolla:"🧅", default:"🌱" };
function emojiCultivo(cultivo: string) { return EMOJI_MAP[cultivo?.toLowerCase()] ?? EMOJI_MAP.default; }

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function NuevoLotePage() {
  const router = useRouter();
  const [fichas, setFichas] = useStateF<FichaCultivo[]>([]);
  useEffect(()=>{ obtenerFichas().then(setFichas); },[]);
  const [form, setForm] = useState({
    nombre:"", email:"",
    predio:"", ubicacion:"Talca, VII Región",
    lote:"", fichaId:FICHAS[0].id,
    fechaInicio: new Date().toISOString().split("T")[0],
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setError(null);
    try {
      const usuario = await crearUsuario(form.nombre, form.email);
      const predio  = await crearPredio(form.predio, form.ubicacion, usuario.id);
      await crearLote({ nombre:form.lote, predioId:predio.id, fichaId:form.fichaId, fechaInicio:form.fechaInicio });
      router.push("/");
    } catch { setError("No se pudo crear el lote. Revisa tu conexión."); }
    finally { setEnviando(false); }
  }

  const fichaSeleccionada = fichas.find((f) => f.id === form.fichaId);

  return (
    <div style={{ background:"var(--bg-page)", minHeight:"100vh" }}>
      <Header titulo="Nuevo lote" volverA="/" volverLabel="← Volver" />

      <div style={{ maxWidth:580, margin:"0 auto", padding:"24px 16px" }}>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Cultivo — selector visual arriba, es lo más importante */}
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"18px 20px" }}>
            <div style={secTitulo}>Cultivo</div>
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              {FICHAS.map((f) => (
                <button key={f.id} type="button" onClick={() => setForm((p) => ({ ...p, fichaId:f.id }))}
                  style={{ flex:1, padding:"14px 10px", borderRadius:"var(--radius-md)", border: form.fichaId===f.id ? "2px solid var(--green)" : "1px solid var(--border)", background: form.fichaId===f.id ? "#d8ede2" : "var(--bg-card)", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}>
                  <div style={{ fontSize:28 }}>{f.emoji}</div>
                  <div style={{ fontSize:14, fontWeight:600, color:"var(--text-1)", marginTop:3 }}>{f.nombre}</div>
                  <div style={{ fontSize:11, color:"var(--text-3)" }}>{f.zona}</div>
                </button>
              ))}
            </div>
            {/* Nombre lote + fecha en dos columnas */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Nombre del lote">
                <input value={form.lote} onChange={set("lote")} placeholder="Ej: Lote 1 · Norte" required />
              </Campo>
              <Campo label="Fecha de siembra">
                <input type="date" value={form.fechaInicio} onChange={set("fechaInicio")} required />
              </Campo>
            </div>
          </div>

          {/* Datos personales + predio en una misma tarjeta, 2 columnas */}
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"18px 20px" }}>
            <div style={secTitulo}>Agricultor y predio</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Tu nombre">
                <input value={form.nombre} onChange={set("nombre")} placeholder="Juan Pérez" required />
              </Campo>
              <Campo label="Correo">
                <input type="email" value={form.email} onChange={set("email")} placeholder="juan@ejemplo.cl" required />
              </Campo>
              <Campo label="Nombre del predio">
                <input value={form.predio} onChange={set("predio")} placeholder="Fundo El Maule" required />
              </Campo>
              <Campo label="Ubicación">
                <input value={form.ubicacion} onChange={set("ubicacion")} />
              </Campo>
            </div>
          </div>

          {/* Resumen compacto */}
          {form.lote && form.predio && (
            <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:"var(--radius-md)", padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px" }}>
              {[
                ["Cultivo", `${fichaSeleccionada?.emoji} ${fichaSeleccionada?.nombre}`],
                ["Predio",  form.predio],
                ["Lote",    form.lote],
                ["Siembra", new Date(form.fechaInicio+"T12:00:00").toLocaleDateString("es-CL",{ day:"numeric", month:"long" })],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10, color:"#556055", textTransform:"uppercase", letterSpacing:"0.05em" }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:"#1a1f1a" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ background:"#fde8e6", border:"1px solid #f5b8b5", borderRadius:"var(--radius-sm)", padding:"10px 14px", fontSize:14, color:"#c0392b" }}>{error}</div>}

          <button type="submit" disabled={enviando}
            style={{ padding:"14px 20px", background: enviando?"#7aad94":"var(--green)", color:"#fff", border:"none", borderRadius:"var(--radius-md)", fontSize:16, fontWeight:700, cursor: enviando?"default":"pointer" }}>
            {enviando ? "Creando calendario..." : `Crear lote ${fichaSeleccionada ? emojiCultivo(fichaSeleccionada.cultivo) : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const secTitulo: React.CSSProperties = { fontSize:11, fontWeight:700, color:"var(--green)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid #d8ede2" };
