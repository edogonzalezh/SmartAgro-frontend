// app/nuevo-lote/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearUsuario, crearPredio, crearLote } from "@/lib/api";

const FICHAS_DISPONIBLES = [
  { id: "tomate_talca", nombre: "Tomate - Talca" },
  { id: "lechuga_talca", nombre: "Lechuga - Talca" },
];

export default function NuevoLotePage() {
  const router = useRouter();
  const [nombreAgricultor, setNombreAgricultor] = useState("");
  const [email, setEmail] = useState("");
  const [nombrePredio, setNombrePredio] = useState("");
  const [ubicacion, setUbicacion] = useState("Talca, VII Región");
  const [nombreLote, setNombreLote] = useState("");
  const [fichaId, setFichaId] = useState(FICHAS_DISPONIBLES[0].id);
  const [fechaInicio, setFechaInicio] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const usuario = await crearUsuario(nombreAgricultor, email);
      const predio = await crearPredio(nombrePredio, ubicacion, usuario.id);
      await crearLote({
        nombre: nombreLote,
        predioId: predio.id,
        fichaId,
        fechaInicio,
      });
      router.push("/");
    } catch (err) {
      setError("Hubo un problema al crear el lote. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const inputStyle = {
    fontSize: 18,
    padding: 12,
    width: "100%",
    marginBottom: 16,
    borderRadius: 8,
    border: "1px solid #ccc",
    boxSizing: "border-box" as const,
  };

  const labelStyle = { fontSize: 14, color: "#666", marginBottom: 6, display: "block" };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Nuevo lote</h1>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Tu nombre</label>
        <input
          style={inputStyle}
          value={nombreAgricultor}
          onChange={(e) => setNombreAgricultor(e.target.value)}
          required
        />

        <label style={labelStyle}>Tu correo</label>
        <input
          style={inputStyle}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label style={labelStyle}>Nombre del predio</label>
        <input
          style={inputStyle}
          value={nombrePredio}
          onChange={(e) => setNombrePredio(e.target.value)}
          required
        />

        <label style={labelStyle}>Ubicación</label>
        <input
          style={inputStyle}
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
        />

        <label style={labelStyle}>Nombre del lote</label>
        <input
          style={inputStyle}
          value={nombreLote}
          onChange={(e) => setNombreLote(e.target.value)}
          placeholder="Ej: Lote 1 - Invernadero"
          required
        />

        <label style={labelStyle}>Cultivo</label>
        <select
          style={inputStyle}
          value={fichaId}
          onChange={(e) => setFichaId(e.target.value)}
        >
          {FICHAS_DISPONIBLES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Fecha de siembra (almácigo)</label>
        <input
          style={inputStyle}
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          required
        />

        {error && <p style={{ color: "#c62828", marginBottom: 16 }}>{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          style={{
            fontSize: 18,
            fontWeight: 700,
            padding: "16px 20px",
            width: "100%",
            backgroundColor: "#2e7d32",
            color: "white",
            border: "none",
            borderRadius: 10,
          }}
        >
          {enviando ? "Creando..." : "Crear lote y generar calendario"}
        </button>
      </form>
    </main>
  );
}
