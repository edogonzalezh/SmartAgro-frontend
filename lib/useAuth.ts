// lib/useAuth.ts
"use client";
import { useEffect, useState } from "react";
import { getToken, removeToken } from "./api";

export function useAuth() {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);

  useEffect(() => {
    setAutenticado(!!getToken());
  }, []);

  function cerrarSesion() {
    removeToken();
    window.location.href = "/login";
  }

  return { autenticado, cerrarSesion };
}
