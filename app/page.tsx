"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { confirmarEtapaConNotas, obtenerLotes, type Lote } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

function diasHasta(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((new Date(fecha).getTime() - hoy.getTime()) / 86400000);
}

function etiquetaDia(dias: number): { texto: string; color: string; bg: string } {
  if (dias < 0)  return { texto: `Hace ${Math.abs(dias)}d`, color:"#c0392b", bg:"#fde8e6" };
  if (dias === 0) return { texto: "Hoy",       color:"#c0392b", bg:"#fde8e6" };
  if (dias <= 3)  return { texto: `${dias}d`,   color:"#e07b28", bg:"#fdefd8" };
  return              { texto: `${dias}d`,       color:"#2d6a4f", bg:"#d8ede2" };
}

function barraUrgencia(dias: number): string {
  if (dias <= 0) return "#c0392b";
  if (dias <= 3) return "#e07b28";
  if (dias <= 7) return "#52b788";
  return "#b8ceb8";
}

export default function HoyPage() {
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmandoId, setConfirmandoId] = useState<string|null>(null);
  const [fechaInputs, setFechaInputs] = useState<Record<string,string>>({});
  const [notasInputs, setNotasInputs] = useState<Record<string,string>>({});

  useEffect(() => {
    if (autenticado === false) { window.location.href = "/login"; return; }
    if (autenticado === true) obtenerLotes().then(setLotes).finally(() => setCargando(false));
  }, [autenticado]);

  async function handleConfirmar(loteId: string, etapaCodigo: string) {
    const key = `${loteId}-${etapaCodigo}`;
    const fecha = fechaInputs[key] ?? new Date().toISOString().split("T")[0];
    const notas = notasInputs[key];
    await confirmarEtapaConNotas(loteId, etapaCodigo, fecha, notas);
    const actualizados = await obtenerLotes();
    setLotes(actualizados);
    setConfirmandoId(null);
  }

  const pendientes = lotes
    .flatMap((l) => l.etapas.filter((e) => !e.fechaReal).map((e) => ({ ...e, loteId: l.id, loteNombre: l.nombre })))
    .sort((a,b) => diasHasta(a.fechaPlanificada) - diasHasta(b.fechaPlanificada))
    .filter((e) => diasHasta(e.fechaPlanificada) <= 14);

  return (
    <div style={{ background:"var(--bg-page)", minHeight:"100vh" }}>
      <Header
        titulo="¿Qué hacer hoy?"
        extras={
          <>
            <Link href="/nuevo-lote"><button style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>+ Nuevo lote</button></Link>
            <Link href="/mis-lotes"><button style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>📋 Mis lotes</button></Link>
            <Link href="/calendario"><button style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>📅 Calendario</button></Link>
          </>
        }
      />

      {/* Contenido */}
      <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px" }}>
        {cargando && <p style={{ color:"var(--text-3)", textAlign:"center", padding:32 }}>Cargando...</p>}

        {!cargando && pendientes.length === 0 && (
          <div style={{ background:"var(--bg-card)", borderRadius:"var(--radius-lg)", padding:"32px 24px", textAlign:"center", border:"1px solid var(--border)" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <p style={{ fontSize:16, fontWeight:600, color:"var(--text-1)" }}>Todo al día</p>
            <p style={{ fontSize:14, color:"var(--text-3)", marginTop:6 }}>No tienes etapas en los próximos 14 días.</p>
          </div>
        )}

        {pendientes.length > 0 && (
          <>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--text-2)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
              {pendientes.length} etapa{pendientes.length>1?"s":""} próxima{pendientes.length>1?"s":""}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {pendientes.map((etapa) => {
                const key = `${etapa.loteId}-${etapa.etapaCodigo}`;
                const dias = diasHasta(etapa.fechaPlanificada);
                const etiq = etiquetaDia(dias);
                const barra = barraUrgencia(dias);
                const activo = confirmandoId === key;
                return (
                  <div key={key} style={{ background:"var(--bg-card)", borderRadius:"var(--radius-md)", border:"1px solid var(--border)", overflow:"hidden", display:"flex" }}>
                    {/* Barra de urgencia */}
                    <div style={{ width:4, background:barra, flexShrink:0 }} />
                    <div style={{ flex:1, padding:"14px 16px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:600, color:"var(--text-1)" }}>{etapa.nombre}</div>
                          <div style={{ fontSize:13, color:"var(--text-3)", marginTop:2 }}>{etapa.loteNombre}</div>
                        </div>
                        <span style={{ fontSize:12, fontWeight:600, padding:"3px 9px", borderRadius:99, background:etiq.bg, color:etiq.color, whiteSpace:"nowrap", marginLeft:12 }}>
                          {etiq.texto}
                        </span>
                      </div>
                      <div style={{ fontSize:13, color:"var(--text-2)", marginTop:8 }}>
                        Planificado: {new Date(etapa.fechaPlanificada).toLocaleDateString("es-CL", { day:"numeric", month:"long" })}
                      </div>
                      {!activo ? (
                        <button
                          onClick={() => setConfirmandoId(key)}
                          style={{ marginTop:12, padding:"8px 16px", background:"var(--green)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:600 }}>
                          Confirmar realizado
                        </button>
                      ) : (
                        <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                            <input type="date" value={fechaInputs[key] ?? new Date().toISOString().split("T")[0]}
                              onChange={(e) => setFechaInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                              style={{ flex:1, minWidth:140, fontSize:14, padding:"8px 10px" }} />
                          </div>
                          <input type="text" placeholder="Notas opcionales (ej: llovió, mano de obra escasa...)"
                            value={notasInputs[key] ?? ""}
                            onChange={(e) => setNotasInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                            style={{ fontSize:13, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%" }} />
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={() => handleConfirmar(etapa.loteId, etapa.etapaCodigo)}
                              style={{ padding:"8px 16px", background:"var(--green)", color:"#fff", border:"none", borderRadius:"var(--radius-sm)", fontSize:13, fontWeight:600 }}>
                              Guardar
                            </button>
                            <button onClick={() => setConfirmandoId(null)}
                              style={{ padding:"8px 12px", background:"transparent", color:"var(--text-3)", border:"1px solid var(--border)", borderRadius:"var(--radius-sm)", fontSize:13 }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
