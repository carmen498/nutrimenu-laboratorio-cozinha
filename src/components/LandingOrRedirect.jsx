import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Landing from "@/pages/Landing";

// Página inicial pública: mostra a LP para visitantes e redireciona
// usuários já autenticados direto para a Home do app (/app).
export default function LandingOrRedirect() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;
  return <Landing />;
}