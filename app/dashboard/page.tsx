"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { obtenerLotes, obtenerResumenGlobal, type Lote, type ResumenGlobal } from "@/lib/api";
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
function colorU(dias: number): string {
  if (dias<=0) return "#c0392b";
  if (dias<=3) return "#e07b28";
  if (dias<=7) return "#2d6a4f";
  return "#8a9e8a";
}
function bgU(dias: number): string {
  if (dias<=0) return "#fde8e6";
  if (dias<=3) return "#fdefd8";
  if (dias<=7) return "#d8ede2";
  return "#f4f7f4";
}
function etiqDias(dias: number): string {
  if (dias<0) return `Atrasada ${Math.abs(dias)}d`;
  if (dias===0) return "Hoy";
  if (dias===1) return "Mañana";
  return `En ${dias}d`;
}
function fmtPeso(n: number): string {
  return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n);
}

interface EtapaPend {
  loteId:string; loteNombre:string; fichaId:string;
  etapaCodigo:string; nombre:string; fechaPlanificada:string; dias:number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [resumenEco, setResumenEco] = useState<ResumenGlobal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vistaLotes, setVistaLotes] = useState<"grid"|"lista">("grid");

  useEffect(()=>{
    if (autenticado===false) { router.push("/login"); return; }
    if (autenticado===true) {
      Promise.all([obtenerLotes(), obtenerResumenGlobal()])
        .then(([l,r])=>{ setLotes(l); setResumenEco(r); })
        .finally(()=>setCargando(false));
    }
  },[autenticado]);

  const todasPendientes: EtapaPend[] = lotes.flatMap(l=>
    l.etapas.filter(e=>!e.fechaReal).map(e=>({
      loteId:l.id, loteNombre:l.nombre, fichaId:l.fichaId,
      etapaCodigo:e.etapaCodigo, nombre:e.nombre,
      fechaPlanificada:e.fechaPlanificada,
      dias:diasHasta(e.fechaPlanificada),
    }))
  ).sort((a,b)=>a.dias-b.dias);

  const hoyCount    = todasPendientes.filter(e=>e.dias===0).length;
  const semanaCount = todasPendientes.filter(e=>e.dias>=0&&e.dias<=7).length;
  const completados = lotes.filter(l=>pct(l.etapas)===100).length;
  const atrasadas   = todasPendientes.filter(e=>e.dias<0);
  const proximas7   = todasPendientes.filter(e=>e.dias>=0&&e.dias<=7);

  const totalGastos   = resumenEco.reduce((s,r)=>s+r.totalGastos,0);
  const totalIngresos = resumenEco.reduce((s,r)=>s+r.totalIngresos,0);
  const margenGlobal  = totalIngresos-totalGastos;
  const hayEco        = resumenEco.some(r=>r.totalGastos>0||r.totalIngresos>0);

  if (cargando) return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Dashboard" subtitulo="Resumen de tu temporada" />
      <div style={{ textAlign:"center", padding:60, color:"#8a9e8a" }}>Cargando...</div>
    </div>
  );

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Dashboard" subtitulo="Resumen de tu temporada" />

      <div style={{ maxWidth:900, margin:"0 auto", padding:"24px 16px" }}>

        {/* Métricas de cultivo */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:20 }}>
          {[
            { label:"Lotes activos",   valor:lotes.length,       color:"#2d6a4f", bg:"#d8ede2", emoji:"🌱" },
            { label:"Para hoy",        valor:hoyCount,            color:hoyCount>0?"#c0392b":"#2d6a4f", bg:hoyCount>0?"#fde8e6":"#d8ede2", emoji:"📅" },
            { label:"Esta semana",     valor:semanaCount,         color:"#e07b28", bg:"#fdefd8", emoji:"📋" },
            { label:"Atrasadas",       valor:atrasadas.length,    color:atrasadas.length>0?"#c0392b":"#8a9e8a", bg:atrasadas.length>0?"#fde8e6":"#f4f7f4", emoji:"⚠️" },
            { label:"Ciclos completos",valor:completados,         color:"#0f7a5a", bg:"#c8f0e0", emoji:"✅" },
          ].map(m=>(
            <div key={m.label} style={{ background:m.bg, border:`1px solid ${m.color}30`, borderRadius:12, padding:"14px 10px", textAlign:"center" as const }}>
              <div style={{ fontSize:24 }}>{m.emoji}</div>
              <div style={{ fontSize:28, fontWeight:800, color:m.color, lineHeight:1.1, marginTop:4 }}>{m.valor}</div>
              <div style={{ fontSize:11, color:"#556055", marginTop:3 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Resumen económico */}
        {hayEco && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:14 }}>
              💰 Resumen económico de la temporada
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { label:"Total gastos",   valor:fmtPeso(totalGastos),   color:"#c0392b", bg:"#fde8e6", emoji:"💸" },
                { label:"Total ingresos", valor:fmtPeso(totalIngresos), color:"#2d6a4f", bg:"#d8ede2", emoji:"💰" },
                { label:"Margen neto",    valor:fmtPeso(margenGlobal),  color:margenGlobal>=0?"#2d6a4f":"#c0392b", bg:margenGlobal>=0?"#d8ede2":"#fde8e6", emoji:margenGlobal>=0?"📈":"📉" },
              ].map(m=>(
                <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:"12px 10px", textAlign:"center" as const }}>
                  <div style={{ fontSize:20 }}>{m.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:m.color, marginTop:3, lineHeight:1.2 }}>{m.valor}</div>
                  <div style={{ fontSize:10, color:"#556055", marginTop:2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...resumenEco].filter(r=>r.totalGastos>0||r.totalIngresos>0)
                .sort((a,b)=>b.margen-a.margen)
                .map(r=>(
                <div key={r.loteId} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", background:"#f4f7f4", borderRadius:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.loteNombre}</div>
                    <div style={{ fontSize:11, color:"#8a9e8a" }}>{r.fichaNombre}</div>
                  </div>
                  <div style={{ textAlign:"right" as const, flexShrink:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:r.margen>=0?"#2d6a4f":"#c0392b" }}>{fmtPeso(r.margen)}</div>
                    <div style={{ fontSize:10, color:"#8a9e8a" }}>
                      {r.totalGastos>0?`${fmtPeso(r.totalGastos)} gastos`:"Sin gastos"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:10, textAlign:"right" as const }}>
              <Link href="/economico" style={{ fontSize:13, color:"#2d6a4f", fontWeight:600 }}>Ver detalle económico →</Link>
            </div>
          </div>
        )}

        {/* Alertas urgentes */}
        {(atrasadas.length>0||hoyCount>0) && (
          <div style={{ background:"#fde8e6", border:"1px solid #f5b8b5", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#c0392b", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:10 }}>
              🔴 Requieren atención inmediata
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[...atrasadas,...todasPendientes.filter(e=>e.dias===0)].slice(0,5).map((e,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"#fff", borderRadius:8, padding:"10px 14px" }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{e.nombre}</div>
                    <div style={{ fontSize:12, color:"#8a9e8a" }}>{e.loteNombre}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#c0392b", background:"#fde8e6", padding:"3px 10px", borderRadius:99 }}>{etiqDias(e.dias)}</span>
                    <Link href="/"><button style={{ padding:"5px 10px", background:"#c0392b", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>Confirmar</button></Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos 7 días */}
        {proximas7.length>0 && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"16px 18px", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:12 }}>
              📅 Próximos 7 días ({proximas7.length} actividades)
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {proximas7.map((e,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:bgU(e.dias), borderRadius:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:colorU(e.dias), flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{e.nombre}</span>
                    <span style={{ fontSize:12, color:"#8a9e8a", marginLeft:8 }}>{e.loteNombre}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:colorU(e.dias), whiteSpace:"nowrap" }}>
                    {new Date(e.fechaPlanificada).toLocaleDateString("es-CL",{day:"numeric",month:"short"})} · {etiqDias(e.dias)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estado de cultivos */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#556055", textTransform:"uppercase" as const, letterSpacing:"0.07em" }}>
            Estado de cultivos ({lotes.length})
          </div>
          <div style={{ display:"flex", border:"1px solid #dce8dc", borderRadius:6, overflow:"hidden" }}>
            {(["grid","lista"] as const).map(v=>(
              <button key={v} onClick={()=>setVistaLotes(v)}
                style={{ padding:"5px 12px", border:"none", fontSize:13, cursor:"pointer", background:vistaLotes===v?"#2d6a4f":"#fff", color:vistaLotes===v?"#fff":"#8a9e8a" }}>
                {v==="grid"?"⊞":"☰"}
              </button>
            ))}
          </div>
        </div>

        {lotes.length===0 && (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #dce8dc", padding:"40px 24px", textAlign:"center" as const }}>
            <div style={{fontSize:48,marginBottom:12}}>🌱</div>
            <p style={{fontSize:16,fontWeight:600}}>Sin cultivos activos</p>
            <p style={{fontSize:14,color:"#8a9e8a",marginTop:6,marginBottom:16}}>Crea tu primer lote para ver el resumen aquí.</p>
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
                <div style={{ height:5, background:"#eef2ee" }}>
                  <div style={{ height:"100%", width:`${p}%`, background:p===100?"#52b788":"#2d6a4f", transition:"width 0.4s" }} />
                </div>
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{fontSize:28}}>{emojiC(lote.fichaId)}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lote.nombre}</div>
                      <div style={{ fontSize:11, color:"#8a9e8a" }}>{lote.fichaId?.split("_")[0]?.replace(/^./,c=>c.toUpperCase())} · {lote.fichaId?.split("_")[1]?.replace(/^./,c=>c.toUpperCase())}</div>
                    </div>
                    <div style={{ fontSize:16, fontWeight:800, color:p===100?"#52b788":"#2d6a4f" }}>{p}%</div>
                  </div>
                  <div style={{ display:"flex", gap:2, marginBottom:8 }}>
                    {lote.etapas.map((e,i)=>(
                      <div key={i} style={{ flex:1, height:6, borderRadius:3, background:e.fechaReal?"#52b788":"#dce8dc" }} title={e.nombre} />
                    ))}
                  </div>
                  <div style={{ fontSize:11, color:"#8a9e8a", marginBottom:10 }}>{confirmadas} de {lote.etapas.length} etapas confirmadas</div>
                  {p===100 ? (
                    <div style={{ fontSize:13, color:"#52b788", fontWeight:600 }}>✅ Ciclo completado</div>
                  ) : prox&&dias!==null ? (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:bgU(dias), borderRadius:6, padding:"7px 10px" }}>
                      <div style={{ fontSize:12, fontWeight:500 }}>{prox.nombre}</div>
                      <span style={{ fontSize:12, fontWeight:700, color:colorU(dias), whiteSpace:"nowrap", marginLeft:8 }}>{etiqDias(dias)}</span>
                    </div>
                  ) : null}
                  <div style={{ display:"flex", gap:6, marginTop:12 }}>
                    <Link href="/" style={{ flex:1 }}>
                      <button style={{ width:"100%", padding:"6px 0", background:"#2d6a4f", color:"#fff", border:"none", borderRadius:6, fontSize:12, fontWeight:600, cursor:"pointer" }}>Confirmar etapa</button>
                    </Link>
                    <Link href="/calendario"><button style={{ padding:"6px 10px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:12, cursor:"pointer" }}>📅</button></Link>
                    <Link href="/economico"><button style={{ padding:"6px 10px", background:"#f4f7f4", border:"1px solid #dce8dc", borderRadius:6, fontSize:12, cursor:"pointer" }}>💰</button></Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Acciones rápidas */}
        <div style={{ marginTop:24, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:10 }}>
          {[
            { href:"/nuevo-lote",   emoji:"🌱", label:"Nuevo lote"       },
            { href:"/mis-lotes",    emoji:"📋", label:"Mis predios"      },
            { href:"/calendario",   emoji:"📅", label:"Calendario"       },
            { href:"/economico",    emoji:"💰", label:"Económico"        },
            { href:"/exportar",     emoji:"📄", label:"Exportar PDF"     },
            { href:"/admin/fichas", emoji:"⚙️", label:"Fichas técnicas"  },
          ].map(a=>(
            <Link key={a.href} href={a.href}>
              <button style={{ width:"100%", padding:"12px 16px", background:"#fff", border:"1px solid #dce8dc", borderRadius:10, fontSize:14, fontWeight:500, color:"#2d6a4f", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                <span style={{fontSize:18}}>{a.emoji}</span>{a.label}
              </button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
