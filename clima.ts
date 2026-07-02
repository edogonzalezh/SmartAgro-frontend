// lib/clima.ts
// Integración con Open-Meteo — gratuita, sin API key, sin registro

export interface DiaClima {
  fecha: string;
  tempMax: number;
  tempMin: number;
  precipitacionPct: number;
  codigoClima: number;
}

export interface AlertaClima {
  tipo: "helada" | "lluvia" | "calor";
  fecha: string;
  descripcion: string;
  nivel: "advertencia" | "critica";
}

// Coordenadas de Talca, VII Región
const LAT = -35.4264;
const LON = -71.6554;

export async function obtenerPronosticoTalca(): Promise<DiaClima[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=America%2FSantiago&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo obtener el pronóstico");
  const data = await res.json();

  return data.daily.time.map((fecha: string, i: number) => ({
    fecha,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitacionPct: data.daily.precipitation_probability_max[i],
    codigoClima: data.daily.weathercode[i],
  }));
}

export function generarAlertas(pronostico: DiaClima[], etapasCriticas: { nombre: string; fecha: string }[]): AlertaClima[] {
  const alertas: AlertaClima[] = [];

  for (const dia of pronostico) {
    // Helada: temperatura mínima bajo 4°C
    if (dia.tempMin < 4) {
      alertas.push({
        tipo: "helada",
        fecha: dia.fecha,
        descripcion: `Riesgo de helada (${dia.tempMin}°C mín). Protege cultivos sensibles.`,
        nivel: dia.tempMin < 0 ? "critica" : "advertencia",
      });
    }
    // Lluvia intensa: más del 70% de probabilidad
    if (dia.precipitacionPct > 70) {
      alertas.push({
        tipo: "lluvia",
        fecha: dia.fecha,
        descripcion: `Alta probabilidad de lluvia (${dia.precipitacionPct}%). Evita aplicaciones de agroquímicos.`,
        nivel: dia.precipitacionPct > 85 ? "critica" : "advertencia",
      });
    }
    // Ola de calor: temperatura máxima sobre 35°C
    if (dia.tempMax > 35) {
      alertas.push({
        tipo: "calor",
        fecha: dia.fecha,
        descripcion: `Ola de calor (${dia.tempMax}°C máx). Aumenta frecuencia de riego.`,
        nivel: dia.tempMax > 38 ? "critica" : "advertencia",
      });
    }

    // Cruzar con etapas críticas del agricultor
    for (const etapa of etapasCriticas) {
      if (etapa.fecha === dia.fecha) {
        if (dia.tempMin < 4) {
          alertas.push({
            tipo: "helada",
            fecha: dia.fecha,
            descripcion: `⚠️ Helada durante "${etapa.nombre}". Considera protección urgente.`,
            nivel: "critica",
          });
        }
        if (dia.precipitacionPct > 70) {
          alertas.push({
            tipo: "lluvia",
            fecha: dia.fecha,
            descripcion: `⚠️ Lluvia durante "${etapa.nombre}". Revisa si puedes reagendar la labor.`,
            nivel: "advertencia",
          });
        }
      }
    }
  }

  // Eliminar duplicados por fecha+tipo
  return alertas.filter((a,i,arr)=>arr.findIndex(b=>b.fecha===a.fecha&&b.tipo===a.tipo&&b.descripcion===a.descripcion)===i);
}

export function iconoClima(codigo: number): string {
  if (codigo === 0) return "☀️";
  if (codigo <= 3) return "⛅";
  if (codigo <= 49) return "🌫️";
  if (codigo <= 69) return "🌧️";
  if (codigo <= 79) return "🌨️";
  if (codigo <= 99) return "⛈️";
  return "🌤️";
}

export function fmtDia(fecha: string): string {
  const d = new Date(fecha+"T12:00:00");
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const diff = Math.round((d.getTime()-hoy.getTime())/86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  return d.toLocaleDateString("es-CL",{ weekday:"short", day:"numeric" });
}
