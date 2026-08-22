import React from "react";
import { useAuth } from "@/lib/AuthContext";

export default function HeroSection({ heroImage }) {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "/app" : "/register";
  const primaryLabel = isAuthenticated ? "Entrar no app" : "Experimentar 7 dias grátis";
  return (
    <section className="lc-hero" aria-labelledby="landing-hero-title">
      <div className="lc-container lc-hero-grid">
        <div className="lc-hero-copy">
          <p className="lc-eyebrow">Planejamento de cozinha com método</p>
          <h1 id="landing-hero-title">Planeje, calcule e produza com segurança antes de acender o fogo.</h1>
          <p className="lc-hero-sub">
            O que vamos cozinhar hoje? Do planejamento ao prato — sem improviso, sem desperdício, sem estresse. O app que organiza sua cozinha, escala suas receitas e calcula tudo por você.
          </p>
          <div className="lc-hero-cta">
            <a className="lc-btn lc-btn--primary lc-btn--lg" href={primaryHref}>
              {primaryLabel}
            </a>
            <a className="lc-text-link" href="#planos">
              Ver planos
            </a>
          </div>
          <div className="lc-hero-seals lc-seals" aria-label="Condições do teste">
            <span className="lc-seal">Acesso imediato</span>
            <span className="lc-seal">Sem cartão no teste</span>
            <span className="lc-seal">Sem renovação automática</span>
          </div>
        </div>
        <figure className="lc-hero-media">
          <img
            src={heroImage}
            alt="Casal maduro preparando uma refeição em uma cozinha residencial organizada"
            fetchPriority="high"
          />
        </figure>
      </div>
    </section>
  );
}