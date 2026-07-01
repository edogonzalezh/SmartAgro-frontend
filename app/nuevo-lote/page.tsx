"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { crearUsuario, crearPredio, crearLote, obtenerFichas, type FichaCultivo } from "@/lib/api";
import { Header } from "@/components/Header";

const EMOJI_MAP: Record<string,string> = {
  tomate:"🍅", lechuga:"🥬", zapallo:"🎃",
  pimenton:"🫑", cebolla:"🧅", default:"🌱"
};
function emojiCultivo(cultivo: string) {
  return EMOJI_MAP[cultivo?.toLowerCase()] ?? EMOJI_MAP.default;
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:600, color:"var(--text-2)", textTransform:"uppercase" as const, letterSpacing:"0.06em", display:"block", marginBottom:5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function NuevoLotePage() {
  const router = useRouter();
  const [fichas, setFichas] = useState<FichaCultivo[]>([]);
  const [form, setForm] = useState({
    nombre:"", email:"",
    predio:"", ubicacion:"Talca, VII Región",
    lote:"", fichaId:"",
    fechaInicio: new Date().toISOString().split("T")[0],
  });
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    obtenerFichas().then((data) => {
      setFichas(data);
      if (data.length > 0) setForm(p => ({ ...p, fichaId: data[0].id }));
    });
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setError(null);
    try {
      const usuario = await crearUsuario(form.nombre, form.email);
      const predio  = await crearPredio(form.predio, form.ubicacion, usuario.id);
      await crearLote({ nombre:form.lote, predioId:predio.id, fichaId:form.fichaId, fechaInicio:form.fechaInicio });
      router.push("/dashboard");
    } catch { setError("No se pudo crear el lote. Revisa tu conexión."); }
    finally { setEnviando(false); }
  }

  const fichaSeleccionada = fichas.find(f => f.id === form.fichaId);

  return (
    <div style={{ background:"var(--bg-page,#f4f7f4)", minHeight:"100vh" }}>
      <Header titulo="Nuevo lote" volverA="/" volverLabel="← Volver" />

      <div style={{ maxWidth:580, margin:"0 auto", padding:"24px 16px" }}>
        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Cultivo */}
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:16, padding:"18px 20px" }}>
            <div style={secTitulo}>Cultivo</div>

            {fichas.length === 0 && (
              <p style={{ fontSize:13, color:"#8a9e8a", marginBottom:16 }}>Cargando cultivos...</p>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:16 }}>
              {fichas.map(f => (
                <button key={f.id} type="button" onClick={() => setForm(p => ({ ...p, fichaId:f.id }))}
                  style={{
                    padding:"8px 6px",
                    borderRadius:8,
                    border: form.fichaId===f.id ? "2px solid #2d6a4f" : "1px solid #dce8dc",
                    background: form.fichaId===f.id ? "#d8ede2" : "#fff",
                    cursor:"pointer", textAlign:"center" as const, transition:"all 0.15s",
                  }}>
                  <div style={{ fontSize:20 }}>{emojiCultivo(f.cultivo)}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1a1f1a", marginTop:2, lineHeight:1.2 }}>{f.nombre}</div>
                  <div style={{ fontSize:9, color:"#8a9e8a" }}>{f.zona}</div>
                </button>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Nombre del lote">
                <input value={form.lote} onChange={set("lote")} placeholder="Ej: Lote 1 · Norte" required style={inp} />
              </Campo>
              <Campo label="Fecha de siembra">
                <input type="date" value={form.fechaInicio} onChange={set("fechaInicio")} required style={inp} />
              </Campo>
            </div>
          </div>

          {/* Agricultor y predio */}
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:16, padding:"18px 20px" }}>
            <div style={secTitulo}>Agricultor y predio</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Tu nombre">
                <input value={form.nombre} onChange={set("nombre")} placeholder="Juan Pérez" required style={inp} />
              </Campo>
              <Campo label="Correo">
                <input type="email" value={form.email} onChange={set("email")} placeholder="juan@ejemplo.cl" required style={inp} />
              </Campo>
              <Campo label="Nombre del predio">
                <input value={form.predio} onChange={set("predio")} placeholder="Fundo El Maule" required style={inp} />
              </Campo>
              <Campo label="Ubicación">
                <input value={form.ubicacion} onChange={set("ubicacion")} style={inp} />
              </Campo>
            </div>
          </div>

          {/* Resumen */}
          {form.lote && form.predio && fichaSeleccionada && (
            <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:10, padding:"12px 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px" }}>
              {[
                ["Cultivo", `${emojiCultivo(fichaSeleccionada.cultivo)} ${fichaSeleccionada.nombre}`],
                ["Predio",  form.predio],
                ["Lote",    form.lote],
                ["Siembra", new Date(form.fechaInicio+"T12:00:00").toLocaleDateString("es-CL",{ day:"numeric", month:"long" })],
              ].map(([k,v]) => (
                <div key={k}>
                  <div style={{ fontSize:10, color:"#556055", textTransform:"uppercase" as const, letterSpacing:"0.05em" }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:500, color:"#1a1f1a" }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background:"#fde8e6", border:"1px solid #f5b8b5", borderRadius:6, padding:"10px 14px", fontSize:14, color:"#c0392b" }}>{error}</div>
          )}

          <button type="submit" disabled={enviando || !form.fichaId}
            style={{ padding:"14px 20px", background: enviando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer" }}>
            {enviando ? "Creando calendario..." : `Crear lote ${fichaSeleccionada ? emojiCultivo(fichaSeleccionada.cultivo) : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}

const secTitulo: React.CSSProperties = { fontSize:11, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:14, paddingBottom:8, borderBottom:"1px solid #d8ede2" };
const inp: React.CSSProperties = { fontSize:14, padding:"9px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%", background:"#fff" };
