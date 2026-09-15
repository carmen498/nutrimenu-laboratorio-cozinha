import React, { useEffect } from "react";
import { appParams } from "@/lib/app-params";
import { marcarOrigemCadastro, ORIGEM_GUIA_ZR } from "@/lib/origemCadastro";

const DESTINO_PADRAO = "https://zr.nutrimenu.com.br/entrar";

function validarVolta(volta) {
  if (typeof volta !== "string" || !volta.startsWith("https://")) return DESTINO_PADRAO;
  try {
    const url = new URL(volta);
    if (url.protocol !== "https:") return DESTINO_PADRAO;
    const host = url.hostname;
    if (host === "zr.nutrimenu.com.br" || host.endsWith(".vercel.app")) {
      // Descarta qualquer fragmento pré-existente antes de anexar o token.
      return `${url.origin}${url.pathname}${url.search}`;
    }
    return DESTINO_PADRAO;
  } catch {
    return DESTINO_PADRAO;
  }
}

export default function EntrarNoGuia() {
  useEffect(() => {
    // Quem chega em /entrar-no-guia veio do Guia ZR, sempre. Essa página é o
    // marcador — parâmetro de URL se perde; a ponte não. Se o visitante ainda
    // não está autenticado, o ProtectedRoute vai mandá-lo para o login/cadastro.
    // Gravamos a origem no sessionStorage ANTES do redirecionamento, para que
    // ela sobreviva até o pós-OTP, onde registrarAceiteTermos consome e persiste.
    marcarOrigemCadastro(ORIGEM_GUIA_ZR);

    const urlParams = new URLSearchParams(window.location.search);
    const endereco = validarVolta(urlParams.get("volta"));
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("base44_access_token")) || appParams.token;
    if (!token) {
      // Sem token de sessão: o ProtectedRoute já cuidou do login. Se chegamos
      // aqui sem token, não há o que repassar — recarrega para reaplicar o guard.
      window.location.reload();
      return;
    }
    window.location.replace(`${endereco}#access_token=${encodeURIComponent(token)}`);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <p className="font-body text-muted-foreground text-lg">Redirecionando…</p>
    </div>
  );
}