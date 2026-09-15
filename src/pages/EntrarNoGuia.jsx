import React, { useEffect } from "react";
import { appParams } from "@/lib/app-params";
import { marcarOrigemCadastro, ORIGEM_GUIA_ZR } from "@/lib/origemCadastro";
import { validarVolta } from "@/lib/voltaGuiaZR";

export default function EntrarNoGuia() {
  useEffect(() => {
    // Quem chega em /entrar-no-guia veio do Guia ZR, sempre. Essa página é o
    // marcador — parâmetro de URL se perde; a ponte não. Gravamos a origem no
    // sessionStorage ANTES de qualquer redirecionamento, para que ela sobreviva
    // até o pós-OTP, onde registrarAceiteTermos consome e persiste.
    marcarOrigemCadastro(ORIGEM_GUIA_ZR);

    const urlParams = new URLSearchParams(window.location.search);
    const endereco = validarVolta(urlParams.get("volta"));
    const token = (typeof localStorage !== "undefined" && localStorage.getItem("base44_access_token")) || appParams.token;

    if (!token) {
      // Visitante não autenticado: manda para o login preservando o caminho
      // completo (incluindo ?volta=...) como returnTo. Após login/cadastro,
      // o usuário volta aqui autenticado e é redirecionado para o Guia.
      const currentPath = window.location.pathname + window.location.search;
      window.location.replace(`/login?returnTo=${encodeURIComponent(currentPath)}`);
      return;
    }

    // Autenticado: redireciona para o Guia com o token.
    window.location.replace(`${endereco}#access_token=${encodeURIComponent(token)}`);
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <p className="font-body text-muted-foreground text-lg">Redirecionando…</p>
    </div>
  );
}