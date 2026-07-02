"use client";
import { useEffect, useState } from "react";
import {
  obtenerFichas, actualizarEtapaFicha, actualizarTareaFicha,
  agregarEtapa, eliminarEtapaFicha, agregarTarea, eliminarTareaFicha,
  type FichaCultivo, type EtapaFicha, type TareaFicha,
} from "@/lib/api";
import { Header } from "@/components/Header";

const EMOJI_MAP: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", pimenton:"🫑", cebolla:"🧅", default:"🌱" };
function emojiC(cultivo: string) { return EMOJI_MAP[cultivo?.toLowerCase()] ?? EMOJI_MAP.default; }

type Seccion = "etapas" | "tareas";

export default function AdminFichasPage() {
  const [fichas, setFichas] = useState<FichaCultivo[]>([]);
  const [fichaActiva, setFichaActiva] = useState<string|null>(null);
  const [seccion, setSeccion] = useState<Seccion>("etapas");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Record<string,string>>({});
  const [guardando, setGuardando] = useState<string|null>(null);
  const [eliminando, setEliminando] = useState<string|null>(null);
  const [mensaje, setMensaje] = useState<{texto:string; tipo:"ok"|"error"}|null>(null);

  // Formulario nueva etapa
  const [formEtapa, setFormEtapa] = useState({ etapaCodigo:"", nombre:"", orden:"", duracionDesdeAnterior:"0" });
  const [mostrarFormEtapa, setMostrarFormEtapa] = useState(false);

  // Formulario nueva tarea
  const [formTarea, setFormTarea] = useState({ nombre:"", etapaAncla:"", offsetDias:"0" });
  const [mostrarFormTarea, setMostrarFormTarea] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setCargando(true);
    const data = await obtenerFichas();
    setFichas(data);
    if (data.length > 0 && !fichaActiva) setFichaActiva(data[0].id);
    setCargando(false);
  }

  const ficha = fichas.find(f => f.id === fichaActiva) ?? null;

  function mostrarMsg(texto: string, tipo: "ok"|"error" = "ok") {
    setMensaje({ texto, tipo });
    setTimeout(() => setMensaje(null), 3000);
  }

  function setVal(key: string, val: string) { setEditando(p => ({ ...p, [key]: val })); }

  async function guardarEtapa(etapaId: string) {
    const val = editando[`e-${etapaId}`];
    if (!val) return;
    setGuardando(etapaId);
    try {
      await actualizarEtapaFicha(etapaId, parseInt(val));
      mostrarMsg("Etapa actualizada");
      await cargar();
    } catch { mostrarMsg("Error al actualizar", "error"); }
    finally { setGuardando(null); }
  }

  async function handleEliminarEtapa(etapaId: string, nombre: string) {
    if (eliminando === etapaId) {
      try {
        await eliminarEtapaFicha(etapaId);
        mostrarMsg(`Etapa "${nombre}" eliminada`);
        setEliminando(null);
        await cargar();
      } catch { mostrarMsg("Error al eliminar", "error"); setEliminando(null); }
    } else {
      setEliminando(etapaId);
      setTimeout(() => setEliminando(e => e === etapaId ? null : e), 4000);
    }
  }

  async function handleAgregarEtapa() {
    if (!fichaActiva || !formEtapa.etapaCodigo || !formEtapa.nombre || !formEtapa.orden) return;
    setGuardando("nueva-etapa");
    try {
      await agregarEtapa(fichaActiva, {
        etapaCodigo: formEtapa.etapaCodigo.toLowerCase().replace(/\s+/g,"_"),
        nombre: formEtapa.nombre,
        orden: parseInt(formEtapa.orden),
        duracionDesdeAnterior: parseInt(formEtapa.duracionDesdeAnterior),
      });
      mostrarMsg("Etapa agregada correctamente");
      setFormEtapa({ etapaCodigo:"", nombre:"", orden:"", duracionDesdeAnterior:"0" });
      setMostrarFormEtapa(false);
      await cargar();
    } catch { mostrarMsg("Error al agregar etapa", "error"); }
    finally { setGuardando(null); }
  }

  async function guardarTarea(tareaId: string) {
    const val = editando[`t-${tareaId}`];
    if (!val) return;
    setGuardando(tareaId);
    try {
      await actualizarTareaFicha(tareaId, parseInt(val));
      mostrarMsg("Labor actualizada");
      await cargar();
    } catch { mostrarMsg("Error al actualizar", "error"); }
    finally { setGuardando(null); }
  }

  async function handleEliminarTarea(tareaId: string, nombre: string) {
    if (eliminando === tareaId) {
      try {
        await eliminarTareaFicha(tareaId);
        mostrarMsg(`Labor "${nombre}" eliminada`);
        setEliminando(null);
        await cargar();
      } catch { mostrarMsg("Error al eliminar", "error"); setEliminando(null); }
    } else {
      setEliminando(tareaId);
      setTimeout(() => setEliminando(e => e === tareaId ? null : e), 4000);
    }
  }

  async function handleAgregarTarea() {
    if (!fichaActiva || !formTarea.nombre || !formTarea.etapaAncla) return;
    setGuardando("nueva-tarea");
    try {
      await agregarTarea(fichaActiva, {
        nombre: formTarea.nombre,
        etapaAncla: formTarea.etapaAncla,
        offsetDias: parseInt(formTarea.offsetDias),
      });
      mostrarMsg("Labor agregada correctamente");
      setFormTarea({ nombre:"", etapaAncla:"", offsetDias:"0" });
      setMostrarFormTarea(false);
      await cargar();
    } catch { mostrarMsg("Error al agregar labor", "error"); }
    finally { setGuardando(null); }
  }

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Fichas técnicas de cultivos" subtitulo="Administración" />

      <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 16px" }}>

        {mensaje && (
          <div style={{ background: mensaje.tipo==="ok"?"#d8ede2":"#fde8e6", border:`1px solid ${mensaje.tipo==="ok"?"#b8ceb8":"#f5b8b5"}`, borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:14, color: mensaje.tipo==="ok"?"#2d6a4f":"#c0392b", fontWeight:500 }}>
            {mensaje.tipo==="ok"?"✓":"✗"} {mensaje.texto}
          </div>
        )}

        {/* Selector de cultivo */}
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {fichas.map(f => {
            const activo = fichaActiva === f.id;
            return (
              <button key={f.id} onClick={() => { setFichaActiva(f.id); setSeccion("etapas"); setMostrarFormEtapa(false); setMostrarFormTarea(false); }}
                style={{ padding:"10px 16px", borderRadius:10, border: activo?"2px solid #2d6a4f":"1px solid #dce8dc", background: activo?"#2d6a4f":"#fff", color: activo?"#fff":"#556055", fontSize:14, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{fontSize:18}}>{emojiC(f.cultivo)}</span> {f.nombre}
              </button>
            );
          })}
        </div>

        {cargando && <p style={{color:"#888"}}>Cargando...</p>}

        {ficha && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, overflow:"hidden" }}>

            {/* Header de la ficha */}
            <div style={{ background:"#2d6a4f", padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{fontSize:24}}>{emojiC(ficha.cultivo)}</span>
              <div>
                <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:0 }}>{ficha.nombre}</h2>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{ficha.zona} · {ficha.etapas.length} etapas · {ficha.tareas.length} labores</div>
              </div>
            </div>

            {/* Pestañas */}
            <div style={{ display:"flex", borderBottom:"1px solid #dce8dc", background:"#f4f7f4" }}>
              {([
                { id:"etapas", label:`Etapas del ciclo (${ficha.etapas.length})` },
                { id:"tareas", label:`Labores intermedias (${ficha.tareas.length})` },
              ] as {id:Seccion;label:string}[]).map(tab=>(
                <button key={tab.id} onClick={()=>{ setSeccion(tab.id); setMostrarFormEtapa(false); setMostrarFormTarea(false); }}
                  style={{ flex:1, padding:"12px 16px", border:"none", background:"transparent", fontSize:14, fontWeight:600, cursor:"pointer", color:seccion===tab.id?"#2d6a4f":"#8a9e8a", borderBottom:seccion===tab.id?"2px solid #2d6a4f":"2px solid transparent" }}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding:"16px 18px" }}>

              {/* ── ETAPAS ── */}
              {seccion==="etapas" && (
                <>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                    {[...ficha.etapas].sort((a,b)=>a.orden-b.orden).map((etapa, idx) => {
                      const key = `e-${etapa.id}`;
                      const val = editando[key] ?? String(etapa.duracionDesdeAnterior);
                      const confElim = eliminando === etapa.id;
                      return (
                        <div key={etapa.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"#f4f7f4", borderRadius:8, border:`1px solid ${confElim?"#f5b8b5":"#dce8dc"}` }}>
                          <div style={{ width:26, height:26, borderRadius:"50%", background:"#2d6a4f", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx+1}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500 }}>{etapa.nombre}</div>
                            <div style={{ fontSize:11, color:"#8a9e8a" }}>código: {etapa.etapaCodigo}</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                            <span style={{ fontSize:11, color:"#8a9e8a", whiteSpace:"nowrap" }}>días desde anterior</span>
                            <input type="number" value={val} onChange={e=>setVal(key,e.target.value)} min={0} max={365}
                              style={{ width:56, padding:"5px 6px", borderRadius:6, border:"1px solid #dce8dc", fontSize:13, textAlign:"center" as const }} />
                            <button onClick={()=>guardarEtapa(etapa.id)} disabled={guardando===etapa.id}
                              style={{ padding:"5px 10px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", opacity:guardando===etapa.id?0.6:1 }}>
                              {guardando===etapa.id?"...":"OK"}
                            </button>
                            <button onClick={()=>handleEliminarEtapa(etapa.id, etapa.nombre)}
                              style={{ padding:"5px 10px", background:confElim?"#c0392b":"#fde8e6", color:confElim?"#fff":"#c0392b", border:`1px solid ${confElim?"#c0392b":"#f5b8b5"}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                              {confElim?"¿Seguro?":"🗑️"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Formulario nueva etapa */}
                  {mostrarFormEtapa ? (
                    <div style={{ background:"#f4f7f4", borderRadius:10, padding:"14px 16px", border:"1px solid #dce8dc" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", marginBottom:12 }}>Nueva etapa</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                        <div>
                          <label style={lbl}>Nombre visible</label>
                          <input value={formEtapa.nombre} onChange={e=>setFormEtapa(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Poda de formación" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Código interno</label>
                          <input value={formEtapa.etapaCodigo} onChange={e=>setFormEtapa(p=>({...p,etapaCodigo:e.target.value}))} placeholder="Ej: poda_formacion" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Orden (número)</label>
                          <input type="number" value={formEtapa.orden} onChange={e=>setFormEtapa(p=>({...p,orden:e.target.value}))} placeholder={String(ficha.etapas.length+1)} min={1} style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Días desde etapa anterior</label>
                          <input type="number" value={formEtapa.duracionDesdeAnterior} onChange={e=>setFormEtapa(p=>({...p,duracionDesdeAnterior:e.target.value}))} min={0} style={inp} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={handleAgregarEtapa} disabled={guardando==="nueva-etapa"}
                          style={{ padding:"8px 16px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                          {guardando==="nueva-etapa"?"Agregando...":"Agregar etapa"}
                        </button>
                        <button onClick={()=>setMostrarFormEtapa(false)} style={{ padding:"8px 14px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={()=>setMostrarFormEtapa(true)}
                      style={{ width:"100%", padding:"10px 0", background:"transparent", border:"1px dashed #b8ceb8", borderRadius:8, color:"#2d6a4f", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      + Agregar nueva etapa
                    </button>
                  )}
                </>
              )}

              {/* ── TAREAS ── */}
              {seccion==="tareas" && (
                <>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
                    {ficha.tareas.map((tarea, idx) => {
                      const key = `t-${tarea.id}`;
                      const val = editando[key] ?? String(tarea.offsetDias);
                      const confElim = eliminando === tarea.id;
                      return (
                        <div key={tarea.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"#fff8f0", borderRadius:8, border:`1px solid ${confElim?"#f5b8b5":"#fdefd8"}` }}>
                          <div style={{ width:26, height:26, borderRadius:"50%", background:"#e07b28", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{idx+1}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500 }}>{tarea.nombre}</div>
                            <div style={{ fontSize:11, color:"#8a9e8a" }}>Anclada a: <strong>{tarea.etapaAncla}</strong></div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                            <span style={{ fontSize:11, color:"#8a9e8a", whiteSpace:"nowrap" }}>días offset</span>
                            <input type="number" value={val} onChange={e=>setVal(key,e.target.value)} min={0} max={365}
                              style={{ width:56, padding:"5px 6px", borderRadius:6, border:"1px solid #fdefd8", fontSize:13, textAlign:"center" as const }} />
                            <button onClick={()=>guardarTarea(tarea.id)} disabled={guardando===tarea.id}
                              style={{ padding:"5px 10px", background:"#e07b28", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", opacity:guardando===tarea.id?0.6:1 }}>
                              {guardando===tarea.id?"...":"OK"}
                            </button>
                            <button onClick={()=>handleEliminarTarea(tarea.id, tarea.nombre)}
                              style={{ padding:"5px 10px", background:confElim?"#c0392b":"#fde8e6", color:confElim?"#fff":"#c0392b", border:`1px solid ${confElim?"#c0392b":"#f5b8b5"}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                              {confElim?"¿Seguro?":"🗑️"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Formulario nueva tarea */}
                  {mostrarFormTarea ? (
                    <div style={{ background:"#fff8f0", borderRadius:10, padding:"14px 16px", border:"1px solid #fdefd8" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:"#e07b28", marginBottom:12 }}>Nueva labor intermedia</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                        <div style={{ gridColumn:"1/-1" }}>
                          <label style={lbl}>Nombre de la labor</label>
                          <input value={formTarea.nombre} onChange={e=>setFormTarea(p=>({...p,nombre:e.target.value}))} placeholder="Ej: Deshoje preventivo" style={inp} />
                        </div>
                        <div>
                          <label style={lbl}>Anclada a etapa (código)</label>
                          <select value={formTarea.etapaAncla} onChange={e=>setFormTarea(p=>({...p,etapaAncla:e.target.value}))}
                            style={{ ...inp, background:"#fff" }}>
                            <option value="">Selecciona etapa...</option>
                            {[...ficha.etapas].sort((a,b)=>a.orden-b.orden).map(e=>(
                              <option key={e.id} value={e.etapaCodigo}>{e.nombre} ({e.etapaCodigo})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={lbl}>Días después de la etapa</label>
                          <input type="number" value={formTarea.offsetDias} onChange={e=>setFormTarea(p=>({...p,offsetDias:e.target.value}))} min={0} style={inp} />
                        </div>
                      </div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={handleAgregarTarea} disabled={guardando==="nueva-tarea"}
                          style={{ padding:"8px 16px", background:"#e07b28", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                          {guardando==="nueva-tarea"?"Agregando...":"Agregar labor"}
                        </button>
                        <button onClick={()=>setMostrarFormTarea(false)} style={{ padding:"8px 14px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:8, fontSize:13, cursor:"pointer" }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={()=>setMostrarFormTarea(true)}
                      style={{ width:"100%", padding:"10px 0", background:"transparent", border:"1px dashed #fac775", borderRadius:8, color:"#e07b28", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                      + Agregar nueva labor
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
const inp: React.CSSProperties = { fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%", background:"#fff" };
