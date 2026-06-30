// components/EtapaCard.tsx
"use client";

import { useState } from "react";

interface EtapaCardProps {
  loteId: string;
  loteNombre: string;
  etapaCodigo: string;
  nombre: string;
  fechaPlanificada: string;
  fechaReal: string | null;
  onConfirmar: (loteId: string, etapaCodigo: string, fechaReal: string) => Promise<void>;
}

export function EtapaCard({
  loteId,
  loteNombre,
  etapaCodigo,
  nombre,
  fechaPlanificada,
  fechaReal,
  onConfirmar,
}: EtapaCardProps) {
  const [confirmando, setConfirmando] = useState(false);
  const [fechaInput, setFechaInput] = useState(
    new Date().toISOString().split("T")[0],
  );

  const confirmada = fechaReal !== null;
  const fechaMostrar = new Date(fechaPlanificada).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
  });

  async function handleConfirmar() {
    await onConfirmar(loteId, etapaCodigo, fechaInput);
    setConfirmando(false);
  }

  return (
    <div
      style={{
        border: "2px solid",
        borderColor: confirmada ? "#4caf50" : "#e0e0e0",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        backgroundColor: confirmada ? "#f1f8f2" : "#ffffff",
      }}
    >
      <div style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>{loteNombre}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{nombre}</div>
      <div style={{ fontSize: 18, color: "#444", marginBottom: 16 }}>
        Planificado: {fechaMostrar}
      </div>

      {confirmada ? (
        <div style={{ fontSize: 18, color: "#2e7d32", fontWeight: 600 }}>
          ✓ Confirmado
        </div>
      ) : confirmando ? (
        <div>
          <input
            type="date"
            value={fechaInput}
            onChange={(e) => setFechaInput(e.target.value)}
            style={{
              fontSize: 18,
              padding: 12,
              width: "100%",
              marginBottom: 12,
              borderRadius: 8,
              border: "1px solid #ccc",
            }}
          />
          <button
            onClick={handleConfirmar}
            style={{
              fontSize: 18,
              fontWeight: 600,
              padding: "14px 20px",
              width: "100%",
              backgroundColor: "#2e7d32",
              color: "white",
              border: "none",
              borderRadius: 10,
            }}
          >
            Guardar fecha real
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmando(true)}
          style={{
            fontSize: 18,
            fontWeight: 600,
            padding: "14px 20px",
            width: "100%",
            backgroundColor: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: 10,
          }}
        >
          Confirmar esta etapa
        </button>
      )}
    </div>
  );
}
