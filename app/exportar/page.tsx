"use client";
import { useEffect, useState } from "react";
import { obtenerLotes, type Lote } from "@/lib/api";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";

const EMOJI: Record<string,string> = { tomate:"🍅", lechuga:"🥬", zapallo:"🎃", default:"🌱" };
function emojiCultivo(fichaId: string) { return EMOJI[fichaId?.split("_")[0]] ?? EMOJI.default; }

function fmt(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-CL",{ day:"numeric", month:"long", year:"numeric" });
}

function diasHasta(fecha: string): number {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.round((new Date(fecha).getTime()-hoy.getTime())/86400000);
}

export default function ExportarPage() {
  const { autenticado } = useAuth();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loteId, setLoteId] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);

  useEffect(()=>{
    if (autenticado===false) { window.location.href="/login"; return; }
    if (autenticado===true) obtenerLotes().then(d=>{ setLotes(d); if(d.length>0) setLoteId(d[0].id); }).finally(()=>setCargando(false));
  },[autenticado]);

  const lote = lotes.find(l=>l.id===loteId);

  async function generarPDF() {
    if (!lote) return;
    setGenerando(true);

    const confirmadas = lote.etapas.filter(e=>e.fechaReal).length;
    const pct = Math.round(confirmadas/lote.etapas.length*100);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>SmartAgro - ${lote.nombre}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1a1f1a; padding: 32px; }
  .header { background: #2d6a4f; color: white; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; margin-bottom: 4px; }
  .header p { font-size: 13px; opacity: 0.7; }
  .meta { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .meta-item { background: #f4f7f4; border: 1px solid #dce8dc; border-radius: 8px; padding: 10px 16px; }
  .meta-item .label { font-size: 10px; color: #8a9e8a; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-item .valor { font-size: 16px; font-weight: 700; color: #2d6a4f; margin-top: 2px; }
  h2 { font-size: 14px; color: #2d6a4f; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px; border-bottom: 1px solid #dce8dc; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
  th { background: #2d6a4f; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 8px 12px; border-bottom: 1px solid #eef2ee; }
  tr:nth-child(even) td { background: #f9fbf9; }
  .confirmada { color: #2d6a4f; font-weight: 600; }
  .pendiente { color: #8a9e8a; }
  .atrasada { color: #c0392b; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .badge-ok { background: #d8ede2; color: #2d6a4f; }
  .badge-pend { background: #f4f7f4; color: #8a9e8a; }
  .badge-atras { background: #fde8e6; color: #c0392b; }
  .footer { margin-top: 32px; font-size: 11px; color: #8a9e8a; text-align: center; border-top: 1px solid #dce8dc; padding-top: 16px; }
</style>
</head>
<body>
<div class="header">
  <h1>SmartAgro — Calendario de cultivo</h1>
  <p>Generado el ${new Date().toLocaleDateString("es-CL",{day:"numeric",month:"long",year:"numeric"})}</p>
</div>

<div class="meta">
  <div class="meta-item"><div class="label">Lote</div><div class="valor">${lote.nombre}</div></div>
  <div class="meta-item"><div class="label">Cultivo</div><div class="valor">${emojiCultivo(lote.fichaId)} ${lote.fichaId?.split("_")[0]?.replace(/^./,c=>c.toUpperCase())}</div></div>
  <div class="meta-item"><div class="label">Progreso</div><div class="valor">${pct}% (${confirmadas}/${lote.etapas.length})</div></div>
</div>

<h2>Etapas del ciclo</h2>
<table>
  <thead><tr><th>Etapa</th><th>Fecha planificada</th><th>Fecha real inicio</th><th>Fecha real término</th><th>Estado</th><th>Observaciones</th></tr></thead>
  <tbody>
    ${lote.etapas.map(e=>{
      const dias = diasHasta(e.fechaPlanificada);
      const estado = e.fechaReal ? '<span class="badge badge-ok">✓ Realizada</span>' : dias<0 ? '<span class="badge badge-atras">Atrasada</span>' : '<span class="badge badge-pend">Pendiente</span>';
      return `<tr>
        <td><strong>${e.nombre}</strong></td>
        <td>${fmt(e.fechaPlanificada)}</td>
        <td>${e.fechaReal ? fmt(e.fechaReal) : "—"}</td>
        <td>—</td>
        <td>${estado}</td>
        <td style="color:#556055;font-size:12px">—</td>
      </tr>`;
    }).join("")}
  </tbody>
</table>

${lote.tareas && lote.tareas.length>0 ? `
<h2>Labores intermedias</h2>
<table>
  <thead><tr><th>Labor</th><th>Fecha estimada</th><th>Anclada a</th></tr></thead>
  <tbody>
    ${lote.tareas.map(t=>`<tr>
      <td>${t.nombre}</td>
      <td>${fmt(t.fechaPlanificada)}</td>
      <td style="color:#8a9e8a;font-size:12px">${t.etapaAncla} +${t.offsetDias}d</td>
    </tr>`).join("")}
  </tbody>
</table>` : ""}

<div class="footer">SmartAgro Chile · smartagro.cl · Planificación agrícola inteligente</div>
</body>
</html>`;

    const ventana = window.open("","_blank");
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
      setTimeout(()=>{ ventana.print(); }, 500);
    }
    setGenerando(false);
  }

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh" }}>
      <Header titulo="Exportar calendario" subtitulo="Genera un PDF para imprimir o compartir" />

      <div style={{ maxWidth:520, margin:"0 auto", padding:"24px 16px" }}>
        {cargando ? <p style={{color:"#888"}}>Cargando...</p> : lotes.length===0 ? (
          <p style={{color:"#888"}}>No tienes lotes para exportar.</p>
        ) : (
          <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"24px" }}>
            <div style={{ marginBottom:20 }}>
              <label style={lbl}>Selecciona el lote a exportar</label>
              <select value={loteId} onChange={e=>setLoteId(e.target.value)}
                style={{ fontSize:15, padding:"10px 12px", borderRadius:8, border:"1px solid #dce8dc", width:"100%", background:"#fff" }}>
                {lotes.map(l=><option key={l.id} value={l.id}>{emojiCultivo(l.fichaId)} {l.fichaId?.split("_")[0]?.replace(/^./,c=>c.toUpperCase())} · {l.nombre}</option>)}
              </select>
            </div>

            {lote && (
              <div style={{ background:"#f4f7f4", borderRadius:8, padding:"14px 16px", marginBottom:20 }}>
                <div style={{ fontSize:12, color:"#8a9e8a", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>Resumen del lote</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["Etapas totales", lote.etapas.length],
                    ["Confirmadas", lote.etapas.filter(e=>e.fechaReal).length],
                    ["Pendientes", lote.etapas.filter(e=>!e.fechaReal).length],
                    ["Labores", lote.tareas?.length ?? 0],
                  ].map(([k,v])=>(
                    <div key={String(k)}>
                      <div style={{ fontSize:11, color:"#8a9e8a" }}>{k}</div>
                      <div style={{ fontSize:16, fontWeight:700, color:"#2d6a4f" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background:"#d8ede2", borderRadius:8, padding:"10px 14px", marginBottom:20, fontSize:13, color:"#2d6a4f" }}>
              💡 Se abrirá una ventana con el calendario. Usa <strong>Ctrl+P</strong> (o el menú de impresión) para guardarlo como PDF.
            </div>

            <button onClick={generarPDF} disabled={generando||!lote}
              style={{ width:"100%", padding:"14px 0", background: generando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer" }}>
              {generando ? "Generando..." : "📄 Generar PDF para imprimir"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 };
