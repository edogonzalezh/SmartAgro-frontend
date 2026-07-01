"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerLotes, obtenerResumenLote, registrarGasto, registrarIngreso, eliminarGasto, eliminarIngreso, type Lote, type ResumenLote } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

const EMOJI: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", pimenton:"🫑", cebolla:"🧅", default:"🌱" };
function emojiC(f:string){ return EMOJI[f?.split("_")[0]]??EMOJI.default; }

const CATEGORIAS = [
  { id:"insumo",      label:"Insumo",         emoji:"🧴", color:"#e07b28", bg:"#fdefd8" },
  { id:"mano_obra",   label:"Mano de obra",   emoji:"👷", color:"#2d6a4f", bg:"#d8ede2" },
  { id:"maquinaria",  label:"Maquinaria",     emoji:"🚜", color:"#1a6bbf", bg:"#e8f4fd" },
  { id:"otro",        label:"Otro gasto",     emoji:"📦", color:"#8a9e8a", bg:"#f4f7f4" },
];
function catInfo(id:string){ return CATEGORIAS.find(c=>c.id===id)??CATEGORIAS[3]; }

function fmtPeso(n:number){ return new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(n); }
function fmtFecha(s:string){ return new Date(s).toLocaleDateString("es-CL",{day:"numeric",month:"short"}); }

type Tab = "resumen"|"gastos"|"ingresos";

export default function EconomicoPage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteId, setLoteId] = useState("");
  const [resumen, setResumen] = useState<ResumenLote|null>(null);
  const [tab, setTab] = useState<Tab>("resumen");
  const [cargando, setCargando] = useState(true);
  const [formGasto, setFormGasto] = useState({ categoria:"insumo", descripcion:"", cantidad:"", unidad:"", monto:"", fecha: new Date().toISOString().split("T")[0] });
  const [formIngreso, setFormIngreso] = useState({ descripcion:"", cantidad:"", unidad:"kg", precioUnitario:"", monto:"", fecha: new Date().toISOString().split("T")[0], comprador:"" });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string|null>(null);

  useEffect(()=>{ if(autenticado===false){router.push("/login");return;} if(autenticado===true) cargarLotes(); },[autenticado]);
  useEffect(()=>{ if(loteId) cargarResumen(); },[loteId]);

  async function cargarLotes(){
    const data = await obtenerLotes();
    setLotes(data);
    if(data.length>0) setLoteId(data[0].id);
    setCargando(false);
  }
  async function cargarResumen(){
    if(!loteId) return;
    setResumen(null);
    const r = await obtenerResumenLote(loteId);
    setResumen(r);
  }

  function mostrarMsg(m:string){ setMensaje(m); setTimeout(()=>setMensaje(null),3000); }

  async function handleGasto(e:React.FormEvent){
    e.preventDefault(); setGuardando(true);
    try {
      await registrarGasto({ loteId, categoria:formGasto.categoria, descripcion:formGasto.descripcion, cantidad:formGasto.cantidad?parseFloat(formGasto.cantidad):undefined, unidad:formGasto.unidad||undefined, monto:parseFloat(formGasto.monto), fecha:formGasto.fecha });
      setFormGasto(p=>({...p, descripcion:"", cantidad:"", monto:""}));
      mostrarMsg("Gasto registrado"); cargarResumen();
    } finally { setGuardando(false); }
  }

  async function handleIngreso(e:React.FormEvent){
    e.preventDefault(); setGuardando(true);
    try {
      const monto = formIngreso.monto ? parseFloat(formIngreso.monto) : (parseFloat(formIngreso.cantidad||"0")*parseFloat(formIngreso.precioUnitario||"0"));
      await registrarIngreso({ loteId, descripcion:formIngreso.descripcion, cantidad:formIngreso.cantidad?parseFloat(formIngreso.cantidad):undefined, unidad:formIngreso.unidad||undefined, precioUnitario:formIngreso.precioUnitario?parseFloat(formIngreso.precioUnitario):undefined, monto, fecha:formIngreso.fecha, comprador:formIngreso.comprador||undefined });
      setFormIngreso(p=>({...p, descripcion:"", cantidad:"", precioUnitario:"", monto:"", comprador:""}));
      mostrarMsg("Ingreso registrado"); cargarResumen();
    } finally { setGuardando(false); }
  }

  const loteActivo = lotes.find(l=>l.id===loteId);

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Gestión económica" subtitulo="Fase 3 · Costos e ingresos por cultivo" />

      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px" }}>
        {mensaje && <div style={{ background:"#d8ede2", border:"1px solid #b8ceb8", borderRadius:8, padding:"10px 16px", marginBottom:16, fontSize:14, color:"#2d6a4f", fontWeight:500 }}>✓ {mensaje}</div>}

        {/* Selector de lote */}
        {!cargando && lotes.length>0 && (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
            <label style={lbl}>Seleccionar lote</label>
            <select value={loteId} onChange={e=>setLoteId(e.target.value)} style={{ fontSize:15, padding:"9px 12px", borderRadius:8, border:"1px solid #dce8dc", width:"100%", background:"#fff" }}>
              {lotes.map(l=><option key={l.id} value={l.id}>{emojiC(l.fichaId)} {l.fichaId?.split("_")[0]?.replace(/^./,s=>s.toUpperCase())} · {l.nombre}</option>)}
            </select>
          </div>
        )}

        {/* Pestañas */}
        <div style={{ display:"flex", border:"1px solid #dce8dc", borderRadius:8, overflow:"hidden", marginBottom:16 }}>
          {([
            { id:"resumen",  label:"📊 Resumen"  },
            { id:"gastos",   label:"💸 Gastos"   },
            { id:"ingresos", label:"💰 Ingresos" },
          ] as {id:Tab;label:string}[]).map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"10px 0", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", background:tab===t.id?"#2d6a4f":"#fff", color:tab===t.id?"#fff":"#8a9e8a" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab==="resumen" && resumen && (
          <>
            {/* Métricas */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
              {[
                { label:"Total gastos",  valor:fmtPeso(resumen.totalGastos),  color:"#c0392b", bg:"#fde8e6", emoji:"💸" },
                { label:"Total ingresos",valor:fmtPeso(resumen.totalIngresos), color:"#2d6a4f", bg:"#d8ede2", emoji:"💰" },
                { label:"Margen neto",   valor:fmtPeso(resumen.margen), color:resumen.margen>=0?"#2d6a4f":"#c0392b", bg:resumen.margen>=0?"#d8ede2":"#fde8e6", emoji:resumen.margen>=0?"📈":"📉" },
              ].map(m=>(
                <div key={m.label} style={{ background:m.bg, border:`1px solid ${m.color}30`, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:22 }}>{m.emoji}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:m.color, marginTop:4, lineHeight:1.2 }}>{m.valor}</div>
                  <div style={{ fontSize:10, color:"#556055", marginTop:3 }}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Rentabilidad */}
            {resumen.totalGastos>0 && (
              <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:14, color:"#556055" }}>Rentabilidad sobre costos</span>
                  <span style={{ fontSize:20, fontWeight:800, color:resumen.rentabilidad>=0?"#2d6a4f":"#c0392b" }}>
                    {resumen.rentabilidad>=0?"+":""}{resumen.rentabilidad}%
                  </span>
                </div>
              </div>
            )}

            {/* Gastos por categoría */}
            {Object.keys(resumen.gastosPorCategoria).length>0 && (
              <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#8a9e8a", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>Gastos por categoría</div>
                {Object.entries(resumen.gastosPorCategoria).map(([cat,monto])=>{
                  const info=catInfo(cat);
                  const pct=resumen.totalGastos>0?Math.round((monto/resumen.totalGastos)*100):0;
                  return (
                    <div key={cat} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:13, color:"#1a1f1a" }}>{info.emoji} {info.label}</span>
                        <span style={{ fontSize:13, fontWeight:600, color:info.color }}>{fmtPeso(monto)} ({pct}%)</span>
                      </div>
                      <div style={{ height:6, background:"#f4f7f4", borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:info.color, borderRadius:3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {resumen.totalGastos===0 && resumen.totalIngresos===0 && (
              <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"32px 24px", textAlign:"center" }}>
                <div style={{fontSize:40,marginBottom:12}}>📊</div>
                <p style={{fontSize:15,fontWeight:600,color:"#1a1f1a"}}>Sin movimientos aún</p>
                <p style={{fontSize:13,color:"#8a9e8a",marginTop:6}}>Registra gastos e ingresos en las pestañas de arriba.</p>
              </div>
            )}
          </>
        )}

        {/* ── GASTOS ── */}
        {tab==="gastos" && (
          <>
            {/* Formulario */}
            <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"16px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Registrar gasto</div>
              <form onSubmit={handleGasto} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {/* Categoría */}
                <div>
                  <label style={lbl}>Categoría</label>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {CATEGORIAS.map(cat=>(
                      <button type="button" key={cat.id} onClick={()=>setFormGasto(p=>({...p,categoria:cat.id}))}
                        style={{ padding:"7px 12px", borderRadius:8, border:`2px solid ${formGasto.categoria===cat.id?cat.color:"#dce8dc"}`, background:formGasto.categoria===cat.id?cat.bg:"#fff", color:formGasto.categoria===cat.id?cat.color:"#8a9e8a", fontSize:13, fontWeight:formGasto.categoria===cat.id?600:400, cursor:"pointer" }}>
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={lbl}>Descripción</label>
                  <input value={formGasto.descripcion} onChange={e=>setFormGasto(p=>({...p,descripcion:e.target.value}))} placeholder="Ej: Fertilizante 10-30-10, Jornal poda..." required style={inp} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Cantidad</label>
                    <input type="number" value={formGasto.cantidad} onChange={e=>setFormGasto(p=>({...p,cantidad:e.target.value}))} placeholder="25" min={0} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Unidad</label>
                    <input value={formGasto.unidad} onChange={e=>setFormGasto(p=>({...p,unidad:e.target.value}))} placeholder="kg, lt, hrs" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Monto ($)</label>
                    <input type="number" value={formGasto.monto} onChange={e=>setFormGasto(p=>({...p,monto:e.target.value}))} placeholder="15000" required min={0} style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Fecha</label>
                  <input type="date" value={formGasto.fecha} onChange={e=>setFormGasto(p=>({...p,fecha:e.target.value}))} style={inp} />
                </div>
                <button type="submit" disabled={guardando} style={{ padding:"11px 0", background:guardando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  {guardando?"Guardando...":"+ Registrar gasto"}
                </button>
              </form>
            </div>

            {/* Lista de gastos */}
            {resumen && resumen.gastos.length>0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {resumen.gastos.map(g=>{
                  const info=catInfo(g.categoria);
                  return (
                    <div key={g.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:8, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:8, background:info.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{info.emoji}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:"#1a1f1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{g.descripcion}</div>
                        <div style={{ fontSize:11, color:"#8a9e8a", marginTop:1 }}>{info.label} · {fmtFecha(g.fecha)}{g.cantidad?` · ${g.cantidad} ${g.unidad??""}`:"" }</div>
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#c0392b" }}>{fmtPeso(g.monto)}</div>
                        <button onClick={async()=>{ await eliminarGasto(g.id); cargarResumen(); }} style={{ fontSize:11, color:"#c0392b", background:"none", border:"none", cursor:"pointer", marginTop:2 }}>Eliminar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {resumen && resumen.gastos.length===0 && <p style={{color:"#8a9e8a",textAlign:"center",padding:20}}>Sin gastos registrados aún.</p>}
          </>
        )}

        {/* ── INGRESOS ── */}
        {tab==="ingresos" && (
          <>
            <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:10, padding:"16px", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:14 }}>Registrar ingreso</div>
              <form onSubmit={handleIngreso} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <label style={lbl}>Descripción de la venta</label>
                  <input value={formIngreso.descripcion} onChange={e=>setFormIngreso(p=>({...p,descripcion:e.target.value}))} placeholder="Ej: Venta tomate primera calidad..." required style={inp} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Cantidad</label>
                    <input type="number" value={formIngreso.cantidad} onChange={e=>setFormIngreso(p=>({...p,cantidad:e.target.value}))} placeholder="500" min={0} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Unidad</label>
                    <input value={formIngreso.unidad} onChange={e=>setFormIngreso(p=>({...p,unidad:e.target.value}))} placeholder="kg, cajas" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Precio unit. ($)</label>
                    <input type="number" value={formIngreso.precioUnitario} onChange={e=>setFormIngreso(p=>({...p,precioUnitario:e.target.value}))} placeholder="350" min={0} style={inp} />
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={lbl}>Total ($) (o se calcula solo)</label>
                    <input type="number" value={formIngreso.monto} onChange={e=>setFormIngreso(p=>({...p,monto:e.target.value}))} placeholder="175000" min={0} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Comprador</label>
                    <input value={formIngreso.comprador} onChange={e=>setFormIngreso(p=>({...p,comprador:e.target.value}))} placeholder="Mercado La Vega..." style={inp} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Fecha</label>
                  <input type="date" value={formIngreso.fecha} onChange={e=>setFormIngreso(p=>({...p,fecha:e.target.value}))} style={inp} />
                </div>
                <button type="submit" disabled={guardando} style={{ padding:"11px 0", background:guardando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>
                  {guardando?"Guardando...":"+ Registrar ingreso"}
                </button>
              </form>
            </div>

            {resumen && resumen.ingresos.length>0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {resumen.ingresos.map(i=>(
                  <div key={i.id} style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:8, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:"#d8ede2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>💰</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1f1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{i.descripcion}</div>
                      <div style={{ fontSize:11, color:"#8a9e8a", marginTop:1 }}>
                        {fmtFecha(i.fecha)}
                        {i.cantidad?` · ${i.cantidad} ${i.unidad??""}`:""}
                        {i.comprador?` · ${i.comprador}`:""}
                      </div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:"#2d6a4f" }}>{fmtPeso(i.monto)}</div>
                      <button onClick={async()=>{ await eliminarIngreso(i.id); cargarResumen(); }} style={{ fontSize:11, color:"#c0392b", background:"none", border:"none", cursor:"pointer", marginTop:2 }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {resumen && resumen.ingresos.length===0 && <p style={{color:"#8a9e8a",textAlign:"center",padding:20}}>Sin ingresos registrados aún.</p>}
          </>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
const inp: React.CSSProperties = { fontSize:14, padding:"9px 10px", borderRadius:6, border:"1px solid #dce8dc", width:"100%", background:"#fff" };
