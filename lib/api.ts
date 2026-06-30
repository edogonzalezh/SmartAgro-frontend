// lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface EtapaLote {
  id: string;
  etapaCodigo: string;
  nombre: string;
  fechaPlanificada: string;
  fechaReal: string | null;
}

export interface TareaLote {
  id: string;
  nombre: string;
  etapaAncla: string;
  offsetDias: number;
  fechaPlanificada: string;
}

export interface Lote {
  id: string;
  nombre: string;
  fichaId: string;
  etapas: EtapaLote[];
  tareas: TareaLote[];
}

export async function crearUsuario(nombre: string, email: string): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email }),
  });
  if (!res.ok) throw new Error("Error al crear el usuario");
  return res.json();
}

export async function crearPredio(
  nombre: string,
  ubicacion: string,
  usuarioId: string,
): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/predios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, ubicacion, usuarioId }),
  });
  if (!res.ok) throw new Error("Error al crear el predio");
  return res.json();
}

export async function crearLote(data: {
  nombre: string;
  predioId: string;
  fichaId: string;
  fechaInicio: string;
}): Promise<Lote> {
  const res = await fetch(`${API_URL}/lotes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el lote");
  return res.json();
}

export async function confirmarEtapa(
  loteId: string,
  etapaCodigo: string,
  fechaReal: string,
): Promise<{ diffDiasAplicado: number }> {
  const res = await fetch(`${API_URL}/lotes/${loteId}/confirmar-etapa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ etapaCodigo, fechaReal }),
  });
  if (!res.ok) throw new Error("Error al confirmar la etapa");
  return res.json();
}

export async function registrarEventoClimatico(
  loteId: string,
  tipo: "helada" | "ola_calor",
  fecha: string,
): Promise<{ ajusteSugeridoDias: number }> {
  const res = await fetch(`${API_URL}/lotes/${loteId}/eventos-climaticos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, fecha }),
  });
  if (!res.ok) throw new Error("Error al registrar evento climático");
  return res.json();
}
