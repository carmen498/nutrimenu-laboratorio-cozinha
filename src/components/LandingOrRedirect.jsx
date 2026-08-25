import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Landing from "@/pages/Landing";

// A LP é pública em "/" para visitantes. Usuários autenticados que abrem a
// raiz são redirecionados direto para /app, sem renderizar a página de
// marketing. O estado de auth já foi resolvido pelo AuthProvider antes de
// chegar aqui (AuthenticatedApp só monta as rotas após isLoadingAuth=false).
export default function LandingOrRedirect() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }
  return <Landing />;
}