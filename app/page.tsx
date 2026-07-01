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
  if (dias < 0)  return { texto:`Atrasada ${Math.abs(dias)}d`, color:"#c0392b", bg:"#fde8e6" };
  if (dias === 0) return { texto:"Hoy",    color:"#c0392b", bg:"#fde8e6" };
  if (dias <= 3)  return { texto:`En ${dias}d`, color:"#e07b28", bg:"#fdefd8" };
  return              { texto:`En ${dias}d`, color:"#2d6a4f", bg:"#d8ede2" };
}

function barraColor(dias: number): string {
  if (dias <= 0) return "#c0392b";
  if (dias <= 3) return "#e07b28";
  if (dias <= 7) return "#52b788";
  return "#b8ceb8";
}

const EMOJI: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", default:"🌱" };
function emojiCultivo(fichaId: string) { return EMOJI[fichaId?.split("_")[0]] ?? EMOJI.default; }

interface Confirmando {
  loteId: string;
  etapaCodigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  notas: string;
  diffDias?: number;
}

export default function HoyPage() {
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState<Confirmando | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<{ nombre: string; diff: number } | null>(null);

  useEffect(() => {
    if (autenticado === false) { window.location.href = "/login"; return; }
    if (autenticado === true) cargar();
  }, [autenticado]);

  async function cargar() {
    obtenerLotes().then(setLotes).finally(() => setCargando(false));
  }

  function iniciarConfirmacion(loteId: string, etapaCodigo: string, nombre: string, fechaPlanificada: string) {
    const hoy = new Date().toISOString().split("T")[0];
    setConfirmando({ loteId, etapaCodigo, nombre, fechaInicio: hoy, fechaFin: hoy, notas: "" });
    setExito(null);
  }

  async function handleConfirmar() {
    if (!confirmando) return;
    setGuardando(true);
    try {
      const resultado = await confirmarEtapaConNotas(
        confirmando.loteId, confirmando.etapaCodigo,
        confirmando.fechaInicio, confirmando.fechaFin || undefined,
        confirmando.notas || undefined,
      ) as any;
      const diff = resultado?.diffDiasAplicado ?? 0;
      setExito({ nombre: confirmando.nombre, diff });
      setConfirmando(null);
      await cargar();
    } finally { setGuardando(false); }
  }

  const pendientes = lotes
    .flatMap(l => l.etapas.filter(e => !e.fechaReal).map(e => ({
      ...e, loteId: l.id, loteNombre: l.nombre, fichaId: l.fichaId,
    })))
    .sort((a,b) => diasHasta(a.fechaPlanificada) - diasHasta(b.fechaPlanificada))
    .filter(e => diasHasta(e.fechaPlanificada) <= 14);

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Labores de hoy" subtitulo="Etapas pendientes próximos 14 días" />

      <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px" }}>

        {/* Mensaje de éxito tras confirmar */}
        {exito && (
          <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#2d6a4f" }}>✅ {exito.nombre} registrada</div>
            {exito.diff !== 0 && (
              <div style={{ fontSize:13, color:"#556055", marginTop:4 }}>
                {exito.diff > 0
                  ? `El calendario se ajustó ${exito.diff} días hacia adelante.`
                  : `El calendario se adelantó ${Math.abs(exito.diff)} días.`}
              </div>
            )}
            {exito.diff === 0 && <div style={{ fontSize:13, color:"#556055", marginTop:4 }}>Sin cambios en el calendario.</div>}
          </div>
        )}

        {cargando && <p style={{ color:"#8a9e8a", textAlign:"center", padding:32 }}>Cargando...</p>}

        {!cargando && pendientes.length === 0 && (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dce8dc", padding:"32px 24px", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
            <p style={{ fontSize:16, fontWeight:600 }}>Todo al día</p>
            <p style={{ fontSize:14, color:"#8a9e8a", marginTop:6 }}>No hay labores en los próximos 14 días.</p>
          </div>
        )}

        {pendientes.length > 0 && (
          <>
            <div style={{ fontSize:12, fontWeight:700, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>
              {pendientes.length} labor{pendientes.length>1?"es":""} próxima{pendientes.length>1?"s":""}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {pendientes.map(etapa => {
                const key = `${etapa.loteId}-${etapa.etapaCodigo}`;
                const dias = diasHasta(etapa.fechaPlanificada);
                const etiq = etiquetaDia(dias);
                const barra = barraColor(dias);
                const estaConfirmando = confirmando?.loteId === etapa.loteId && confirmando?.etapaCodigo === etapa.etapaCodigo;

                return (
                  <div key={key} style={{ background:"#fff", borderRadius:10, border:"1px solid #dce8dc", overflow:"hidden", display:"flex" }}>
                    <div style={{ width:4, background:barra, flexShrink:0 }} />
                    <div style={{ flex:1, padding:"14px 16px" }}>
                      {/* Cabecera de la tarjeta */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:15, fontWeight:700, color:"#1a1f1a" }}>
                            {emojiCultivo(etapa.fichaId)} {etapa.nombre}
                          </div>
                          <div style={{ fontSize:12, color:"#8a9e8a", marginTop:2 }}>{etapa.loteNombre}</div>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, padding:"3px 9px", borderRadius:99, background:etiq.bg, color:etiq.color, whiteSpace:"nowrap", marginLeft:12 }}>
                          {etiq.texto}
                        </span>
                      </div>

                      <div style={{ fontSize:12, color:"#8a9e8a", marginTop:6 }}>
                        Planificado para el {new Date(etapa.fechaPlanificada).toLocaleDateString("es-CL",{ day:"numeric", month:"long" })}
                      </div>

                      {/* Formulario de confirmación */}
                      {estaConfirmando ? (
                        <div style={{ marginTop:14, background:"#f4f7f4", borderRadius:8, padding:"14px" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
                            ¿Cuándo la realizaste?
                          </div>

                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                            <div>
                              <label style={lbl}>Fecha de inicio</label>
                              <input type="date" value={confirmando.fechaInicio}
                                onChange={e => setConfirmando(p => p ? {...p, fechaInicio:e.target.value} : null)}
                                style={{ fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%" }} />
                            </div>
                            <div>
                              <label style={lbl}>Fecha de término</label>
                              <input type="date" value={confirmando.fechaFin}
                                onChange={e => setConfirmando(p => p ? {...p, fechaFin:e.target.value} : null)}
                                style={{ fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%" }} />
                            </div>
                          </div>

                          <div style={{ marginBottom:12 }}>
                            <label style={lbl}>Observaciones (opcional)</label>
                            <input type="text" value={confirmando.notas}
                              onChange={e => setConfirmando(p => p ? {...p, notas:e.target.value} : null)}
                              placeholder="Ej: llovió, faltó mano de obra, helada..."
                              style={{ fontSize:13, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%" }} />
                          </div>

                          <div style={{ fontSize:12, color:"#8a9e8a", marginBottom:12, padding:"8px 10px", background:"#fff", borderRadius:6, borderLeft:"3px solid #52b788" }}>
                            💡 Al guardar, el calendario se ajustará automáticamente según la fecha real que ingresaste.
                          </div>

                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={handleConfirmar} disabled={guardando}
                              style={{ flex:1, padding:"10px 0", background: guardando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                              {guardando ? "Guardando..." : "Guardar y actualizar calendario"}
                            </button>
                            <button onClick={() => setConfirmando(null)}
                              style={{ padding:"10px 14px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:8, fontSize:13, cursor:"pointer" }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => iniciarConfirmacion(etapa.loteId, etapa.etapaCodigo, etapa.nombre, etapa.fechaPlanificada)}
                          style={{ marginTop:12, padding:"9px 16px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                          Registrar cuándo la hice →
                        </button>
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

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
