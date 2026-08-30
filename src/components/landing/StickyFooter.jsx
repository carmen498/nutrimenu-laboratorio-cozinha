import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { APP_SITE_URLS } from "@/lib/publicUrls";

export default function StickyFooter() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="lc-sticky-footer">
      <div className="lc-sticky-inner">
        <p className="lc-sticky-text">
          <strong>Plataforma ZR</strong> · 7 dias de uso em até 30 dias ·
          Planos a partir de R$ 16,50/mês no anual — sem renovação automática
        </p>
        <a className="lc-btn lc-btn--primary lc-sticky-cta" href={isAuthenticated ? APP_SITE_URLS.appHome : APP_SITE_URLS.register}>
          {isAuthenticated ? "Entrar no app" : "Começar agora"}
        </a>
      </div>
    </div>
  );
}