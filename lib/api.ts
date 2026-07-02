const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface EtapaLote {
  id: string; etapaCodigo: string; nombre: string;
  fechaPlanificada: string; fechaReal: string | null;
}
export interface TareaLote {
  id: string; nombre: string; etapaAncla: string;
  offsetDias: number; fechaPlanificada: string;
}
export interface Lote {
  id: string; nombre: string; fichaId: string;
  etapas: EtapaLote[]; tareas: TareaLote[];
}
export interface Usuario { id: string; nombre: string; email: string; }
export interface EtapaFicha {
  id: string; etapaCodigo: string; nombre: string;
  orden: number; duracionDesdeAnterior: number;
}
export interface TareaFicha {
  id: string; nombre: string; etapaAncla: string; offsetDias: number;
}
export interface FichaCultivo {
  id: string; nombre: string; cultivo: string; zona: string;
  etapas: EtapaFicha[]; tareas: TareaFicha[];
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smartagro_token");
}
export function setToken(token: string) { localStorage.setItem("smartagro_token", token); }
export function removeToken() { localStorage.removeItem("smartagro_token"); }

function headers() {
  const t = getToken();
  return { "Content-Type": "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function post(path: string, body: object) {
  const res = await fetch(`${API_URL}${path}`, { method:"POST", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json().catch(()=>({message:"Error"})); throw new Error(e.message ?? "Error"); }
  return res.json();
}
async function get(path: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: headers() });
  if (!res.ok) throw new Error("Error");
  return res.json();
}
async function patch(path: string, body: object) {
  const res = await fetch(`${API_URL}${path}`, { method:"PATCH", headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Error");
  return res.json();
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
  const data = await post("/auth/login", { email, password });
  setToken(data.token);
  return data;
}
export async function registro(nombre: string, email: string, password: string): Promise<{ token: string; usuario: Usuario }> {
  const data = await post("/auth/registro", { nombre, email, password });
  setToken(data.token);
  return data;
}

// ─── Usuarios/Predios ────────────────────────────────────────────────────────

export async function crearUsuario(nombre: string, email: string): Promise<{ id: string }> {
  return post("/usuarios", { nombre, email });
}
export async function crearPredio(nombre: string, ubicacion: string, usuarioId: string): Promise<{ id: string }> {
  return post("/predios", { nombre, ubicacion, usuarioId });
}

// ─── Lotes ───────────────────────────────────────────────────────────────────

export async function obtenerLotes(): Promise<Lote[]> { return get("/lotes"); }
export async function crearLote(data: { nombre: string; predioId: string; fichaId: string; fechaInicio: string }): Promise<Lote> {
  return post("/lotes", data);
}
export async function confirmarEtapa(loteId: string, etapaCodigo: string, fechaReal: string) {
  return post(`/lotes/${loteId}/confirmar-etapa`, { etapaCodigo, fechaReal });
}
export async function registrarEventoClimatico(loteId: string, tipo: "helada"|"ola_calor", fecha: string) {
  return post(`/lotes/${loteId}/eventos-climaticos`, { tipo, fecha });
}

// ─── Fichas técnicas ─────────────────────────────────────────────────────────

export async function obtenerFichas(): Promise<FichaCultivo[]> { return get("/fichas"); }
export async function actualizarEtapaFicha(etapaId: string, duracionDesdeAnterior: number) {
  return patch(`/fichas/etapas/${etapaId}`, { duracionDesdeAnterior });
}
export async function actualizarTareaFicha(tareaId: string, offsetDias: number) {
  return patch(`/fichas/tareas/${tareaId}`, { offsetDias });
}
export async function agregarEtapa(fichaId: string, data: { etapaCodigo:string; nombre:string; orden:number; duracionDesdeAnterior:number }) {
  return post(`/fichas/${fichaId}/etapas`, data);
}
export async function eliminarEtapaFicha(etapaId: string): Promise<void> {
  const res = await fetch(`${API_URL}/fichas/etapas/${etapaId}`, { method:"DELETE", headers: headers() });
  if (!res.ok) throw new Error("Error al eliminar etapa");
}
export async function agregarTarea(fichaId: string, data: { nombre:string; etapaAncla:string; offsetDias:number }) {
  return post(`/fichas/${fichaId}/tareas`, data);
}
export async function eliminarTareaFicha(tareaId: string): Promise<void> {
  const res = await fetch(`${API_URL}/fichas/tareas/${tareaId}`, { method:"DELETE", headers: headers() });
  if (!res.ok) throw new Error("Error al eliminar tarea");
}

// ─── Gestión de lotes ────────────────────────────────────────────────────────

export async function obtenerPredios(): Promise<any[]> { return get("/lotes/predios"); }
export async function obtenerLote(loteId: string): Promise<Lote> { return get(`/lotes/${loteId}`); }
export async function actualizarLote(loteId: string, data: { nombre?: string; notas?: string }) {
  return patch(`/lotes/${loteId}`, data);
}
export async function eliminarLote(loteId: string): Promise<void> {
  const res = await fetch(`${API_URL}/lotes/${loteId}`, { method:"DELETE", headers: headers() });
  if (!res.ok) throw new Error("Error al eliminar");
}
export async function confirmarEtapaConNotas(loteId: string, etapaCodigo: string, fechaReal: string, fechaRealFin?: string, notas?: string) {
  return post(`/lotes/${loteId}/confirmar-etapa`, { etapaCodigo, fechaReal, fechaRealFin, notas });
}
// ─── Módulo económico (Fase 3) ───────────────────────────────────────────────

export interface Gasto {
  id: string; loteId: string; categoria: string;
  descripcion: string; cantidad?: number; unidad?: string;
  monto: number; fecha: string;
}
export interface Ingreso {
  id: string; loteId: string; descripcion: string;
  cantidad?: number; unidad?: string; precioUnitario?: number;
  monto: number; fecha: string; comprador?: string;
}
export interface ResumenLote {
  lote: any; totalGastos: number; totalIngresos: number;
  margen: number; rentabilidad: number;
  gastosPorCategoria: Record<string,number>;
  gastos: Gasto[]; ingresos: Ingreso[];
}
export interface ResumenGlobal {
  loteId: string; loteNombre: string; fichaNombre: string;
  totalGastos: number; totalIngresos: number; margen: number;
}

export async function obtenerResumenGlobal(): Promise<ResumenGlobal[]> { return get("/economico/resumen"); }
export async function obtenerResumenLote(loteId: string): Promise<ResumenLote> { return get(`/economico/lote/${loteId}`); }
export async function registrarGasto(data: Omit<Gasto,"id">): Promise<Gasto> { return post("/economico/gastos", data); }
export async function eliminarGasto(gastoId: string): Promise<void> {
  const res = await fetch(`${API_URL}/economico/gastos/${gastoId}`, { method:"DELETE", headers: headers() });
  if (!res.ok) throw new Error("Error");
}
export async function registrarIngreso(data: Omit<Ingreso,"id">): Promise<Ingreso> { return post("/economico/ingresos", data); }
export async function eliminarIngreso(ingresoId: string): Promise<void> {
  const res = await fetch(`${API_URL}/economico/ingresos/${ingresoId}`, { method:"DELETE", headers: headers() });
  if (!res.ok) throw new Error("Error");
}
