"use client";
import { useEffect, useState } from "react";
import { obtenerFichas, actualizarEtapaFicha, actualizarTareaFicha, type FichaCultivo } from "@/lib/api";
import { Header } from "@/components/Header";

type Seccion = "etapas" | "tareas";

export default function AdminFichasPage() {
  const [fichas, setFichas] = useState<FichaCultivo[]>([]);
  const [fichaActiva, setFichaActiva] = useState<string | null>(null);
  const [seccion, setSeccion] = useState<Seccion>("etapas");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    obtenerFichas().then((data) => {
      setFichas(data);
      if (data.length > 0) setFichaActiva(data[0].id);
    }).finally(() => setCargando(false));
  }, []);

  const ficha = fichas.find(f => f.id === fichaActiva) ?? null;

  function setVal(key: string, val: string) { setEditando(p => ({ ...p, [key]: val })); }

  async function guardarEtapa(etapaId: string) {
    const val = editando[`e-${etapaId}`];
    if (!val) return;
    setGuardando(etapaId);
    await actualizarEtapaFicha(etapaId, parseInt(val));
    mostrarMensaje("Etapa actualizada correctamente");
    setGuardando(null);
    const actualizadas = await obtenerFichas();
    setFichas(actualizadas);
  }

  async function guardarTarea(tareaId: string) {
    const val = editando[`t-${tareaId}`];
    if (!val) return;
    setGuardando(tareaId);
    await actualizarTareaFicha(tareaId, parseInt(val));
    mostrarMensaje("Labor actualizada correctamente");
    setGuardando(null);
    const actualizadas = await obtenerFichas();
    setFichas(actualizadas);
  }

  function mostrarMensaje(msg: string) {
    setMensaje(msg);
    setTimeout(() => setMensaje(null), 2500);
  }

  const EMOJI: Record<string, string> = {
    tomate: "🍅", lechuga: "🥬", zapallo: "🎃",
    pimenton: "🫑", cebolla: "🧅", default: "🌱",
  };

  return (
    <div style={{ background: "#f4f7f4", minHeight: "100vh" }}>
      <Header titulo="Fichas técnicas de cultivos" subtitulo="Administración" volverA="/" volverLabel="← Inicio" />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px" }}>

        {mensaje && (
          <div style={{ background: "#d8ede2", border: "1px solid #b8ceb8", borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 14, color: "#2d6a4f", fontWeight: 500 }}>
            ✓ {mensaje}
          </div>
        )}

        {cargando ? <p style={{ color: "#888" }}>Cargando...</p> : (
          <>
            {/* Selector de cultivo — pestañas horizontales */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {fichas.map(f => {
                const emoji = EMOJI[f.cultivo.toLowerCase()] ?? EMOJI.default;
                const activo = fichaActiva === f.id;
                return (
                  <button key={f.id} onClick={() => { setFichaActiva(f.id); setSeccion("etapas"); }}
                    style={{ padding: "10px 18px", borderRadius: 10, border: activo ? "2px solid #2d6a4f" : "1px solid #dce8dc", background: activo ? "#2d6a4f" : "#fff", color: activo ? "#fff" : "#556055", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                    <span style={{ fontSize: 18 }}>{emoji}</span>
                    {f.nombre}
                  </button>
                );
              })}
            </div>

            {ficha && (
              <div style={{ background: "#fff", border: "1px solid #dce8dc", borderRadius: 12, overflow: "hidden" }}>
                {/* Info del cultivo */}
                <div style={{ background: "#2d6a4f", padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{EMOJI[ficha.cultivo.toLowerCase()] ?? EMOJI.default}</span>
                  <div>
                    <h2 style={{ fontSize: 17, fontWeight: 700, color: "#fff", margin: 0 }}>{ficha.nombre}</h2>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{ficha.zona} · {ficha.etapas.length} etapas · {ficha.tareas.length} labores</div>
                  </div>
                </div>

                {/* Pestañas etapas / labores */}
                <div style={{ display: "flex", borderBottom: "1px solid #dce8dc", background: "#f4f7f4" }}>
                  {([
                    { id: "etapas", label: `Etapas del ciclo (${ficha.etapas.length})` },
                    { id: "tareas", label: `Labores intermedias (${ficha.tareas.length})` },
                  ] as { id: Seccion; label: string }[]).map(tab => (
                    <button key={tab.id} onClick={() => setSeccion(tab.id)}
                      style={{ flex: 1, padding: "12px 16px", border: "none", background: "transparent", fontSize: 14, fontWeight: 600, cursor: "pointer", color: seccion === tab.id ? "#2d6a4f" : "#8a9e8a", borderBottom: seccion === tab.id ? "2px solid #2d6a4f" : "2px solid transparent", transition: "all 0.15s" }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div style={{ padding: "16px 18px" }}>
                  {/* Etapas del ciclo */}
                  {seccion === "etapas" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ficha.etapas.map((etapa, idx) => {
                        const key = `e-${etapa.id}`;
                        const val = editando[key] ?? String(etapa.duracionDesdeAnterior);
                        return (
                          <div key={etapa.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#f4f7f4", borderRadius: 8, border: "1px solid #dce8dc" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#2d6a4f", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1f1a" }}>{etapa.nombre}</div>
                              <div style={{ fontSize: 11, color: "#8a9e8a" }}>Código: {etapa.etapaCodigo}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: "#8a9e8a", whiteSpace: "nowrap" }}>días desde anterior</span>
                              <input type="number" value={val} onChange={e => setVal(key, e.target.value)} min={0} max={365}
                                style={{ width: 60, padding: "6px 8px", borderRadius: 6, border: "1px solid #dce8dc", fontSize: 14, textAlign: "center" }} />
                              <button onClick={() => guardarEtapa(etapa.id)} disabled={guardando === etapa.id}
                                style={{ padding: "6px 14px", background: "#2d6a4f", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: guardando === etapa.id ? 0.6 : 1 }}>
                                {guardando === etapa.id ? "..." : "Guardar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Labores intermedias */}
                  {seccion === "tareas" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {ficha.tareas.map((tarea, idx) => {
                        const key = `t-${tarea.id}`;
                        const val = editando[key] ?? String(tarea.offsetDias);
                        return (
                          <div key={tarea.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff8f0", borderRadius: 8, border: "1px solid #fdefd8" }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#e07b28", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "#1a1f1a" }}>{tarea.nombre}</div>
                              <div style={{ fontSize: 11, color: "#8a9e8a" }}>Anclada a: <strong>{tarea.etapaAncla}</strong></div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: "#8a9e8a", whiteSpace: "nowrap" }}>días offset</span>
                              <input type="number" value={val} onChange={e => setVal(key, e.target.value)} min={0} max={365}
                                style={{ width: 60, padding: "6px 8px", borderRadius: 6, border: "1px solid #fdefd8", fontSize: 14, textAlign: "center" }} />
                              <button onClick={() => guardarTarea(tarea.id)} disabled={guardando === tarea.id}
                                style={{ padding: "6px 14px", background: "#e07b28", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: guardando === tarea.id ? 0.6 : 1 }}>
                                {guardando === tarea.id ? "..." : "Guardar"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
