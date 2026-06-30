// app/calendario/page.tsx
"use client";

import { useEffect, useState } from "react";
import { EtapaCard } from "@/components/EtapaCard";
import { confirmarEtapa, type Lote } from "@/lib/api";

async function obtenerLotesDelAgricultor(): Promise<Lote[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${API_URL}/lotes`);
  if (!res.ok) return [];
  return res.json();
}

function nombreMes(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export default function CalendarioPage() {
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

  const todasLasEtapas = lotes
    .flatMap((lote) =>
      lote.etapas.map((e) => ({ ...e, loteId: lote.id, loteNombre: lote.nombre })),
    )
    .sort((a, b) => new Date(a.fechaPlanificada).getTime() - new Date(b.fechaPlanificada).getTime());

  // Agrupar por mes
  const porMes = new Map<string, typeof todasLasEtapas>();
  for (const etapa of todasLasEtapas) {
    const clave = nombreMes(etapa.fechaPlanificada);
    if (!porMes.has(clave)) porMes.set(clave, []);
    porMes.get(clave)!.push(etapa);
  }

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Calendario completo</h1>

      {cargando && <p>Cargando...</p>}

      {Array.from(porMes.entries()).map(([mes, etapas]) => (
        <section key={mes} style={{ marginBottom: 32 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              textTransform: "capitalize",
              marginBottom: 12,
              color: "#1976d2",
            }}
          >
            {mes}
          </h2>
          {etapas.map((etapa) => (
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
        </section>
      ))}
    </main>
  );
}
