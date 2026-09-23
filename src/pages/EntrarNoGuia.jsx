import React, { useEffect } from "react";
import { appParams } from "@/lib/app-params";
import { marcarOrigemCadastro, ORIGEM_GUIA_ZR } from "@/lib/origemCadastro";
import { validarVolta } from "@/lib/voltaGuiaZR";
import { serializeReturnTo } from "@/lib/authReturnTo";

const CHAVE_RETORNO_GUIA = "base44_pending_guia_bridge";

export default function EntrarNoGuia() {
  useEffect(() => {
    // Quem chega em /entrar-no-guia veio do Guia ZR, sempre. Essa página é o
    // marcador — parâmetro de URL se perde; a ponte não. Gravamos a origem no
    // sessionStorage ANTES de qualquer redirecionamento, para que ela sobreviva
    // até o pós-OTP, onde registrarAceiteTermos consome e persiste.
    marcarOrigemCadastro(ORIGEM_GUIA_ZR);

    const urlParams = new URLSearchParams(window.location.search);
    const endereco = validarVolta(urlParams.get("volta"));
    const token =
      (typeof localStorage !== "undefined" && localStorage.getItem("base44_access_token")) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem("base44_access_token")) ||
      appParams.token;

    if (!token) {
      // Guarda uma segunda via do retorno. Alguns saltos do SDK/OAuth limpam a
      // query do login; sem esta chave, o fallback seria /app e a pessoa cairia
      // no Laboratório de Cozinha em vez de voltar ao Guia.
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem(CHAVE_RETORNO_GUIA, serializeReturnTo(currentPath));
      window.location.replace(`/login?returnTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    sessionStorage.removeItem(CHAVE_RETORNO_GUIA);
    // Autenticado: redireciona para o Guia com o token.
    window.location.replace(`${endereco}#access_token=${encodeURIComponent(token)}`);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <p className="font-body text-muted-foreground text-lg">Redirecionando…</p>
    </div>
  );
}