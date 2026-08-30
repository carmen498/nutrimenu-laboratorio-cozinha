import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { APP_SITE_URLS } from "@/lib/publicUrls";

export default function FinalCtaSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="lc-section">
      <div className="lc-container">
        <div className="lc-final">
          <p>
            Sua cozinha organizada começa hoje. Planejamento. Escala. Custo. Compras. Tudo em um app.
            Feito por quem viveu a cozinha de dentro — e nunca parou de aprender.
          </p>
          <a className="lc-btn lc-btn--primary lc-btn--lg" href={isAuthenticated ? APP_SITE_URLS.appHome : APP_SITE_URLS.register}>
            {isAuthenticated ? "Entrar no app" : "Começar meu teste grátis"}
          </a>
          {!isAuthenticated && (
            <p className="lc-final-note">
              Depois, plano anual por R$ 198/ano (sai R$ 16,50/mês) ou 30 dias por R$ 29,90 — sem renovação automática.
            </p>
          )}
          <div className="lc-seals lc-final-seals">
            <span className="lc-seal">7 dias de uso em até 30 dias</span>
            <span className="lc-seal">Sem cartão no teste</span>
            <span className="lc-seal">Sem renovação automática</span>
          </div>
        </div>
      </div>
    </section>
  );
}