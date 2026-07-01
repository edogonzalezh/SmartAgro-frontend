"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El dashboard fue fusionado con la pantalla principal.
// Esta página redirige a / para mantener compatibilidad con links existentes.
export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(()=>{ router.replace("/"); },[]);
  return null;
}
