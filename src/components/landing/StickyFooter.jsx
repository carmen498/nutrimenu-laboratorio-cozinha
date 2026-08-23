import React from "react";
import { useAuth } from "@/lib/AuthContext";

export default function StickyFooter() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="lc-sticky-footer">
      <div className="lc-sticky-inner">
        <p className="lc-sticky-text">
          <strong>Laboratório de Cozinha</strong> · 7 dias grátis ·
          Planos a partir de R$ 16,50/mês no anual — sem renovação automática
        </p>
        <a className="lc-btn lc-btn--primary lc-sticky-cta" href={isAuthenticated ? "/app" : "/register"}>
          {isAuthenticated ? "Entrar no app" : "Começar agora"}
        </a>
      </div>
    </div>
  );
}
