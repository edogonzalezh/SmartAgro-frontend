"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerLotes, obtenerResumenGlobal, confirmarEtapaConNotas, type Lote, type ResumenGlobal } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

const EMOJI: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", pimenton:"🫑", cebolla:"🧅", default:"🌱" };
function emojiC(fichaId: string) { return EMOJI[fichaId?.split("_")[0]] ?? EMOJI.default; }

function diasHasta(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((new Date(fecha).getTime()-hoy.getTime())/86400000);
}
function pct(etapas: Lote["etapas"]): number {
  if (!etapas.length) return 0;
  return Math.round(etapas.filter(e=>e.fechaReal).length/etapas.length*100);
}
function proximaPendiente(etapas: Lote["etapas"]) {
  return etapas.filter(e=>!e.fechaReal).sort((a,b)=>new Date(a.fechaPlanificada).getTime()-new Date(b.fechaPlanificada).getTime())[0]??null;
}
function colorU(dias: number) {
  if (dias<=0) return "#c0392b"; if (dias<=3) return "#e07b28"; if (dias<=7) return "#2d6a4f"; return "#8a9e8a";
}
function bgU(dias: number) {
  if (dias<=0) return "#fde8e6"; if (dias<=3) return "#fdefd8"; if (dias<=7) return "#d8ede2"; return "#f4f7f4";
}
function etiqDias(dias: number) {
  if (dias<0) return `Atrasada ${Math.abs(dias)}d`; if (dias===0) return "Hoy"; if (dias===1) return "Mañana"; return `En ${dias}d`;
}
function fmtPeso(n: number) {
  return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);
}

interface Confirmando { loteId:string; etapaCodigo:string; nombre:string; fechaInicio:string; fechaFin:string; notas:string; }

export default function InicioPage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [resumenEco, setResumenEco] = useState<ResumenGlobal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState<Confirmando|null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState<{nombre:string;diff:number}|null>(null);
  const [vistaLotes, setVistaLotes] = useState<"grid"|"lista">("grid");

  useEffect(()=>{
    if (autenticado===false) { router.push("/login"); return; }
    if (autenticado===true) cargar();
  },[autenticado]);

  async function cargar() {
    setCargando(true);
    Promise.all([obtenerLotes(), obtenerResumenGlobal()])
      .then(([l,r])=>{ setLotes(l); setResumenEco(r); })
      .finally(()=>setCargando(false));
  }

  async function handleConfirmar() {
    if (!confirmando) return;
    setGuardando(true);
    try {
      const res = await confirmarEtapaConNotas(confirmando.loteId, confirmando.etapaCodigo, confirmando.fechaInicio, confirmando.fechaFin||undefined, confirmando.notas||undefined) as any;
      setExito({ nombre:confirmando.nombre, diff:res?.diffDiasAplicado??0 });
      setConfirmando(null);
      await cargar();
    } finally { setGuardando(false); }
  }

  // Cálculos
  const todasPendientes = lotes.flatMap(l=>
    l.etapas.filter(e=>!e.fechaReal).map(e=>({ ...e, loteId:l.id, loteNombre:l.nombre, fichaId:l.fichaId, dias:diasHasta(e.fechaPlanificada) }))
  ).sort((a,b)=>a.dias-b.dias);

  const urgentes   = todasPendientes.filter(e=>e.dias<=0);
  const hoyCount   = todasPendientes.filter(e=>e.dias===0).length;
  const semana     = todasPendientes.filter(e=>e.dias>=0&&e.dias<=7);
  const proximas14 = todasPendientes.filter(e=>e.dias>=0&&e.dias<=14);
  const completados = lotes.filter(l=>pct(l.etapas)===100).length;

  const totalGastos   = resumenEco.reduce((s,r)=>s+r.totalGastos,0);
  const totalIngresos = resumenEco.reduce((s,r)=>s+r.totalIngresos,0);
  const margen        = totalIngresos-totalGastos;
  const hayEco        = resumenEco.some(r=>r.totalGastos>0||r.totalIngresos>0);

  if (cargando) return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="SmartAgro" />
      <div style={{ textAlign:"center", padding:60, color:"#8a9e8a" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="SmartAgro" subtitulo="Panel de control" />

      <div style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px" }}>

        {/* Éxito tras confirmar */}
        {exito && (
          <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700, color:"#2d6a4f" }}>✅ {exito.nombre} registrada</div>
            {exito.diff!==0 && <div style={{ fontSize:13, color:"#556055", marginTop:3 }}>{exito.diff>0?`Calendario ajustado ${exito.diff} días hacia adelante.`:`Calendario adelantado ${Math.abs(exito.diff)} días.`}</div>}
          </div>
        )}

        {/* ── 1. Métricas ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:20 }}>
          {[
            { label:"Lotes activos",    valor:lotes.length,      color:"#2d6a4f", bg:"#d8ede2", emoji:"🌱" },
            { label:"Para hoy",         valor:hoyCount,           color:hoyCount>0?"#c0392b":"#2d6a4f", bg:hoyCount>0?"#fde8e6":"#d8ede2", emoji:"📅" },
            { label:"Esta semana",      valor:semana.length,      color:"#e07b28", bg:"#fdefd8", emoji:"📋" },
            { label:"Atrasadas",        valor:urgentes.length,    color:urgentes.length>0?"#c0392b":"#8a9e8a", bg:urgentes.length>0?"#fde8e6":"#f4f7f4", emoji:"⚠️" },
            { label:"Ciclos completos", valor:completados,        color:"#0f7a5a", bg:"#c8f0e0", emoji:"✅" },
          ].map(m=>(
            <div key={m.label} style={{ background:m.bg, border:`1px solid ${m.color}30`, borderRadius:12, padding:"12px 10px", textAlign:"center" as const }}>
              <div style={{ fontSize:22 }}>{m.emoji}</div>
              <div style={{ fontSize:26, fontWeight:800, color:m.color, lineHeight:1.1, marginTop:3 }}>{m.valor}</div>
              <div style={{ fontSize:11, color:"#556055", marginTop:3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* ── 2. Etapas urgentes con confirmación inline ── */}
        {(urgentes.length>0||hoyCount>0||proximas14.length>0) && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:12 }}>
              {urgentes.length>0||hoyCount>0 ? "🔴 Requieren atención" : "📋 Próximas labores"}
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {proximas14.length===0 && urgentes.length===0 && (
                <p style={{ fontSize:14, color:"#8a9e8a", textAlign:"center" as const, padding:"8px 0" }}>Sin labores en los próximos 14 días.</p>
              )}
              {[...urgentes, ...proximas14].slice(0,8).map((etapa,i)=>{
                const key = `${etapa.loteId}-${etapa.etapaCodigo}`;
                const estaConf = confirmando?.loteId===etapa.loteId && confirmando?.etapaCodigo===etapa.etapaCodigo;
                return (
                  <div key={i} style={{ border:"1px solid #dce8dc", borderRadius:8, overflow:"hidden", display:"flex" }}>
                    <div style={{ width:4, background:colorU(etapa.dias), flexShrink:0 }} />
                    <div style={{ flex:1, padding:"12px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600 }}>{emojiC(etapa.fichaId)} {etapa.nombre}</div>
                          <div style={{ fontSize:12, color:"#8a9e8a", marginTop:2 }}>{etapa.loteNombre} · {new Date(etapa.fechaPlanificada).toLocaleDateString("es-CL",{day:"numeric",month:"long"})}</div>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:99, background:bgU(etapa.dias), color:colorU(etapa.dias), whiteSpace:"nowrap", marginLeft:10 }}>
                          {etiqDias(etapa.dias)}
                        </span>
                      </div>
                      {estaConf ? (
                        <div style={{ marginTop:12, background:"#f4f7f4", borderRadius:8, padding:"12px" }}>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                            <div>
                              <label style={lbl}>Fecha inicio</label>
                              <input type="date" value={confirmando.fechaInicio} onChange={e=>setConfirmando(p=>p?{...p,fechaInicio:e.target.value}:null)} style={inp} />
                            </div>
                            <div>
                              <label style={lbl}>Fecha término</label>
                              <input type="date" value={confirmando.fechaFin} onChange={e=>setConfirmando(p=>p?{...p,fechaFin:e.target.value}:null)} style={inp} />
                            </div>
                          </div>
                          <input type="text" value={confirmando.notas} onChange={e=>setConfirmando(p=>p?{...p,notas:e.target.value}:null)} placeholder="Observaciones opcionales..." style={{...inp, marginBottom:8}} />
                          <div style={{ fontSize:12, color:"#556055", background:"#fff", borderRadius:6, padding:"6px 10px", borderLeft:"3px solid #52b788", marginBottom:8 }}>
                            💡 El calendario se ajustará automáticamente según la fecha real.
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={handleConfirmar} disabled={guardando} style={{ flex:1, padding:"9px 0", background:guardando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                              {guardando?"Guardando...":"Guardar y actualizar calendario"}
                            </button>
                            <button onClick={()=>setConfirmando(null)} style={{ padding:"9px 14px", background:"transparent", color:"#8a9e8a", border:"1px solid #dce8dc", borderRadius:8, fontSize:13, cursor:"pointer" }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={()=>{ const hoy=new Date().toISOString().split("T")[0]; setConfirmando({loteId:etapa.loteId,etapaCodigo:etapa.etapaCodigo,nombre:etapa.nombre,fechaInicio:hoy,fechaFin:hoy,notas:""}); setExito(null); }}
                          style={{ marginTop:10, padding:"7px 14px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                          Registrar cuándo la hice →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 3. Resumen económico ── */}
        {hayEco && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:14 }}>
              💰 Resumen económico
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:12 }}>
              {[
                { label:"Gastos",   valor:fmtPeso(totalGastos),   color:"#c0392b", bg:"#fde8e6", emoji:"💸" },
                { label:"Ingresos", valor:fmtPeso(totalIngresos), color:"#2d6a4f", bg:"#d8ede2", emoji:"💰" },
                { label:"Margen",   valor:fmtPeso(margen),        color:margen>=0?"#2d6a4f":"#c0392b", bg:margen>=0?"#d8ede2":"#fde8e6", emoji:margen>=0?"📈":"📉" },
              ].map(m=>(
                <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:"10px", textAlign:"center" as const }}>
                  <div style={{ fontSize:18 }}>{m.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:m.color, marginTop:2 }}>{m.valor}</div>
                  <div style={{ fontSize:10, color:"#556055", marginTop:1 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <Link href="/economico" style={{ fontSize:13, color:"#2d6a4f", fontWeight:600 }}>Ver detalle económico →</Link>
          </div>
        )}

        {/* ── 4. Estado de todos los lotes ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#556055", textTransform:"uppercase" as const, letterSpacing:"0.07em" }}>
            Mis cultivos ({lotes.length})
          </div>
          <div style={{ display:"flex", border:"1px solid #dce8dc", borderRadius:6, overflow:"hidden" }}>
            {(["grid","lista"] as const).map(v=>(
              <button key={v} onClick={()=>setVistaLotes(v)} style={{ padding:"5px 12px", border:"none", fontSize:13, cursor:"pointer", background:vistaLotes===v?"#2d6a4f":"#fff", color:vistaLotes===v?"#fff":"#8a9e8a" }}>
                {v==="grid"?"⊞":"☰"}
              </button>
            ))}
          </div>
        </div>

        {lotes.length===0 && (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dce8dc", padding:"40px 24px", textAlign:"center" as const }}>
            <div style={{fontSize:48,marginBottom:12}}>🌱</div>
            <p style={{fontSize:16,fontWeight:600}}>Sin cultivos activos</p>
            <p style={{fontSize:14,color:"#8a9e8a",marginTop:6,marginBottom:16}}>Crea tu primer lote para comenzar.</p>
            <Link href="/nuevo-lote"><button style={{ padding:"10px 20px", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>+ Crear primer lote</button></Link>
          </div>
        )}

        <div style={{ display:vistaLotes==="grid"?"grid":"flex", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", flexDirection:"column" as const, gap:12 }}>
          {lotes.map(lote=>{
            const p=pct(lote.etapas), prox=proximaPendiente(lote.etapas);
            const dias=prox?diasHasta(prox.fechaPlanificada):null;
            const confirmadas=lote.etapas.filter(e=>e.fechaReal).length;
            return (
              <div key={lote.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, overflow:"hidden" }}>
                <div style={{ height:4, background:"#eef2ee" }}>
                  <div style={{ height:"100%", width:`${p}%`, background:p===100?"#52b788":"#2d6a4f" }} />
                </div>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <span style={{fontSize:26}}>{emojiC(lote.fichaId)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lote.nombre}</div>
                      <div style={{ fontSize:11, color:"#8a9e8a" }}>{lote.fichaId?.split("_")[0]?.replace(/^./,c=>c.toUpperCase())} · {lote.fichaId?.split("_")[1]?.replace(/^./,c=>c.toUpperCase())}</div>
                    </div>
                    <span style={{ fontSize:15, fontWeight:800, color:p===100?"#52b788":"#2d6a4f" }}>{p}%</span>
                  </div>
                  <div style={{ display:"flex", gap:2, marginBottom:6 }}>
                    {lote.etapas.map((e,i)=>(
                      <div key={i} style={{ flex:1, height:5, borderRadius:3, background:e.fechaReal?"#52b788":"#dce8dc" }} title={e.nombre} />
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"#8a9e8a", marginBottom:8 }}>{confirmadas}/{lote.etapas.length} etapas</div>
                  {p===100 ? (
                    <div style={{ fontSize:12, color:"#52b788", fontWeight:600 }}>✅ Ciclo completado</div>
                  ) : prox&&dias!==null ? (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:bgU(dias), borderRadius:6, padding:"6px 10px" }}>
                      <span style={{ fontSize:12, fontWeight:500 }}>{prox.nombre}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:colorU(dias), marginLeft:8 }}>{etiqDias(dias)}</span>
                    </div>
                  ) : null}
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    <Link href="/mis-lotes" style={{ flex:1 }}>
                      <button style={{ width:"100%", padding:"6px 0", background:"#f4f7f4", color:"#2d6a4f", border:"1px solid #dce8dc", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>Ver detalle</button>
                    </Link>
                    <Link href="/calendario"><button style={{ padding:"6px 10px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:12, cursor:"pointer" }}>📅</button></Link>
                    <Link href="/economico"><button style={{ padding:"6px 10px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:12, cursor:"pointer" }}>💰</button></Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:4 };
const inp: React.CSSProperties = { fontSize:14, padding:"8px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%", background:"#fff" };
