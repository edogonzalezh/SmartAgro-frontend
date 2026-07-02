"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/lib/useAuth";
import { getToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface Mensaje { rol: "usuario"|"asistente"; texto: string; }

const SUGERENCIAS = [
  "¿Qué debo hacer hoy?",
  "¿Tengo etapas atrasadas?",
  "¿Cuándo cosecho mi tomate?",
  "¿Cuál de mis lotes es más rentable?",
  "¿Qué labores vienen esta semana?",
  "¿Cuánto he gastado hasta ahora?",
];

export default function AsistentePage() {
  const router = useRouter();
  const { autenticado } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol:"asistente", texto:"Hola 👋 Soy tu asistente agrícola SmartAgro. Tengo acceso a todos tus lotes, etapas y datos económicos. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ if(autenticado===false) router.push("/login"); },[autenticado]);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[mensajes]);

  async function enviar(pregunta?: string) {
    const texto = pregunta ?? input.trim();
    if (!texto || cargando) return;
    setInput("");
    setMensajes(prev=>[...prev, { rol:"usuario", texto }]);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/asistente/consultar`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify({ pregunta: texto }),
      });
      const data = await res.json();
      setMensajes(prev=>[...prev, { rol:"asistente", texto: data.respuesta }]);
    } catch {
      setMensajes(prev=>[...prev, { rol:"asistente", texto:"Lo siento, no pude procesar tu consulta. Intenta de nuevo." }]);
    } finally { setCargando(false); }
  }

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <Header titulo="Asistente IA" subtitulo="Tu asesor agrícola inteligente" />

      <div style={{ maxWidth:680, margin:"0 auto", width:"100%", padding:"20px 16px", flex:1, display:"flex", flexDirection:"column" }}>

        {/* Sugerencias */}
        {mensajes.length <= 1 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#8a9e8a", textTransform:"uppercase" as const, letterSpacing:"0.06em", marginBottom:8 }}>
              Preguntas frecuentes
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {SUGERENCIAS.map(s=>(
                <button key={s} onClick={()=>enviar(s)}
                  style={{ padding:"7px 14px", background:"#fff", border:"1px solid #dce8dc", borderRadius:99, fontSize:13, color:"#2d6a4f", cursor:"pointer", fontWeight:500 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", gap:12, marginBottom:16 }}>
          {mensajes.map((m,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:m.rol==="usuario"?"flex-end":"flex-start" }}>
              {m.rol==="asistente" && (
                <div style={{ width:32, height:32, borderRadius:"50%", background:"#2d6a4f", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, marginRight:8, alignSelf:"flex-end" }}>
                  🌱
                </div>
              )}
              <div style={{
                maxWidth:"80%", padding:"12px 16px",
                borderRadius: m.rol==="usuario" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: m.rol==="usuario" ? "#2d6a4f" : "#fff",
                color: m.rol==="usuario" ? "#fff" : "#1a1f1a",
                fontSize:14, lineHeight:1.6,
                border: m.rol==="asistente" ? "1px solid #dce8dc" : "none",
                boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
              }}>
                {m.texto.split('\n').map((line,j)=>(
                  <span key={j}>{line}{j<m.texto.split('\n').length-1&&<br/>}</span>
                ))}
              </div>
            </div>
          ))}

          {cargando && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:"#2d6a4f", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🌱</div>
              <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:"18px 18px 18px 4px", padding:"12px 16px" }}>
                <div style={{ display:"flex", gap:4 }}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#b8ceb8", animation:`pulse 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ background:"#fff", border:"1px solid #dce8dc", borderRadius:12, padding:"10px 14px", display:"flex", gap:10, alignItems:"flex-end", position:"sticky", bottom:16 }}>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); } }}
            placeholder="Pregúntame sobre tus cultivos, etapas, costos..."
            rows={1}
            style={{ flex:1, border:"none", outline:"none", fontSize:14, resize:"none", fontFamily:"inherit", lineHeight:1.5, background:"transparent", color:"#1a1f1a" }}
          />
          <button onClick={()=>enviar()} disabled={cargando||!input.trim()}
            style={{ width:38, height:38, borderRadius:"50%", background: cargando||!input.trim()?"#dce8dc":"#2d6a4f", color:"#fff", border:"none", cursor:cargando||!input.trim()?"default":"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
