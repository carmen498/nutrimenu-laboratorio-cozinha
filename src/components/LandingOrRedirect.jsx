import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Landing from "@/pages/Landing";
import { isPublicSiteHost } from "@/lib/publicUrls";

export default function LandingOrRedirect() {
  const { isAuthenticated } = useAuth();

  // O domínio principal é sempre institucional, mesmo quando há sessão ativa.
  if (isPublicSiteHost()) return <Landing />;

  // No subdomínio do aplicativo (e no preview técnico), a raiz é somente uma
  // porta de entrada para o app ou para o login.
  return <Navigate to={isAuthenticated ? "/app" : "/login"} replace />;
}