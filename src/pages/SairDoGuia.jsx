import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";

const DESTINO_PADRAO = "https://zr.nutrimenu.com.br";

function validarVolta(volta) {
  if (typeof volta !== "string" || !volta.startsWith("https://")) return DESTINO_PADRAO;
  try {
    const url = new URL(volta);
    if (url.protocol !== "https:") return DESTINO_PADRAO;
    const host = url.hostname;
    if (host === "zr.nutrimenu.com.br" || host.endsWith(".vercel.app")) {
      return `${url.origin}${url.pathname}${url.search}`;
    }
    return DESTINO_PADRAO;
  } catch {
    return DESTINO_PADRAO;
  }
}

export default function SairDoGuia() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const endereco = validarVolta(urlParams.get("volta"));

    const redirecionar = () => {
      window.location.replace(endereco);
    };

    base44.auth.isAuthenticated().then((logado) => {
      if (!logado) {
        redirecionar();
        return;
      }
      base44.auth.logout().catch(() => {}).finally(() => {
        redirecionar();
      });
    }).catch(() => {
      redirecionar();
    });
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <p className="font-body text-muted-foreground text-lg">Saindo…</p>
    </div>
  );
}