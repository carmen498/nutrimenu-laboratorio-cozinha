import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { APP_SITE_URLS } from "@/lib/publicUrls";
import HeroPortalCard from "@/components/landing/HeroPortalCard";
import { HERO_PORTALS, LANDING_IMAGES } from "@/lib/landingUseCases";

export default function HeroSection() {
  const { isAuthenticated } = useAuth();
  return (
    <section className="lc-doors-hero" aria-labelledby="landing-hero-title">
      <div className="lc-container lc-topbar">
        <span className="lc-topbar-brand">Laboratório de Cozinha</span>
        <a className="lc-text-link" href={isAuthenticated ? APP_SITE_URLS.appHome : APP_SITE_URLS.login}>
          {isAuthenticated ? "Entrar no app" : "Já é assinante? Entrar"}
        </a>
      </div>
      <div className="lc-container lc-doors-head">
        <p className="lc-eyebrow">Planejamento de cozinha com método</p>
        <h1 id="landing-hero-title">Laboratório de Cozinha</h1>
        <p>Do planejamento ao prato: o app que organiza sua cozinha, escala receitas e calcula custos e compras por você — sem improviso e sem desperdício.</p>
      </div>
      <div className="lc-container">
        <p className="lc-doors-intro">Comece pelo que você precisa hoje:</p>
        <div className="lc-portal-grid">
          {HERO_PORTALS.map((portal, index) => <HeroPortalCard key={portal.key} portal={portal} image={LANDING_IMAGES[portal.key]} priority={index === 0} />)}
        </div>
        <div className="lc-hero-seals lc-seals" aria-label="Condições do teste">
          <span className="lc-seal">7 dias de uso em até 30 dias</span>
          <span className="lc-seal">Sem cartão no teste</span>
          <span className="lc-seal">Sem renovação automática</span>
        </div>
      </div>
    </section>
  );
}