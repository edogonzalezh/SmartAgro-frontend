"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerPredios, actualizarLote, eliminarLote } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

const COLORES_CULTIVO: Record<string,{ bg:string; barra:string; texto:string }> = {
  tomate:  { bg:"#fde8e6", barra:"#e07b28", texto:"#712B13" },
  lechuga: { bg:"#d8ede2", barra:"#2d6a4f", texto:"#085041" },
  zapallo: { bg:"#fdefd8", barra:"#a0620a", texto:"#633806" },
  default: { bg:"#eef2ee", barra:"#52b788", texto:"#085041" },
};
function coloresCultivo(fichaId: string) {
  return COLORES_CULTIVO[fichaId?.split("_")[0]] ?? COLORES_CULTIVO.default;
}

const EMOJI: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", default:"🌱" };
function emojiCultivo(fichaId: string) { return EMOJI[fichaId?.split("_")[0]] ?? EMOJI.default; }
function nombreCultivo(fichaId: string) {
  const s = fichaId?.split("_")[0] ?? "";
  return s.charAt(0).toUpperCase()+s.slice(1);
}

function diffDias(a: Date, b: Date) { return Math.round((b.getTime()-a.getTime())/86400000); }
function fmt(d: Date) { return d.toLocaleDateString("es-CL",{ day:"numeric", month:"short" }); }
function fmtMes(d: Date) { return d.toLocaleDateString("es-CL",{ month:"short", year:"2-digit" }); }

function pct(etapas: any[]): number {
  if (!etapas.length) return 0;
  return Math.round(etapas.filter(e=>e.fechaReal).length/etapas.length*100);
}
function proximaEtapa(etapas: any[]) {
  return etapas.filter(e=>!e.fechaReal).sort((a,b)=>new Date(a.fechaPlanificada).getTime()-new Date(b.fechaPlanificada).getTime())[0]??null;
}
function diasHasta(fecha: string) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((new Date(fecha).getTime()-hoy.getTime())/86400000);
}

type Vista = "lista" | "gantt";

export default function MisLotesPage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [predios, setPredios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>("lista");
  const [zoom, setZoom] = useState(1);
  const [editandoId, setEditandoId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState({ nombre:"", notas:"" });
  const [eliminandoId, setEliminandoId] = useState<string|null>(null);
  const [mensaje, setMensaje] = useState<string|null>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  useEffect(()=>{
    if (autenticado===false) { router.push("/login"); return; }
    if (autenticado===true) cargar();
  },[autenticado]);

  async function cargar() {
    setCargando(true);
    const data = await obtenerPredios();
    setPredios(data);
    // Seleccionar todos por defecto para el Gantt
    const ids = new Set(data.flatMap((p:any)=>p.lotes.map((l:any)=>l.id)) as string[]);
    setSeleccionados(ids);
    setCargando(false);
  }

  function mostrarMsg(m:string){ setMensaje(m); setTimeout(()=>setMensaje(null),3000); }

  async function guardarEdicion(loteId:string) {
    await actualizarLote(loteId, editForm);
    setEditandoId(null); mostrarMsg("Lote actualizado"); cargar();
  }
  async function confirmarEliminar(loteId:string) {
    await eliminarLote(loteId);
    setEliminandoId(null); mostrarMsg("Lote eliminado"); cargar();
  }

  function toggleSeleccion(id:string) {
    setSeleccionados(prev=>{
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }
  function seleccionarTodos() {
    const ids = new Set(predios.flatMap((p:any)=>p.lotes.map((l:any)=>l.id)) as string[]);
    setSeleccionados(ids);
  }
  function deseleccionarTodos() { setSeleccionados(new Set()); }

  const todosLotes = predios.flatMap((p:any)=>p.lotes.map((l:any)=>({...l, predioNombre:p.nombre})));
  const lotesGantt = todosLotes.filter(l=>seleccionados.has(l.id));

  // Calcular rango global para el Gantt
  let fechaMinG = new Date(), fechaMaxG = new Date();
  if (lotesGantt.length > 0) {
    const todasFechas = lotesGantt.flatMap((l:any)=>
      l.etapas.flatMap((e:any)=>[new Date(e.fechaPlanificada), ...(e.fechaReal?[new Date(e.fechaReal)]:[])])
    );
    fechaMinG = new Date(Math.min(...todasFechas.map(d=>d.getTime())));
    fechaMaxG = new Date(Math.max(...todasFechas.map(d=>d.getTime())));
    fechaMinG.setDate(fechaMinG.getDate()-5);
    fechaMaxG.setDate(fechaMaxG.getDate()+10);
  }
  const totalDiasG = Math.max(diffDias(fechaMinG, fechaMaxG), 1);
  const DAY_W = 6 * zoom;
  const TOTAL_W = totalDiasG * DAY_W;
  const COL_W = 200;

  // Header meses para el Gantt
  const meses: { label:string; dias:number }[] = [];
  if (lotesGantt.length > 0) {
    let cur = new Date(fechaMinG.getFullYear(), fechaMinG.getMonth(), 1);
    while (cur <= fechaMaxG) {
      const next = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
      const s = Math.max(0, diffDias(fechaMinG, cur));
      const e = Math.min(totalDiasG, diffDias(fechaMinG, next));
      meses.push({ label: fmtMes(cur), dias: e-s });
      cur = next;
    }
  }

  const hoy = new Date();
  const hoyOff = diffDias(fechaMinG, hoy);

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Mis predios y lotes" subtitulo={`${todosLotes.length} lote${todosLotes.length!==1?"s":""} activos`} />

      <div style={{ maxWidth:980, margin:"0 auto", padding:"20px 16px" }}>

        {mensaje && <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#2d6a4f", fontWeight:500 }}>✓ {mensaje}</div>}

        {/* Controles superiores */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", border:"1px solid #dce8dc", borderRadius:8, overflow:"hidden" }}>
            {(["lista","gantt"] as Vista[]).map(v=>(
              <button key={v} onClick={()=>setVista(v)}
                style={{ padding:"8px 18px", border:"none", fontSize:14, fontWeight:600, cursor:"pointer", background: vista===v?"#2d6a4f":"#fff", color: vista===v?"#fff":"#8a9e8a" }}>
                {v==="lista"?"☰ Lista":"📊 Gantt"}
              </button>
            ))}
          </div>
          <Link href="/nuevo-lote">
            <button style={{ padding:"9px 18px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>+ Nuevo lote</button>
          </Link>
        </div>

        {cargando && <p style={{color:"#888",textAlign:"center",padding:32}}>Cargando...</p>}

        {/* ═══ VISTA LISTA ═══ */}
        {!cargando && vista==="lista" && (
          <>
            {predios.length===0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dce8dc", padding:"40px 24px", textAlign:"center" }}>
                <div style={{fontSize:48,marginBottom:12}}>🌱</div>
                <p style={{fontSize:16,fontWeight:600}}>Sin lotes registrados</p>
                <p style={{fontSize:14,color:"#8a9e8a",marginTop:6}}>Crea tu primer lote para comenzar.</p>
              </div>
            )}
            {predios.map((predio:any)=>(
              <div key={predio.id} style={{ marginBottom:24 }}>
                <div style={{ borderBottom:"2px solid #dce8dc", paddingBottom:6, marginBottom:10 }}>
                  <div style={{ fontSize:16, fontWeight:700, color:"#2d6a4f" }}>🏡 {predio.nombre}</div>
                  <div style={{ fontSize:12, color:"#8a9e8a" }}>{predio.ubicacion}</div>
                </div>
                {predio.lotes.length===0 && <p style={{fontSize:13,color:"#8a9e8a",paddingLeft:8}}>Sin lotes en este predio.</p>}
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {predio.lotes.map((lote:any)=>{
                    const p = pct(lote.etapas);
                    const prox = proximaEtapa(lote.etapas);
                    const dias = prox ? diasHasta(prox.fechaPlanificada) : null;
                    const emoji = emojiCultivo(lote.fichaId);
                    const editando = editandoId===lote.id;
                    const eliminando = eliminandoId===lote.id;
                    return (
                      <div key={lote.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, overflow:"hidden" }}>
                        <div style={{ height:4, background:"#eef2ee" }}>
                          <div style={{ height:"100%", width:`${p}%`, background:p===100?"#52b788":"#2d6a4f", transition:"width 0.3s" }} />
                        </div>
                        <div style={{ padding:"14px 16px" }}>
                          {editando ? (
                            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                              <div><label style={lbl}>Nombre del lote</label><input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))} style={{ fontSize:14,padding:"8px 10px",borderRadius:6,border:"1px solid #dce8dc",width:"100%" }} /></div>
                              <div><label style={lbl}>Notas u observaciones</label><textarea value={editForm.notas} onChange={e=>setEditForm(p=>({...p,notas:e.target.value}))} rows={2} placeholder="Observaciones de este lote..." style={{ fontSize:14,padding:"8px 10px",borderRadius:6,border:"1px solid #dce8dc",width:"100%",resize:"vertical" }} /></div>
                              <div style={{ display:"flex",gap:8 }}>
                                <button onClick={()=>guardarEdicion(lote.id)} style={{ padding:"8px 16px",background:"#2d6a4f",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer" }}>Guardar</button>
                                <button onClick={()=>setEditandoId(null)} style={{ padding:"8px 16px",background:"transparent",color:"#8a9e8a",border:"1px solid #dce8dc",borderRadius:6,fontSize:13,cursor:"pointer" }}>Cancelar</button>
                              </div>
                            </div>
                          ) : eliminando ? (
                            <div style={{ background:"#fde8e6",borderRadius:8,padding:"14px 16px" }}>
                              <p style={{ fontSize:14,fontWeight:600,color:"#c0392b",marginBottom:10 }}>⚠️ ¿Eliminar "{lote.nombre}"? Esta acción no se puede deshacer.</p>
                              <div style={{ display:"flex",gap:8 }}>
                                <button onClick={()=>confirmarEliminar(lote.id)} style={{ padding:"8px 16px",background:"#c0392b",color:"#fff",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer" }}>Sí, eliminar</button>
                                <button onClick={()=>setEliminandoId(null)} style={{ padding:"8px 16px",background:"transparent",color:"#8a9e8a",border:"1px solid #dce8dc",borderRadius:6,fontSize:13,cursor:"pointer" }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                                <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                                  <span style={{ fontSize:28 }}>{emoji}</span>
                                  <div>
                                    <div style={{ fontSize:15,fontWeight:700,color:"#1a1f1a" }}>{lote.nombre}</div>
                                    <div style={{ fontSize:12,color:"#8a9e8a" }}>{emoji} {nombreCultivo(lote.fichaId)} · {predio.nombre}</div>
                                  </div>
                                </div>
                                <div style={{ display:"flex",gap:6 }}>
                                  <Link href="/calendario"><button style={btnSm}>📅</button></Link>
                                  <button onClick={()=>{ setEditandoId(lote.id); setEditForm({ nombre:lote.nombre, notas:lote.notas??"" }); }} style={btnSm}>✏️</button>
                                  <button onClick={()=>setEliminandoId(lote.id)} style={{...btnSm,color:"#c0392b"}}>🗑️</button>
                                </div>
                              </div>
                              <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:12 }}>
                                <div style={{ fontSize:13,fontWeight:600,color:"#2d6a4f",minWidth:36 }}>{p}%</div>
                                <div style={{ flex:1,fontSize:12,color:"#8a9e8a" }}>{lote.etapas.filter((e:any)=>e.fechaReal).length} de {lote.etapas.length} etapas confirmadas</div>
                              </div>
                              {prox && dias!==null && (
                                <div style={{ marginTop:10,padding:"8px 12px",background:"#f4f7f4",borderRadius:6,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                                  <div style={{ fontSize:13,fontWeight:500,color:"#1a1f1a" }}>Próxima: {prox.nombre}</div>
                                  <div style={{ fontSize:13,fontWeight:600,color:dias<=0?"#c0392b":dias<=3?"#e07b28":"#2d6a4f" }}>
                                    {dias===0?"Hoy":dias<0?`Atrasada ${Math.abs(dias)}d`:`En ${dias}d`}
                                  </div>
                                </div>
                              )}
                              {p===100 && <div style={{ marginTop:10,fontSize:13,color:"#52b788",fontWeight:600 }}>✅ Ciclo completado</div>}
                              {lote.notas && <div style={{ marginTop:10,fontSize:13,color:"#556055",background:"#f4f7f4",borderRadius:6,padding:"8px 12px",borderLeft:"3px solid #b8ceb8" }}>📝 {lote.notas}</div>}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ═══ VISTA GANTT MULTI-LOTE ═══ */}
        {!cargando && vista==="gantt" && (
          <>
            {/* Selector de lotes + zoom */}
            <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em" }}>
                  Seleccionar lotes ({seleccionados.size}/{todosLotes.length})
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button onClick={seleccionarTodos} style={{ fontSize:12, padding:"4px 10px", border:"1px solid #b8ceb8", borderRadius:6, background:"#d8ede2", color:"#2d6a4f", cursor:"pointer", fontWeight:600 }}>Todos</button>
                  <button onClick={deseleccionarTodos} style={{ fontSize:12, padding:"4px 10px", border:"1px solid #dce8dc", borderRadius:6, background:"#fff", color:"#8a9e8a", cursor:"pointer" }}>Ninguno</button>
                  <div style={{ width:1, height:20, background:"#dce8dc", margin:"0 4px" }} />
                  <span style={{ fontSize:12, color:"#8a9e8a" }}>Zoom</span>
                  <button onClick={()=>setZoom(z=>Math.max(0.4,z-0.2))} style={btnZoom}>−</button>
                  <span style={{ fontSize:12, minWidth:36, textAlign:"center", color:"#556055" }}>{Math.round(zoom*100)}%</span>
                  <button onClick={()=>setZoom(z=>Math.min(3,z+0.2))} style={btnZoom}>+</button>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {todosLotes.map((lote:any)=>{
                  const sel = seleccionados.has(lote.id);
                  const c = coloresCultivo(lote.fichaId);
                  return (
                    <button key={lote.id} onClick={()=>toggleSeleccion(lote.id)}
                      style={{ padding:"6px 12px", borderRadius:8, border:`2px solid ${sel?c.barra:"#dce8dc"}`, background:sel?c.bg:"#f4f7f4", color:sel?c.texto:"#8a9e8a", fontSize:13, fontWeight:sel?600:400, cursor:"pointer", display:"flex", alignItems:"center", gap:6, transition:"all 0.15s" }}>
                      {emojiCultivo(lote.fichaId)} {lote.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gantt */}
            {lotesGantt.length === 0 ? (
              <div style={{ background:"#fff", borderRadius:10, border:"1px solid #dce8dc", padding:"32px", textAlign:"center", color:"#8a9e8a" }}>
                Selecciona al menos un lote para ver el Gantt.
              </div>
            ) : (
              <div style={{ overflowX:"auto", border:"1px solid #dce8dc", borderRadius:12, background:"#fff" }}>
                <div style={{ minWidth: COL_W+TOTAL_W }}>

                  {/* Header meses */}
                  <div style={{ display:"flex", borderBottom:"1px solid #dce8dc", background:"#f4f7f4", position:"sticky", top:0, zIndex:3 }}>
                    <div style={{ width:COL_W, minWidth:COL_W, padding:"10px 14px", fontSize:12, fontWeight:600, color:"#556055", borderRight:"1px solid #dce8dc" }}>
                      Lote / Cultivo
                    </div>
                    <div style={{ display:"flex", flex:1 }}>
                      {meses.map((m,i)=>(
                        <div key={i} style={{ width:m.dias*DAY_W, minWidth:m.dias*DAY_W, padding:"10px 6px", fontSize:11, fontWeight:600, color:"#8a9e8a", textAlign:"center", whiteSpace:"nowrap", borderRight:"0.5px solid #e8efe8", textTransform:"capitalize" }}>
                          {m.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filas por lote */}
                  {lotesGantt.map((lote:any)=>{
                    const c = coloresCultivo(lote.fichaId);
                    const p = pct(lote.etapas);
                    const etapasOrdenadas = [...lote.etapas].sort((a:any,b:any)=>new Date(a.fechaPlanificada).getTime()-new Date(b.fechaPlanificada).getTime());
                    const primera = etapasOrdenadas[0];
                    const ultima = etapasOrdenadas[etapasOrdenadas.length-1];
                    if (!primera||!ultima) return null;

                    const inicio = new Date(primera.fechaReal??primera.fechaPlanificada);
                    const fin = new Date(ultima.fechaReal??ultima.fechaPlanificada);
                    const barLeft = Math.max(0, diffDias(fechaMinG, inicio)) * DAY_W;
                    const barWidth = Math.max(diffDias(inicio, fin) * DAY_W, 8);

                    // Barra de progreso dentro del ciclo
                    const progLeft = barLeft;
                    const progWidth = barWidth * p / 100;

                    // Etapas como puntos/marcas
                    const etapasMarcas = etapasOrdenadas.map((e:any)=>{
                      const fecha = new Date(e.fechaReal??e.fechaPlanificada);
                      return { left: Math.max(0,diffDias(fechaMinG,fecha))*DAY_W, confirmada: !!e.fechaReal, nombre: e.nombre };
                    });

                    return (
                      <div key={lote.id} style={{ display:"flex", borderBottom:"1px solid #f0f4f0", alignItems:"center", minHeight:60 }}>
                        <div style={{ width:COL_W, minWidth:COL_W, padding:"10px 14px", borderRight:"1px solid #dce8dc", flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#1a1f1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {emojiCultivo(lote.fichaId)} {lote.nombre}
                          </div>
                          <div style={{ fontSize:11, color:"#8a9e8a", marginTop:2 }}>{lote.predioNombre}</div>
                          <div style={{ fontSize:11, fontWeight:600, color:c.texto, marginTop:2 }}>{p}% completado</div>
                        </div>
                        <div style={{ flex:1, position:"relative", height:60, minWidth:TOTAL_W }}>
                          {/* Línea de hoy */}
                          {hoyOff>=0&&hoyOff<=totalDiasG && (
                            <div style={{ position:"absolute", top:0, bottom:0, left:hoyOff*DAY_W, width:1.5, background:"#E24B4A", zIndex:3, pointerEvents:"none" }} />
                          )}
                          {/* Barra fondo (ciclo completo) */}
                          <div style={{ position:"absolute", top:20, left:barLeft, width:barWidth, height:20, borderRadius:6, background:c.bg, border:`1.5px solid ${c.barra}40` }} />
                          {/* Barra progreso */}
                          {progWidth>0 && (
                            <div style={{ position:"absolute", top:20, left:progLeft, width:progWidth, height:20, borderRadius:6, background:c.barra, opacity:0.85 }} />
                          )}
                          {/* Marcas de etapas */}
                          {etapasMarcas.map((m,i)=>(
                            <div key={i} title={m.nombre}
                              style={{ position:"absolute", top:16, left:m.left-4, width:8, height:28, display:"flex", flexDirection:"column", alignItems:"center", gap:0, zIndex:2 }}>
                              <div style={{ width:2, height:8, background: m.confirmada?"#2d6a4f":"#b8ceb8" }} />
                              <div style={{ width:6, height:6, borderRadius:"50%", background: m.confirmada?"#2d6a4f":"#b8ceb8", border:`1.5px solid #fff` }} />
                              <div style={{ width:2, height:8, background: m.confirmada?"#2d6a4f":"#b8ceb8" }} />
                            </div>
                          ))}
                          {/* Etiquetas inicio y fin */}
                          <div style={{ position:"absolute", top:44, left:barLeft, fontSize:10, color:"#8a9e8a", whiteSpace:"nowrap" }}>{fmt(inicio)}</div>
                          <div style={{ position:"absolute", top:44, left:barLeft+barWidth, fontSize:10, color:"#8a9e8a", whiteSpace:"nowrap", transform:"translateX(-100%)" }}>{fmt(fin)}</div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Leyenda */}
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap", padding:"10px 14px", borderTop:"1px solid #dce8dc", background:"#f4f7f4", borderRadius:"0 0 12px 12px", alignItems:"center" }}>
                    <div style={{ fontSize:11, color:"#556055", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:14, height:8, borderRadius:2, background:"#2d6a4f" }} />Progreso real</div>
                    <div style={{ fontSize:11, color:"#556055", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:14, height:8, borderRadius:2, background:"#d8ede2", border:"1px solid #b8ceb8" }} />Ciclo planificado</div>
                    <div style={{ fontSize:11, color:"#556055", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:6, height:6, borderRadius:"50%", background:"#2d6a4f" }} />Etapa confirmada</div>
                    <div style={{ fontSize:11, color:"#556055", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:6, height:6, borderRadius:"50%", background:"#b8ceb8" }} />Etapa pendiente</div>
                    <div style={{ fontSize:11, color:"#556055", display:"flex", alignItems:"center", gap:5 }}><div style={{ width:2, height:12, borderRadius:0, background:"#E24B4A" }} />Hoy</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
const btnSm: React.CSSProperties = { padding:"5px 9px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:15, cursor:"pointer" };
const btnZoom: React.CSSProperties = { padding:"3px 10px", borderRadius:6, border:"1px solid #b8ceb8", background:"#fff", fontSize:14, cursor:"pointer", color:"#2d6a4f" };
