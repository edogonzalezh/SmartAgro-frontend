"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, registro } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<"login"|"registro">("login");
  const [form, setForm] = useState({ nombre:"", email:"", password:"" });
  const [error, setError] = useState<string|null>(null);
  const [cargando, setCargando] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p=>({...p,[k]:e.target.value}));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true); setError(null);
    try {
      if (modo==="login") await login(form.email, form.password);
      else await registro(form.nombre, form.email, form.password);
      router.push("/dashboard");
    } catch(err: any) {
      setError(err.message ?? "Error al iniciar sesión");
    } finally { setCargando(false); }
  }

  return (
    <div style={{ background:"#f4f7f4", minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🌱</div>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#2d6a4f" }}>SmartAgro</h1>
          <p style={{ fontSize:14, color:"#8a9e8a", marginTop:4 }}>Planificación agrícola inteligente</p>
        </div>
        <div style={{ background:"#fff", borderRadius:16, border:"1px solid #dce8dc", padding:"28px 24px", boxShadow:"0 4px 24px rgba(45,106,79,0.08)" }}>
          <div style={{ display:"flex", background:"#f4f7f4", borderRadius:8, padding:4, marginBottom:24 }}>
            {(["login","registro"] as const).map(m=>(
              <button key={m} onClick={()=>setModo(m)} style={{ flex:1, padding:"8px 0", border:"none", borderRadius:6, fontSize:14, fontWeight:600, cursor:"pointer", background: modo===m?"#2d6a4f":"transparent", color: modo===m?"#fff":"#8a9e8a" }}>
                {m==="login"?"Ingresar":"Crear cuenta"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {modo==="registro" && (
              <div><label style={lbl}>Nombre completo</label><input value={form.nombre} onChange={set("nombre")} placeholder="Juan Pérez" required /></div>
            )}
            <div><label style={lbl}>Correo</label><input type="email" value={form.email} onChange={set("email")} placeholder="juan@ejemplo.cl" required /></div>
            <div><label style={lbl}>Contraseña</label><input type="password" value={form.password} onChange={set("password")} placeholder="········" required minLength={6} /></div>
            {error && <div style={{ background:"#fde8e6", border:"1px solid #f5b8b5", borderRadius:6, padding:"10px 14px", fontSize:13, color:"#c0392b" }}>{error}</div>}
            <button type="submit" disabled={cargando} style={{ padding:"13px 0", background: cargando?"#7aad94":"#2d6a4f", color:"#fff", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", marginTop:4 }}>
              {cargando ? "Cargando..." : modo==="login" ? "Ingresar →" : "Crear cuenta →"}
            </button>
          </form>
        </div>
        <p style={{ textAlign:"center", fontSize:12, color:"#aaa", marginTop:20 }}>SmartAgro Chile · Temporada 2026</p>
      </div>
    </div>
  );
}
const lbl: React.CSSProperties = { fontSize:11, fontWeight:600, color:"#556055", textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:5 };
