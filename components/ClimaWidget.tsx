"use client";
import { useEffect, useState } from "react";
import { obtenerPronosticoTalca, generarAlertas, iconoClima, fmtDia, type DiaClima, type AlertaClima } from "@/lib/clima";

interface ClimaWidgetProps {
  etapasCriticas: { nombre: string; fecha: string }[];
}

export function ClimaWidget({ etapasCriticas }: ClimaWidgetProps) {
  const [pronostico, setPronostico] = useState<DiaClima[]>([]);
  const [alertas, setAlertas] = useState<AlertaClima[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    obtenerPronosticoTalca()
      .then(data => {
        setPronostico(data);
        setAlertas(generarAlertas(data, etapasCriticas));
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return (
    <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
      <div style={{ fontSize:13, color:"#8a9e8a" }}>🌤️ Cargando pronóstico de Talca...</div>
    </div>
  );

  if (error) return null;

  const alertasCriticas = alertas.filter(a=>a.nivel==="critica");
  const alertasAdvertencia = alertas.filter(a=>a.nivel==="advertencia");

  const colorAlerta = (tipo: string) => {
    if (tipo==="helada") return { color:"#1a6bbf", bg:"#e8f4fd", borde:"#b5d4f4" };
    if (tipo==="lluvia") return { color:"#2d6a4f", bg:"#d8ede2", borde:"#b8ceb8" };
    return { color:"#c0392b", bg:"#fde8e6", borde:"#f5b8b5" };
  };
  const emojiAlerta = (tipo: string) => tipo==="helada"?"🧊":tipo==="lluvia"?"🌧️":"🌡️";

  return (
    <div style={{ marginBottom:20 }}>
      {/* Alertas críticas — siempre visibles */}
      {alertasCriticas.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {alertasCriticas.map((a,i) => {
            const c = colorAlerta(a.tipo);
            return (
              <div key={i} style={{ background:c.bg, border:`1px solid ${c.borde}`, borderRadius:10, padding:"12px 16px", marginBottom:8, display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{emojiAlerta(a.tipo)}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:c.color }}>
                    Alerta crítica · {new Date(a.fecha+"T12:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}
                  </div>
                  <div style={{ fontSize:13, color:"#1a1f1a", marginTop:2 }}>{a.descripcion}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advertencias */}
      {alertasAdvertencia.length > 0 && (
        <div style={{ background:"#fdefd8", border:"1px solid #fac775", borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#a0620a", marginBottom:6 }}>⚠️ Advertencias meteorológicas</div>
          {alertasAdvertencia.slice(0,3).map((a,i) => (
            <div key={i} style={{ fontSize:12, color:"#633806", marginBottom:3 }}>
              · {new Date(a.fecha+"T12:00:00").toLocaleDateString("es-CL",{weekday:"short",day:"numeric"})}: {a.descripcion}
            </div>
          ))}
        </div>
      )}

      {/* Pronóstico 7 días */}
      <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor:"pointer" }} onClick={()=>setExpandido(!expandido)}>
          <div style={{ fontSize:13, fontWeight:700, color:"#2d6a4f" }}>
            🌤️ Pronóstico Talca — 7 días
          </div>
          <span style={{ fontSize:12, color:"#8a9e8a" }}>{expandido?"▲ Ocultar":"▼ Ver detalle"}</span>
        </div>

        {/* Vista compacta siempre visible */}
        <div style={{ display:"flex", borderTop:"1px solid #f0f4f0", overflowX:"auto" }}>
          {pronostico.map((dia, i) => (
            <div key={i} style={{ flex:"1 0 auto", minWidth:70, padding:"10px 6px", textAlign:"center" as const, borderRight: i<pronostico.length-1?"1px solid #f0f4f0":"none", background: i===0?"#f4f7f4":"#fff" }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#8a9e8a", marginBottom:4 }}>{fmtDia(dia.fecha)}</div>
              <div style={{ fontSize:20 }}>{iconoClima(dia.codigoClima)}</div>
              <div style={{ fontSize:12, fontWeight:700, color:"#c0392b", marginTop:4 }}>{Math.round(dia.tempMax)}°</div>
              <div style={{ fontSize:11, color:"#1a6bbf" }}>{Math.round(dia.tempMin)}°</div>
              {dia.precipitacionPct > 30 && (
                <div style={{ fontSize:10, color:"#2d6a4f", marginTop:2 }}>💧{dia.precipitacionPct}%</div>
              )}
            </div>
          ))}
        </div>

        {/* Detalle expandido */}
        {expandido && (
          <div style={{ padding:"12px 16px", borderTop:"1px solid #f0f4f0", background:"#f9fbf9" }}>
            {pronostico.map((dia, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom: i<pronostico.length-1?"1px solid #eef2ee":"none" }}>
                <div style={{ width:80, fontSize:12, fontWeight:600, color:"#556055" }}>{fmtDia(dia.fecha)}</div>
                <div style={{ fontSize:18 }}>{iconoClima(dia.codigoClima)}</div>
                <div style={{ flex:1 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:"#c0392b" }}>{Math.round(dia.tempMax)}°C</span>
                  <span style={{ fontSize:13, color:"#8a9e8a", margin:"0 6px" }}>·</span>
                  <span style={{ fontSize:13, color:"#1a6bbf" }}>{Math.round(dia.tempMin)}°C</span>
                  {dia.tempMin < 4 && <span style={{ fontSize:11, background:"#e8f4fd", color:"#1a6bbf", borderRadius:4, padding:"1px 6px", marginLeft:8 }}>❄️ Helada</span>}
                  {dia.tempMax > 35 && <span style={{ fontSize:11, background:"#fde8e6", color:"#c0392b", borderRadius:4, padding:"1px 6px", marginLeft:8 }}>🌡️ Calor</span>}
                </div>
                {dia.precipitacionPct > 0 && (
                  <div style={{ fontSize:12, color:"#2d6a4f" }}>💧 {dia.precipitacionPct}%</div>
                )}
              </div>
            ))}
            <div style={{ fontSize:10, color:"#aaa", marginTop:10, textAlign:"right" as const }}>Fuente: Open-Meteo · Talca (-35.4°, -71.7°)</div>
          </div>
        )}
      </div>
    </div>
  );
}
