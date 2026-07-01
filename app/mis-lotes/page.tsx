"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerPredios, actualizarLote, eliminarLote } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

const EMOJI_CULTIVO: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", default:"🌱" };

function pctCompletado(etapas: any[]): number {
  if (!etapas.length) return 0;
  return Math.round((etapas.filter(e=>e.fechaReal).length / etapas.length) * 100);
}

function proximaEtapa(etapas: any[]): { nombre:string; fecha:string } | null {
  const pendientes = etapas.filter(e=>!e.fechaReal).sort((a,b)=>new Date(a.fechaPlanificada).getTime()-new Date(b.fechaPlanificada).getTime());
  if (!pendientes.length) return null;
  return { nombre: pendientes[0].nombre, fecha: pendientes[0].fechaPlanificada };
}

function diasHasta(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((new Date(fecha).getTime()-hoy.getTime())/86400000);
}

export default function MisLotesPage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [predios, setPredios] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editandoId, setEditandoId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState({ nombre:"", notas:"" });
  const [eliminandoId, setEliminandoId] = useState<string|null>(null);
  const [mensaje, setMensaje] = useState<string|null>(null);

  useEffect(()=>{
    if (autenticado===false) { router.push("/login"); return; }
    if (autenticado===true) cargar();
  },[autenticado]);

  async function cargar() {
    setCargando(true);
    obtenerPredios().then(setPredios).finally(()=>setCargando(false));
  }

  function mostrarMsg(m:string){ setMensaje(m); setTimeout(()=>setMensaje(null),3000); }

  function iniciarEdicion(lote: any) {
    setEditandoId(lote.id);
    setEditForm({ nombre: lote.nombre, notas: lote.notas??""});
  }

  async function guardarEdicion(loteId: string) {
    await actualizarLote(loteId, editForm);
    setEditandoId(null);
    mostrarMsg("Lote actualizado");
    cargar();
  }

  async function confirmarEliminar(loteId: string) {
    await eliminarLote(loteId);
    setEliminandoId(null);
    mostrarMsg("Lote eliminado");
    cargar();
  }

  const totalLotes = predios.reduce((s,p)=>s+p.lotes.length,0);

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Mis predios y lotes" subtitulo={`${totalLotes} lote${totalLotes!==1?"s":""} activos`} volverA="/" volverLabel="← Inicio" />

      <div style={{ maxWidth:680, margin:"0 auto", padding:"24px 16px" }}>
        {mensaje && <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#2d6a4f", fontWeight:500 }}>✓ {mensaje}</div>}

        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:16 }}>
          <Link href="/nuevo-lote">
            <button style={{ padding:"10px 20px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>+ Nuevo lote</button>
          </Link>
        </div>

        {cargando && <p style={{color:"#888",textAlign:"center",padding:32}}>Cargando...</p>}

        {!cargando && predios.length===0 && (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dce8dc", padding:"40px 24px", textAlign:"center" }}>
            <div style={{fontSize:48,marginBottom:12}}>🌱</div>
            <p style={{fontSize:16,fontWeight:600,color:"#1a1f1a"}}>Sin lotes registrados</p>
            <p style={{fontSize:14,color:"#8a9e8a",marginTop:6}}>Crea tu primer lote para comenzar.</p>
          </div>
        )}

        {predios.map(predio=>(
          <div key={predio.id} style={{ marginBottom:24 }}>
            {/* Header del predio */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{ flex:1, borderBottom:"2px solid #dce8dc", paddingBottom:6 }}>
                <div style={{ fontSize:16, fontWeight:700, color:"#2d6a4f" }}>🏡 {predio.nombre}</div>
                <div style={{ fontSize:12, color:"#8a9e8a" }}>{predio.ubicacion}</div>
              </div>
            </div>

            {predio.lotes.length===0 && (
              <p style={{fontSize:13,color:"#8a9e8a",paddingLeft:8}}>Sin lotes en este predio.</p>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {predio.lotes.map((lote:any)=>{
                const pct = pctCompletado(lote.etapas);
                const prox = proximaEtapa(lote.etapas);
                const emoji = EMOJI_CULTIVO[lote.ficha?.cultivo?.toLowerCase()] ?? EMOJI_CULTIVO.default;
                const editando = editandoId===lote.id;
                const eliminando = eliminandoId===lote.id;

                return (
                  <div key={lote.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, overflow:"hidden" }}>
                    {/* Barra de progreso */}
                    <div style={{ height:4, background:"#eef2ee" }}>
                      <div style={{ height:"100%", width:`${pct}%`, background: pct===100?"#52b788":"#2d6a4f", transition:"width 0.3s" }} />
                    </div>

                    <div style={{ padding:"14px 16px" }}>
                      {editando ? (
                        /* Modo edición */
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                          <div>
                            <label style={lbl}>Nombre del lote</label>
                            <input value={editForm.nombre} onChange={e=>setEditForm(p=>({...p,nombre:e.target.value}))} style={{ fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%" }} />
                          </div>
                          <div>
                            <label style={lbl}>Notas u observaciones</label>
                            <textarea value={editForm.notas} onChange={e=>setEditForm(p=>({...p,notas:e.target.value}))} rows={3} placeholder="Observaciones de este lote..." style={{ fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%", resize:"vertical" }} />
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={()=>guardarEdicion(lote.id)} style={{ padding:"8px 16px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>Guardar</button>
                            <button onClick={()=>setEditandoId(null)} style={{ padding:"8px 16px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:6, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : eliminando ? (
                        /* Confirmación eliminación */
                        <div style={{ background:"#fde8e6", borderRadius:8, padding:"14px 16px" }}>
                          <p style={{ fontSize:14, fontWeight:600, color:"#c0392b", marginBottom:10 }}>⚠️ ¿Eliminar "{lote.nombre}"? Esta acción no se puede deshacer.</p>
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={()=>confirmarEliminar(lote.id)} style={{ padding:"8px 16px", background:"#c0392b", color:"#fff", border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer" }}>Sí, eliminar</button>
                            <button onClick={()=>setEliminandoId(null)} style={{ padding:"8px 16px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:6, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        /* Vista normal */
                        <>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                            <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                              <span style={{ fontSize:28 }}>{emoji}</span>
                              <div>
                                <div style={{ fontSize:15, fontWeight:700, color:"#1a1f1a" }}>{lote.nombre}</div>
                                <div style={{ fontSize:12, color:"#8a9e8a" }}>{emoji} {lote.ficha?.nombre}</div>
                              </div>
                            </div>
                            <div style={{ display:"flex", gap:6 }}>
                              <Link href={`/calendario?lote=${lote.id}`}>
                                <button style={btnSmall}>📅</button>
                              </Link>
                              <button onClick={()=>iniciarEdicion(lote)} style={btnSmall}>✏️</button>
                              <button onClick={()=>setEliminandoId(lote.id)} style={{...btnSmall, color:"#c0392b"}}>🗑️</button>
                            </div>
                          </div>

                          {/* Progreso */}
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:12 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#2d6a4f", minWidth:36 }}>{pct}%</div>
                            <div style={{ flex:1, fontSize:12, color:"#8a9e8a" }}>
                              {lote.etapas.filter((e:any)=>e.fechaReal).length} de {lote.etapas.length} etapas confirmadas
                            </div>
                          </div>

                          {/* Próxima etapa */}
                          {prox && (
                            <div style={{ marginTop:10, padding:"8px 12px", background:"#f4f7f4", borderRadius:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <div>
                                <div style={{ fontSize:11, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.05em" }}>Próxima etapa</div>
                                <div style={{ fontSize:13, fontWeight:500, color:"#1a1f1a" }}>{prox.nombre}</div>
                              </div>
                              <div style={{ fontSize:13, fontWeight:600, color: diasHasta(prox.fecha)<=3?"#c0392b":diasHasta(prox.fecha)<=7?"#e07b28":"#2d6a4f" }}>
                                {diasHasta(prox.fecha)===0?"Hoy":diasHasta(prox.fecha)<0?`Atrasada ${Math.abs(diasHasta(prox.fecha))}d`:`En ${diasHasta(prox.fecha)}d`}
                              </div>
                            </div>
                          )}

                          {pct===100 && <div style={{ marginTop:10, fontSize:13, color:"#52b788", fontWeight:600 }}>✅ Ciclo completado</div>}

                          {/* Notas si existen */}
                          {lote.notas && (
                            <div style={{ marginTop:10, fontSize:13, color:"#556055", background:"#f4f7f4", borderRadius:6, padding:"8px 12px", borderLeft:"3px solid #b8ceb8" }}>
                              📝 {lote.notas}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
const btnSmall: React.CSSProperties = { padding:"5px 9px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:15, cursor:"pointer" };
