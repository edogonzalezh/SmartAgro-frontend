"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type Lote } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const COLORES: Record<string, { plan: string; real: string; texto: string; textoReal: string }> = {
  "bar-green":  { plan:"#C0DD97", real:"#4a8a0e", texto:"#27500A", textoReal:"#fff" },
  "bar-teal":   { plan:"#9FE1CB", real:"#0f7a5a", texto:"#085041", textoReal:"#fff" },
  "bar-blue":   { plan:"#B5D4F4", real:"#1a6bbf", texto:"#0C447C", textoReal:"#fff" },
  "bar-amber":  { plan:"#FAC775", real:"#a0620a", texto:"#633806", textoReal:"#fff" },
  "bar-coral":  { plan:"#F5C4B3", real:"#c04a22", texto:"#712B13", textoReal:"#fff" },
  "bar-purple": { plan:"#CECBF6", real:"#5a52c0", texto:"#3C3489", textoReal:"#fff" },
};

const ETAPAS_CONFIG = [
  { codigo:"almacigo",          nombre:"Siembra almácigo",     sub:"",                        color:"bar-green"  },
  { codigo:"trasplante",        nombre:"Trasplante",            sub:"",                        color:"bar-green"  },
  { codigo:"fertilizacion_1",   nombre:"1ª fertilización",     sub:"7 días post trasplante",  color:"bar-teal"   },
  { codigo:"tutorado",          nombre:"Tutorado",              sub:"18 días post trasplante", color:"bar-teal"   },
  { codigo:"floracion",         nombre:"Inicio floración",      sub:"",                        color:"bar-blue"   },
  { codigo:"monitoreo_plagas_1",nombre:"Monitoreo plagas",      sub:"Tuta absoluta",           color:"bar-amber"  },
  { codigo:"fertilizacion_2",   nombre:"2ª fertilización",      sub:"10 días post floración",  color:"bar-teal"   },
  { codigo:"fructificacion",    nombre:"Inicio fructificación", sub:"",                        color:"bar-blue"   },
  { codigo:"inicio_cosecha",    nombre:"Inicio cosecha",        sub:"",                        color:"bar-coral"  },
  { codigo:"fin_cosecha",       nombre:"Fin cosecha",           sub:"",                        color:"bar-purple" },
  { codigo:"cosecha",           nombre:"Cosecha",               sub:"",                        color:"bar-coral"  },
];

function parseFecha(s) { return new Date(s); }
function fmt(d) { return d.toLocaleDateString("es-CL", { day:"numeric", month:"short" }); }
function diffDias(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function construirEtapas(lote) {
  const map = new Map(lote.etapas.map((e) => [e.etapaCodigo, e]));
  return ETAPAS_CONFIG.reduce((acc, cfg) => {
    const etapa = map.get(cfg.codigo);
    if (!etapa) return acc;
    const planInicio = parseFecha(etapa.fechaPlanificada);
    const planFin = new Date(planInicio.getTime() + 86400000);
    const realInicio = etapa.fechaReal ? parseFecha(etapa.fechaReal) : null;
    const realFin = realInicio ? new Date(realInicio.getTime() + 86400000) : null;
    acc.push({ ...cfg, planInicio, planFin, realInicio, realFin, confirmada: !!etapa.fechaReal });
    return acc;
  }, []);
}

export default function CalendarioGanttPage() {
  const [lotes, setLotes] = useState([]);
  const [loteActivo, setLoteActivo] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [mostrarReal, setMostrarReal] = useState(true);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/lotes`)
      .then((r) => r.json())
      .then((data) => { setLotes(data); if (data.length > 0) setLoteActivo(data[0]); })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <div style={s.wrap}><p style={{ color:"#666", fontSize:16 }}>Cargando calendario...</p></div>;
  if (!loteActivo) return (
    <div style={s.wrap}>
      <p style={{ color:"#666", marginBottom:16 }}>No tienes lotes registrados.</p>
      <Link href="/nuevo-lote"><button style={s.btnPrimary}>+ Crear primer lote</button></Link>
    </div>
  );

  const etapas = construirEtapas(loteActivo);
  if (!etapas.length) return <div style={s.wrap}><p>Sin etapas para mostrar.</p></div>;

  const fechaMin = etapas.reduce((m, e) => e.planInicio < m ? e.planInicio : m, etapas[0].planInicio);
  const fechaMax = etapas.reduce((m, e) => e.planFin > m ? e.planFin : m, etapas[0].planFin);
  const totalDias = diffDias(fechaMin, fechaMax) + 2;
  const DAY_W = 5 * zoom;
  const TOTAL_W = totalDias * DAY_W;
  const COL_W = 190;
  const hoy = new Date();
  const hoyOffset = diffDias(fechaMin, hoy);

  const meses = [];
  let cur = new Date(fechaMin.getFullYear(), fechaMin.getMonth(), 1);
  while (cur <= fechaMax) {
    const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const s2 = Math.max(0, diffDias(fechaMin, cur));
    const e2 = Math.min(totalDias, diffDias(fechaMin, next));
    meses.push({ label: cur.toLocaleDateString("es-CL", { month:"short", year:"2-digit" }), dias: e2 - s2 });
    cur = next;
  }

  const confirmadas = etapas.filter((e) => e.confirmada && e.realInicio);
  const diffs = confirmadas.map((e) => diffDias(e.planInicio, e.realInicio));
  const avgDiff = diffs.length ? Math.round(diffs.reduce((a,b)=>a+b,0)/diffs.length) : null;
  const maxDelay = diffs.length ? Math.max(...diffs) : null;
  const etapaMaxDelay = maxDelay !== null ? confirmadas[diffs.indexOf(maxDelay)] : null;

  const bL = (f) => diffDias(fechaMin, f) * DAY_W;
  const bW = (a, b) => Math.max(diffDias(a, b) * DAY_W, 6);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h1 style={s.titulo}>Calendario del cultivo</h1>
          <p style={s.subtitulo}>{loteActivo.nombre}</p>
        </div>
        <Link href="/"><button style={s.btnSec}>← Inicio</button></Link>
      </div>

      {lotes.length > 1 && (
        <div style={{ marginBottom:16 }}>
          <label style={s.label}>Lote </label>
          <select style={s.select} value={loteActivo.id} onChange={(e) => setLoteActivo(lotes.find((l) => l.id === e.target.value) ?? loteActivo)}>
            {lotes.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </div>
      )}

      {confirmadas.length > 0 && (
        <div style={s.statsRow}>
          <div style={s.stat}><div style={s.statL}>Etapas confirmadas</div><div style={s.statV}>{confirmadas.length} / {etapas.length}</div></div>
          {avgDiff !== null && <div style={s.stat}><div style={s.statL}>Desviación promedio</div><div style={{ ...s.statV, color: avgDiff>0?"#c0392b":avgDiff<0?"#0f7a5a":"inherit" }}>{avgDiff>0?"+":""}{avgDiff} días</div></div>}
          {etapaMaxDelay && maxDelay > 0 && <div style={s.stat}><div style={s.statL}>Mayor atraso</div><div style={{ ...s.statV, color:"#c0392b" }}>+{maxDelay}d · {etapaMaxDelay.nombre}</div></div>}
        </div>
      )}

      <div style={s.controles}>
        <span style={s.label}>Zoom</span>
        <button style={s.btnZoom} onClick={() => setZoom((z) => Math.max(0.5, z-0.25))}>−</button>
        <span style={s.zoomV}>{Math.round(zoom*100)}%</span>
        <button style={s.btnZoom} onClick={() => setZoom((z) => Math.min(3, z+0.25))}>+</button>
        <button style={{ ...s.btnToggle, ...(mostrarReal?s.btnToggleA:{}) }} onClick={() => setMostrarReal((v)=>!v)}>
          {mostrarReal ? "Planificado + real" : "Solo planificado"}
        </button>
      </div>

      <div style={s.ganttOuter}>
        <div style={{ minWidth: COL_W + TOTAL_W }}>

          <div style={s.ganttH}>
            <div style={{ ...s.colL, width:COL_W, minWidth:COL_W }}>Etapa</div>
            <div style={{ display:"flex" }}>
              {meses.map((m,i) => <div key={i} style={{ ...s.mesC, width:m.dias*DAY_W, minWidth:m.dias*DAY_W }}>{m.label}</div>)}
            </div>
          </div>

          {etapas.map((etapa, idx) => {
            const c = COLORES[etapa.color] ?? COLORES["bar-green"];
            const pL = bL(etapa.planInicio), pW2 = bW(etapa.planInicio, etapa.planFin);
            const rL = etapa.realInicio ? bL(etapa.realInicio) : null;
            const rW2 = etapa.realInicio && etapa.realFin ? bW(etapa.realInicio, etapa.realFin) : null;
            const hasReal = mostrarReal && etapa.realInicio !== null;
            const diff = hasReal && etapa.realInicio ? diffDias(etapa.planInicio, etapa.realInicio) : 0;
            const rowH = hasReal ? 56 : 44;

            return (
              <div key={idx} style={{ ...s.ganttRow, minHeight:rowH }}>
                <div style={{ ...s.rowL, width:COL_W, minWidth:COL_W }}>
                  <div style={s.rowN}>{etapa.confirmada?"✓ ":""}{etapa.nombre}</div>
                  {etapa.sub && <div style={s.rowS}>{etapa.sub}</div>}
                </div>
                <div style={{ flex:1, position:"relative", height:rowH, width:TOTAL_W, minWidth:TOTAL_W }}>
                  {hoyOffset>=0&&hoyOffset<=totalDias && <div style={{ position:"absolute",top:0,bottom:0,left:hoyOffset*DAY_W,width:1.5,background:"#E24B4A",zIndex:2,pointerEvents:"none" }} />}
                  {hasReal && diff!==0 && rL!==null && (
                    <div style={{ position:"absolute",height:2,top:hasReal?26:20,left:Math.min(pL+pW2/2,rL+(rW2??0)/2),width:Math.abs((rL+(rW2??0)/2)-(pL+pW2/2)),background:diff>0?"#E24B4A":"#1D9E75",borderRadius:1,zIndex:1 }} />
                  )}
                  <div style={{ position:"absolute",height:18,borderRadius:4,top:hasReal?6:13,left:pL,width:pW2,background:c.plan,color:c.texto,fontSize:11,fontWeight:500,display:"flex",alignItems:"center",padding:"0 6px",overflow:"hidden",whiteSpace:"nowrap",cursor:"default",opacity:etapa.confirmada?0.55:1 }}
                    onMouseEnter={(e)=>setTooltip({x:e.clientX,y:e.clientY,etapa})}
                    onMouseLeave={()=>setTooltip(null)}
                    onMouseMove={(e)=>setTooltip((t)=>t?{...t,x:e.clientX,y:e.clientY}:null)}>
                    {pW2>60?etapa.nombre:""}
                  </div>
                  {hasReal&&rL!==null&&rW2!==null && (
                    <div style={{ position:"absolute",height:18,borderRadius:4,top:32,left:rL,width:rW2,background:c.real,color:c.textoReal,fontSize:11,fontWeight:500,display:"flex",alignItems:"center",padding:"0 6px",overflow:"hidden",whiteSpace:"nowrap",cursor:"default" }}
                      onMouseEnter={(e)=>setTooltip({x:e.clientX,y:e.clientY,etapa})}
                      onMouseLeave={()=>setTooltip(null)}
                      onMouseMove={(e)=>setTooltip((t)=>t?{...t,x:e.clientX,y:e.clientY}:null)}>
                      {rW2>40?"Real":""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div style={s.leyenda}>
            {[{c:"#C0DD97",l:"Planificado"},{c:"#4a8a0e",l:"Real confirmado"},{c:"#E24B4A",l:"Hoy / atraso",w:3},{c:"#1D9E75",l:"Adelanto",w:3}].map((it)=>(
              <div key={it.l} style={s.leyI}><div style={{ width:it.w??14,height:8,borderRadius:it.w?0:2,background:it.c }} /><span>{it.l}</span></div>
            ))}
          </div>
        </div>
      </div>

      {tooltip && (
        <div style={{ position:"fixed",left:Math.min(tooltip.x+14,window.innerWidth-220),top:Math.max(tooltip.y-10,8),background:"#fff",border:"0.5px solid #ddd",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#222",pointerEvents:"none",zIndex:100,minWidth:190,boxShadow:"0 4px 16px rgba(0,0,0,0.12)" }}>
          <div style={{ fontWeight:500,fontSize:13,marginBottom:6 }}>{tooltip.etapa.nombre}</div>
          <div style={s.tR}><span style={s.tL}>Plan inicio</span><span style={s.tV}>{fmt(tooltip.etapa.planInicio)}</span></div>
          <div style={s.tR}><span style={s.tL}>Plan fin</span><span style={s.tV}>{fmt(tooltip.etapa.planFin)}</span></div>
          {tooltip.etapa.realInicio && <>
            <div style={s.tR}><span style={s.tL}>Real inicio</span><span style={s.tV}>{fmt(tooltip.etapa.realInicio)}</span></div>
            {tooltip.etapa.realFin && <div style={s.tR}><span style={s.tL}>Real fin</span><span style={s.tV}>{fmt(tooltip.etapa.realFin)}</span></div>}
            {(()=>{ const d=diffDias(tooltip.etapa.planInicio,tooltip.etapa.realInicio); return d===0?<div style={{marginTop:6,paddingTop:6,borderTop:"0.5px solid #eee",color:"#0f7a5a",fontSize:12}}>Sin desviación</div>:<div style={{marginTop:6,paddingTop:6,borderTop:"0.5px solid #eee",color:d>0?"#c0392b":"#0f7a5a",fontSize:12}}>{d>0?`Atraso de ${d} días`:`Adelanto de ${Math.abs(d)} días`}</div>; })()}
          </>}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap:       { maxWidth:960, margin:"0 auto", padding:"16px", fontFamily:"system-ui" },
  header:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  titulo:     { fontSize:24, fontWeight:700, marginBottom:2 },
  subtitulo:  { fontSize:14, color:"#666" },
  label:      { fontSize:13, color:"#666" },
  select:     { fontSize:15, padding:"8px 10px", borderRadius:8, border:"1px solid #ccc", marginLeft:8 },
  statsRow:   { display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" },
  stat:       { background:"#f5f5f5", border:"0.5px solid #e0e0e0", borderRadius:8, padding:"8px 14px" },
  statL:      { fontSize:11, color:"#999", marginBottom:2 },
  statV:      { fontSize:18, fontWeight:500 },
  controles:  { display:"flex", alignItems:"center", gap:8, marginBottom:14, flexWrap:"wrap" },
  btnZoom:    { padding:"4px 12px", borderRadius:6, border:"0.5px solid #bbb", background:"#fff", fontSize:14, cursor:"pointer" },
  zoomV:      { fontSize:13, fontWeight:500, minWidth:36, textAlign:"center" },
  btnToggle:  { padding:"4px 12px", borderRadius:6, border:"0.5px solid #bbb", background:"#fff", color:"#666", fontSize:13, cursor:"pointer", marginLeft:8 },
  btnToggleA: { background:"#e8f4fd", color:"#1a6bbf", borderColor:"#9ac6f0" },
  btnPrimary: { fontSize:16, fontWeight:600, padding:"12px 18px", background:"#2e7d32", color:"#fff", border:"none", borderRadius:10, cursor:"pointer" },
  btnSec:     { fontSize:14, padding:"8px 14px", background:"#fff", border:"0.5px solid #ccc", borderRadius:8, cursor:"pointer" },
  ganttOuter: { overflowX:"auto", border:"0.5px solid #e0e0e0", borderRadius:12, background:"#fff" },
  ganttH:     { display:"flex", borderBottom:"0.5px solid #e0e0e0", background:"#f9f9f9", position:"sticky", top:0, zIndex:3 },
  colL:       { padding:"10px 14px", fontSize:12, fontWeight:500, color:"#666", borderRight:"0.5px solid #e0e0e0" },
  mesC:       { padding:"10px 6px", fontSize:12, fontWeight:500, color:"#666", textAlign:"center", whiteSpace:"nowrap", borderRight:"0.5px solid #d0d0d0" },
  ganttRow:   { display:"flex", borderBottom:"0.5px solid #f0f0f0", alignItems:"center" },
  rowL:       { padding:"8px 14px", borderRight:"0.5px solid #e0e0e0", flexShrink:0 },
  rowN:       { fontSize:13, lineHeight:1.4 },
  rowS:       { fontSize:11, color:"#999", marginTop:2 },
  leyenda:    { display:"flex", gap:14, flexWrap:"wrap", padding:"10px 14px", borderTop:"0.5px solid #e0e0e0", background:"#f9f9f9", borderRadius:"0 0 12px 12px", alignItems:"center" },
  leyI:       { display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#666" },
  tR:         { display:"flex", justifyContent:"space-between", gap:16, marginBottom:3 },
  tL:         { color:"#999" },
  tV:         { fontWeight:500 },
};
