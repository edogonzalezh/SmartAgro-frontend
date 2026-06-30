// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EtapaCard } from "@/components/EtapaCard";
import { confirmarEtapa, type Lote } from "@/lib/api";

// NOTA: en el MVP real, esta lista vendría de un endpoint GET /lotes (a agregar).
// Por ahora se deja la estructura de datos lista para conectar.
async function obtenerLotesDelAgricultor(): Promise<Lote[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${API_URL}/lotes`);
  if (!res.ok) return [];
  return res.json();
}

function diasHasta(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha);
  return Math.round((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HoyPage() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerLotesDelAgricultor()
      .then(setLotes)
      .finally(() => setCargando(false));
  }, []);

  async function handleConfirmar(loteId: string, etapaCodigo: string, fechaReal: string) {
    await confirmarEtapa(loteId, etapaCodigo, fechaReal);
    const actualizados = await obtenerLotesDelAgricultor();
    setLotes(actualizados);
  }

  // Aplanar todas las etapas pendientes de todos los lotes, ordenadas por cercanía
  const etapasPendientes = lotes
    .flatMap((lote) =>
      lote.etapas
        .filter((e) => e.fechaReal === null)
        .map((e) => ({ ...e, loteId: lote.id, loteNombre: lote.nombre })),
    )
    .sort((a, b) => diasHasta(a.fechaPlanificada) - diasHasta(b.fechaPlanificada));

  const proximos14Dias = etapasPendientes.filter((e) => diasHasta(e.fechaPlanificada) <= 14);

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>SmartAgro</h1>
      <p style={{ fontSize: 16, color: "#666", marginBottom: 16 }}>
        Próximas etapas en tus cultivos
      </p>

      <Link href="/nuevo-lote">
        <button
          style={{
            fontSize: 16,
            fontWeight: 600,
            padding: "12px 16px",
            width: "100%",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 10,
            marginBottom: 24,
          }}
        >
          + Crear nuevo lote
        </button>
      </Link>

      {cargando && <p>Cargando...</p>}

      {!cargando && proximos14Dias.length === 0 && (
        <p style={{ fontSize: 16, color: "#666" }}>
          No tienes etapas próximas en los siguientes 14 días.
        </p>
      )}

      {proximos14Dias.map((etapa) => (
        <EtapaCard
          key={`${etapa.loteId}-${etapa.etapaCodigo}`}
          loteId={etapa.loteId}
          loteNombre={etapa.loteNombre}
          etapaCodigo={etapa.etapaCodigo}
          nombre={etapa.nombre}
          fechaPlanificada={etapa.fechaPlanificada}
          fechaReal={etapa.fechaReal}
          onConfirmar={handleConfirmar}
        />
      ))}
    </main>
  );
}
