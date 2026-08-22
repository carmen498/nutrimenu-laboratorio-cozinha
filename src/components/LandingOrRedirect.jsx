import React from "react";
import Landing from "@/pages/Landing";

// A LP agora é sempre pública em "/" — visitantes e usuários autenticados
// podem vê-la. O botão "Início" da barra lateral aponta para /app, e os CTAs
// da LP levam usuários logados direto ao app.
export default function LandingOrRedirect() {
  return <Landing />;
}