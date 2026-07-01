"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { type Lote, type EtapaLote, type TareaLote, obtenerLotes } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

type VistaMode = "ciclo" | "mes" | "semana";

const COLORES_ETAPA: Record<string, { plan:string; real:string; texto:string; textoReal:string }> = {
  "bar-green":  { plan:"#C0DD97", real:"#4a8a0e", texto:"#27500A", textoReal:"#fff" },
  "bar-teal":   { plan:"#9FE1CB", real:"#0f7a5a", texto:"#085041", textoReal:"#fff" },
  "bar-blue":   { plan:"#B5D4F4", real:"#1a6bbf", texto:"#0C447C", textoReal:"#fff" },
  "bar-amber":  { plan:"#FAC775", real:"#a0620a", texto:"#633806", textoReal:"#fff" },
  "bar-coral":  { plan:"#F5C4B3", real:"#c04a22", texto:"#712B13", textoReal:"#fff" },
  "bar-purple": { plan:"#CECBF6", real:"#5a52c0", texto:"#3C3489", textoReal:"#fff" },
};

const ETAPAS_CONFIG = [
  { codigo:"almacigo",          nombre:"Siembra almácigo",     color:"bar-green",  esTarea:false },
  { codigo:"trasplante",        nombre:"Trasplante",            color:"bar-green",  esTarea:false },
  { codigo:"floracion",         nombre:"Inicio floración",      color:"bar-blue",   esTarea:false },
  { codigo:"fructificacion",    nombre:"Fructificación",        color:"bar-blue",   esTarea:false },
  { codigo:"inicio_cosecha",    nombre:"Inicio cosecha",        color:"bar-coral",  esTarea:false },
  { codigo:"fin_cosecha",       nombre:"Fin cosecha",           color:"bar-purple", esTarea:false },
  { codigo:"cosecha",           nombre:"Cosecha",               color:"bar-coral",  esTarea:false },
];

const COLOR_TAREA = { plan:"#fff0d8", real:"#c06000", texto:"#7a3a00", textoReal:"#fff" };

function parseFecha(s: string): Date { return new Date(s); }
function fmt(d: Date, modo?: "corto"): string {
  if (modo === "corto") return d.toLocaleDateString("es-CL",{ day:"numeric", month:"short" });
  return d.toLocaleDateString("es-CL",{ day:"numeric", month:"long" });
}
function diffDias(a: Date, b: Date): number {
  return Math.round((b.getTime()-a.getTime())/86400000);
}

interface FilaGantt {
  id: string;
  nombre: string;
  esTarea: boolean;
  color: typeof COLORES_ETAPA["bar-green"] | typeof COLOR_TAREA;
  planInicio: Date;
  planFin: Date;
  realInicio: Date | null;
  realFin: Date | null;
  confirmada: boolean;
}

function construirFilas(lote: Lote): FilaGantt[] {
  const etapaMap = new Map<string, EtapaLote>(lote.etapas.map((e)=>[e.etapaCodigo, e]));
  const filas: FilaGantt[] = [];

  for (const cfg of ETAPAS_CONFIG) {
    const e = etapaMap.get(cfg.codigo);
    if (!e) continue;
    const planInicio = parseFecha(e.fechaPlanificada);
    filas.push({
      id: `e-${e.etapaCodigo}`,
      nombre: cfg.nombre,
      esTarea: false,
      color: COLORES_ETAPA[cfg.color],
      planInicio,
      planFin: new Date(planInicio.getTime()+86400000),
      realInicio: e.fechaReal ? parseFecha(e.fechaReal) : null,
      realFin: e.fechaReal ? new Date(parseFecha(e.fechaReal).getTime()+86400000) : null,
      confirmada: !!e.fechaReal,
    });
  }

  if (lote.tareas) {
    for (const t of lote.tareas) {
      const planInicio = parseFecha(t.fechaPlanificada);
      filas.push({
        id: `t-${t.id}`,
        nombre: t.nombre,
        esTarea: true,
        color: COLOR_TAREA,
        planInicio,
        planFin: new Date(planInicio.getTime()+86400000*3),
        realInicio: null,
        realFin: null,
        confirmada: false,
      });
    }
  }

  return filas.sort((a,b)=>a.planInicio.getTime()-b.planInicio.getTime());
}

function getVentana(modo: VistaMode, offset: number): { inicio: Date; fin: Date; label: string } {
  const hoy = new Date();
  if (modo === "semana") {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate()-hoy.getDay()+1+offset*7); lunes.setHours(0,0,0,0);
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate()+6);
    return { inicio:lunes, fin:domingo, label:`Semana del ${fmt(lunes,"corto")} al ${fmt(domingo,"corto")}` };
  }
  if (modo === "mes") {
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth()+offset, 1);
    const fin = new Date(inicio.getFullYear(), inicio.getMonth()+1, 0);
    return { inicio, fin, label: inicio.toLocaleDateString("es-CL",{ month:"long", year:"numeric" }) };
  }
  return { inicio: new Date(0), fin: new Date(9999,0,1), label:"Ciclo completo" };
}

interface TooltipData { x:number; y:number; fila:FilaGantt }

export default function CalendarioPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteActivo, setLoteActivo] = useState<Lote|null>(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaMode>("ciclo");
  const [offset, setOffset] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [mostrarReal, setMostrarReal] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData|null>(null);

  const { autenticado } = useAuth();

  useEffect(()=>{
    if (autenticado === false) { window.location.href = "/login"; return; }
    if (autenticado === true) obtenerLotes()
      .then((d:Lote[])=>{ setLotes(d); if(d.length>0) setLoteActivo(d[0]); })
      .finally(()=>setCargando(false));
  },[autenticado]);

  // Reset offset al cambiar vista
  function cambiarVista(v: VistaMode) { setVista(v); setOffset(0); }

  if (cargando) return <div style={s.wrap}><p style={{color:"#888",textAlign:"center",padding:40}}>Cargando...</p></div>;
  if (!loteActivo) return (
    <div style={s.wrap}>
      <p style={{color:"#666",marginBottom:16}}>Sin lotes registrados.</p>
      <Link href="/nuevo-lote"><button style={s.btnVerde}>+ Crear primer lote</button></Link>
    </div>
  );

  const todasFilas = construirFilas(loteActivo);
  if (!todasFilas.length) return <div style={s.wrap}><p>Sin datos.</p></div>;

  const fechaMinGlobal = todasFilas.reduce((m,f)=>f.planInicio<m?f.planInicio:m, todasFilas[0].planInicio);
  const fechaMaxGlobal = todasFilas.reduce((m,f)=>f.planFin>m?f.planFin:m, todasFilas[0].planFin);

  const ventana = getVentana(vista, offset);
  const fechaMin = vista==="ciclo" ? fechaMinGlobal : ventana.inicio;
  const fechaMax = vista==="ciclo" ? fechaMaxGlobal : ventana.fin;

  const filas = todasFilas.filter(f =>
    f.planInicio <= fechaMax && f.planFin >= fechaMin
  );

  const totalDias = Math.max(diffDias(fechaMin, fechaMax)+1, 1);
  const DAY_W = vista==="semana" ? 80*zoom : vista==="mes" ? 22*zoom : 5*zoom;
  const TOTAL_W = totalDias * DAY_W;
  const COL_W = 200;

  // Header: días o meses
  const headerCeldas: { label:string; dias:number }[] = [];
  if (vista==="semana") {
    for (let i=0; i<totalDias; i++) {
      const d = new Date(fechaMin); d.setDate(d.getDate()+i);
      const esHoy = diffDias(d, new Date())===0;
      headerCeldas.push({ label: d.toLocaleDateString("es-CL",{weekday:"short",day:"numeric"})+( esHoy?" ·hoy":""), dias:1 });
    }
  } else if (vista==="mes") {
    for (let i=0; i<totalDias; i++) {
      const d = new Date(fechaMin); d.setDate(d.getDate()+i);
      headerCeldas.push({ label: String(d.getDate()), dias:1 });
    }
  } else {
    let cur = new Date(fechaMin.getFullYear(), fechaMin.getMonth(), 1);
    while (cur <= fechaMax) {
      const next = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
      const s2 = Math.max(0, diffDias(fechaMin, cur));
      const e2 = Math.min(totalDias, diffDias(fechaMin, next));
      headerCeldas.push({ label: cur.toLocaleDateString("es-CL",{month:"short",year:"2-digit"}), dias:e2-s2 });
      cur = next;
    }
  }

  const hoy = new Date();
  const hoyOff = diffDias(fechaMin, hoy);

  // Métricas
  const confirmadas = todasFilas.filter(f=>!f.esTarea&&f.confirmada&&f.realInicio);
  const diffs = confirmadas.map(f=>diffDias(f.planInicio,f.realInicio!));
  const avgDiff = diffs.length ? Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length) : null;

  const bL = (f:Date) => Math.max(0, diffDias(fechaMin,f)) * DAY_W;
  const bW = (a:Date,b:Date) => Math.max(diffDias(a,b)*DAY_W, 6);

  return (
    <div style={{ background:"var(--bg-page,#f4f7f4)", minHeight:"100vh" }}>
      <Header
        titulo="Calendario del cultivo"
        subtitulo={loteActivo?.nombre}
        volverA="/"
        volverLabel="← Inicio"
        extras={lotes.length>1 ? (
          <select style={{ fontSize:13, padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.25)", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer" }}
            value={loteActivo?.id} onChange={e=>setLoteActivo(lotes.find(l=>l.id===e.target.value)??loteActivo)}>
            {lotes.map(l=><option key={l.id} value={l.id} style={{color:"#000"}}>{l.nombre}</option>)}
          </select>
        ) : undefined}
      />

      <div style={{ maxWidth:980, margin:"0 auto", padding:"20px 16px" }}>

        {/* Métricas */}
        {confirmadas.length>0 && (
          <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
            <div style={s.stat}><div style={s.statL}>Etapas confirmadas</div><div style={s.statV}>{confirmadas.length}/{todasFilas.filter(f=>!f.esTarea).length}</div></div>
            {avgDiff!==null && <div style={s.stat}><div style={s.statL}>Desviación promedio</div><div style={{...s.statV, color:avgDiff>0?"#c0392b":avgDiff<0?"#0f7a5a":"inherit"}}>{avgDiff>0?"+":""}{avgDiff} días</div></div>}
          </div>
        )}

        {/* Controles */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" }}>
          {/* Selector de vista */}
          <div style={{ display:"flex", border:"1px solid #b8ceb8", borderRadius:8, overflow:"hidden" }}>
            {(["semana","mes","ciclo"] as VistaMode[]).map(v=>(
              <button key={v} onClick={()=>cambiarVista(v)}
                style={{ padding:"6px 14px", border:"none", fontSize:13, cursor:"pointer", fontWeight:500, background: vista===v?"#2d6a4f":"#fff", color: vista===v?"#fff":"#556055" }}>
                {v==="semana"?"Semana":v==="mes"?"Mes":"Ciclo"}
              </button>
            ))}
          </div>

          {/* Navegación mes/semana */}
          {vista!=="ciclo" && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <button style={s.btnNav} onClick={()=>setOffset(o=>o-1)}>‹</button>
              <span style={{ fontSize:13, fontWeight:500, color:"#2d6a4f", minWidth:160, textAlign:"center", textTransform:"capitalize" }}>{ventana.label}</span>
              <button style={s.btnNav} onClick={()=>setOffset(o=>o+1)}>›</button>
            </div>
          )}

          {/* Zoom */}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
            <button style={s.btnNav} onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))}>−</button>
            <span style={{ fontSize:12, color:"#888", minWidth:36, textAlign:"center" }}>{Math.round(zoom*100)}%</span>
            <button style={s.btnNav} onClick={()=>setZoom(z=>Math.min(3,z+0.25))}>+</button>
            <button style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #b8ceb8", background: mostrarReal?"#d8ede2":"#fff", color: mostrarReal?"#2d6a4f":"#888", fontSize:12, cursor:"pointer", marginLeft:4 }}
              onClick={()=>setMostrarReal(v=>!v)}>
              Real vs plan
            </button>
          </div>
        </div>

        {/* Gantt */}
        <div style={{ overflowX:"auto", border:"1px solid #dce8dc", borderRadius:12, background:"#fff" }}>
          <div style={{ minWidth: COL_W+TOTAL_W }}>

            {/* Header */}
            <div style={{ display:"flex", borderBottom:"1px solid #dce8dc", background:"#f4f7f4", position:"sticky", top:0, zIndex:3 }}>
              <div style={{ width:COL_W, minWidth:COL_W, padding:"10px 14px", fontSize:12, fontWeight:500, color:"#556055", borderRight:"1px solid #dce8dc" }}>
                Etapa / Tarea
              </div>
              <div style={{ display:"flex" }}>
                {headerCeldas.map((m,i)=>{
                  const esHoy = vista!=="ciclo" && m.label.includes("hoy");
                  return (
                    <div key={i} style={{ width:m.dias*DAY_W, minWidth:m.dias*DAY_W, padding:"10px 4px", fontSize:11, fontWeight:500, color: esHoy?"#2d6a4f":"#8a9e8a", textAlign:"center", whiteSpace:"nowrap", borderRight:"0.5px solid #e8efe8", background: esHoy?"#eef7f2":"transparent" }}>
                      {m.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Separador de sección */}
            {filas.length===0 ? (
              <div style={{ padding:"32px 20px", textAlign:"center", color:"#8a9e8a", fontSize:14 }}>
                Sin actividades en este período
              </div>
            ) : filas.map((fila, idx) => {
              const pL = bL(fila.planInicio);
              const pW2 = bW(fila.planInicio, fila.planFin);
              const rL = fila.realInicio ? bL(fila.realInicio) : null;
              const rW2 = fila.realInicio && fila.realFin ? bW(fila.realInicio, fila.realFin) : null;
              const hasReal = mostrarReal && fila.realInicio !== null;
              const diff2 = hasReal && fila.realInicio ? diffDias(fila.planInicio, fila.realInicio) : 0;
              const rowH = hasReal ? 56 : fila.esTarea ? 36 : 44;
              const c = fila.color;
              const barH = fila.esTarea ? 12 : 18;
              const barTop = fila.esTarea ? (rowH-barH)/2 : hasReal ? 6 : (rowH-barH)/2;

              // Separador visual entre etapas y tareas
              const prevEsTarea = idx>0 ? filas[idx-1].esTarea : false;
              const showSep = !prevEsTarea && fila.esTarea;

              return (
                <React.Fragment key={fila.id}>
                  {showSep && (
                    <div style={{ padding:"6px 14px", background:"#f4f7f4", borderTop:"1px solid #dce8dc", borderBottom:"1px solid #dce8dc", fontSize:10, fontWeight:700, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Labores intermedias
                    </div>
                  )}
                  <div style={{ display:"flex", borderBottom:"0.5px solid #eef2ee", alignItems:"center", minHeight:rowH, background: fila.esTarea?"#fafcfa":"#fff" }}
                    onMouseLeave={()=>setTooltip(null)}>
                    <div style={{ width:COL_W, minWidth:COL_W, padding:"6px 14px", borderRight:"1px solid #dce8dc", flexShrink:0 }}>
                      <div style={{ fontSize: fila.esTarea?12:13, color: fila.esTarea?"#556055":"#1a1f1a", lineHeight:1.3 }}>
                        {!fila.esTarea && (fila.confirmada?"✓ ":"")}
                        {fila.nombre}
                      </div>
                    </div>
                    <div style={{ flex:1, position:"relative", height:rowH, minWidth:TOTAL_W }}>
                      {hoyOff>=0&&hoyOff<=totalDias && <div style={{ position:"absolute",top:0,bottom:0,left:hoyOff*DAY_W,width:1.5,background:"#E24B4A",zIndex:2,pointerEvents:"none" }} />}
                      {hasReal&&diff2!==0&&rL!==null && (
                        <div style={{ position:"absolute",height:2,top:rowH/2,left:Math.min(pL+pW2/2,rL+(rW2??0)/2),width:Math.abs((rL+(rW2??0)/2)-(pL+pW2/2)),background:diff2>0?"#E24B4A":"#1D9E75",borderRadius:1,zIndex:1 }} />
                      )}
                      <div style={{ position:"absolute",height:barH,borderRadius:4,top:barTop,left:pL,width:pW2,background:(c as any).plan,color:(c as any).texto,fontSize:fila.esTarea?10:11,fontWeight:500,display:"flex",alignItems:"center",padding:"0 6px",overflow:"hidden",whiteSpace:"nowrap",cursor:"pointer",opacity:fila.confirmada?0.55:1 }}
                        onMouseEnter={(e)=>setTooltip({x:e.clientX,y:e.clientY,fila})}
                        onMouseMove={(e)=>setTooltip(t=>t?{...t,x:e.clientX,y:e.clientY}:null)}>
                        {pW2>60?fila.nombre:""}
                      </div>
                      {hasReal&&rL!==null&&rW2!==null && (
                        <div style={{ position:"absolute",height:barH,borderRadius:4,top:barTop+barH+4,left:rL,width:rW2,background:(c as any).real,color:(c as any).textoReal,fontSize:10,fontWeight:500,display:"flex",alignItems:"center",padding:"0 6px",overflow:"hidden",whiteSpace:"nowrap",cursor:"pointer" }}
                          onMouseEnter={(e)=>setTooltip({x:e.clientX,y:e.clientY,fila})}
                          onMouseMove={(e)=>setTooltip(t=>t?{...t,x:e.clientX,y:e.clientY}:null)}>
                          {rW2>40?"Real":""}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Leyenda */}
            <div style={{ display:"flex",gap:14,flexWrap:"wrap",padding:"10px 14px",borderTop:"1px solid #dce8dc",background:"#f4f7f4",borderRadius:"0 0 12px 12px",alignItems:"center" }}>
              {[{c:"#C0DD97",l:"Etapa planificada"},{c:"#4a8a0e",l:"Etapa real"},{c:"#fff0d8",l:"Labor/tarea"},{c:"#E24B4A",l:"Hoy/atraso",w:3},{c:"#1D9E75",l:"Adelanto",w:3}].map(it=>(
                <div key={it.l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#556055" }}>
                  <div style={{ width:it.w??14,height:8,borderRadius:it.w?0:2,background:it.c,border:it.c==="#e8f4fd"?"1px solid #b5d4f4":"none" }} />
                  <span>{it.l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:"fixed",left:Math.min(tooltip.x+14,window.innerWidth-220),top:Math.max(tooltip.y-10,8),background:"#fff",border:"0.5px solid #dce8dc",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#222",pointerEvents:"none",zIndex:100,minWidth:190,boxShadow:"0 4px 16px rgba(0,0,0,0.1)" }}>
          <div style={{ fontWeight:500,fontSize:13,marginBottom:6 }}>{tooltip.fila.nombre}</div>
          <div style={{ display:"flex",justifyContent:"space-between",gap:16,marginBottom:3 }}><span style={{color:"#999"}}>Plan inicio</span><span style={{fontWeight:500}}>{fmt(tooltip.fila.planInicio,"corto")}</span></div>
          <div style={{ display:"flex",justifyContent:"space-between",gap:16,marginBottom:3 }}><span style={{color:"#999"}}>Plan fin</span><span style={{fontWeight:500}}>{fmt(tooltip.fila.planFin,"corto")}</span></div>
          {tooltip.fila.realInicio && <>
            <div style={{ display:"flex",justifyContent:"space-between",gap:16,marginBottom:3 }}><span style={{color:"#999"}}>Real</span><span style={{fontWeight:500}}>{fmt(tooltip.fila.realInicio,"corto")}</span></div>
            {(()=>{ const d=diffDias(tooltip.fila.planInicio,tooltip.fila.realInicio!); return d===0?null:<div style={{marginTop:6,paddingTop:6,borderTop:"0.5px solid #eee",color:d>0?"#c0392b":"#0f7a5a"}}>{d>0?`Atraso ${d}d`:`Adelanto ${Math.abs(d)}d`}</div>; })()}
          </>}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap:    { maxWidth:980, margin:"0 auto", padding:"20px 16px", fontFamily:"system-ui" },
  stat:    { background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:8, padding:"8px 14px" },
  statL:   { fontSize:11, color:"#8a9e8a", marginBottom:2 },
  statV:   { fontSize:18, fontWeight:500 },
  btnVerde:{ fontSize:15, fontWeight:600, padding:"12px 20px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:10, cursor:"pointer" },
  btnNav:  { padding:"4px 10px", borderRadius:6, border:"1px solid #b8ceb8", background:"#fff", fontSize:14, cursor:"pointer", color:"#2d6a4f" },
};
