"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerFichas, actualizarEtapaFicha, actualizarTareaFicha, type FichaCultivo } from "@/lib/api";

export default function AdminFichasPage() {
  const [fichas, setFichas] = useState<FichaCultivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Record<string,string>>({});
  const [guardando, setGuardando] = useState<string|null>(null);
  const [mensaje, setMensaje] = useState<string|null>(null);

  useEffect(()=>{
    obtenerFichas().then(setFichas).finally(()=>setCargando(false));
  },[]);

  function setVal(key: string, val: string) { setEditando(p=>({...p,[key]:val})); }

  async function guardarEtapa(etapaId: string) {
    const val = editando[`e-${etapaId}`];
    if (!val) return;
    setGuardando(etapaId);
    await actualizarEtapaFicha(etapaId, parseInt(val));
    setMensaje("Guardado correctamente");
    setTimeout(()=>setMensaje(null),2500);
    setGuardando(null);
    const actualizadas = await obtenerFichas();
    setFichas(actualizadas);
  }

  async function guardarTarea(tareaId: string) {
    const val = editando[`t-${tareaId}`];
    if (!val) return;
    setGuardando(tareaId);
    await actualizarTareaFicha(tareaId, parseInt(val));
    setMensaje("Guardado correctamente");
    setTimeout(()=>setMensaje(null),2500);
    setGuardando(null);
    const actualizadas = await obtenerFichas();
    setFichas(actualizadas);
  }

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <div style={{ background:"#2d6a4f", padding:"18px 20px" }}>
        <div style={{ maxWidth:760, margin:"0 auto", display:"flex", alignItems:"center", gap:12 }}>
          <Link href="/"><button style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:6, padding:"6px 12px", fontSize:13, cursor:"pointer" }}>← Inicio</button></Link>
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>SmartAgro · Admin</div>
            <h1 style={{ fontSize:18, fontWeight:700, color:"#fff" }}>Fichas técnicas de cultivos</h1>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 16px" }}>
        {mensaje && <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#2d6a4f", fontWeight:500 }}>✓ {mensaje}</div>}

        {cargando ? <p style={{color:"#888"}}>Cargando...</p> : fichas.map(ficha=>(
          <div key={ficha.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, marginBottom:20, overflow:"hidden" }}>
            <div style={{ background:"#2d6a4f", padding:"14px 18px", display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{ficha.zona}</span>
              <h2 style={{ fontSize:17, fontWeight:700, color:"#fff", margin:0 }}>{ficha.nombre}</h2>
            </div>

            <div style={{ padding:"16px 18px" }}>
              {/* Etapas */}
              <div style={{ fontSize:11, fontWeight:700, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Etapas del ciclo</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
                {ficha.etapas.map(etapa=>{
                  const key = `e-${etapa.id}`;
                  const val = editando[key] ?? String(etapa.duracionDesdeAnterior);
                  return (
                    <div key={etapa.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#f4f7f4", borderRadius:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:"#1a1f1a" }}>{etapa.nombre}</div>
                        <div style={{ fontSize:11, color:"#8a9e8a" }}>Orden {etapa.orden}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                        <label style={{ fontSize:11, color:"#8a9e8a" }}>días desde anterior</label>
                        <input type="number" value={val} onChange={e=>setVal(key,e.target.value)} min={0} max={365}
                          style={{ width:60, padding:"5px 8px", borderRadius:6, border:"1px solid #dce8dc", fontSize:14, textAlign:"center" }} />
                        <button onClick={()=>guardarEtapa(etapa.id)} disabled={guardando===etapa.id}
                          style={{ padding:"5px 12px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", opacity: guardando===etapa.id?0.6:1 }}>
                          {guardando===etapa.id?"...":"Guardar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tareas */}
              <div style={{ fontSize:11, fontWeight:700, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>Labores intermedias</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {ficha.tareas.map(tarea=>{
                  const key = `t-${tarea.id}`;
                  const val = editando[key] ?? String(tarea.offsetDias);
                  return (
                    <div key={tarea.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff8f0", borderRadius:8, border:"1px solid #fdefd8" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:"#1a1f1a" }}>{tarea.nombre}</div>
                        <div style={{ fontSize:11, color:"#8a9e8a" }}>Anclada a: {tarea.etapaAncla}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
                        <label style={{ fontSize:11, color:"#8a9e8a" }}>días offset</label>
                        <input type="number" value={val} onChange={e=>setVal(key,e.target.value)} min={0} max={365}
                          style={{ width:60, padding:"5px 8px", borderRadius:6, border:"1px solid #fdefd8", fontSize:14, textAlign:"center" }} />
                        <button onClick={()=>guardarTarea(tarea.id)} disabled={guardando===tarea.id}
                          style={{ padding:"5px 12px", background:"#e07b28", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer", opacity: guardando===tarea.id?0.6:1 }}>
                          {guardando===tarea.id?"...":"Guardar"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
