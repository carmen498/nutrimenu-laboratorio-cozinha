import React from "react";

export default function HeroSection({ heroImage }) {
  return (
    <section className="lc-hero" aria-labelledby="landing-hero-title">
      <div className="lc-container lc-hero-grid">
        <div className="lc-hero-copy">
          <p className="lc-eyebrow">Planejamento de cozinha com método</p>
          <h1 id="landing-hero-title">Planeje, calcule e produza com segurança antes de acender o fogo.</h1>
          <p className="lc-hero-sub">
            Receitas, cardápios, custos, per capita e listas de compras reunidos em um único lugar para quem cozinha em casa ou profissionalmente.
          </p>
          <div className="lc-hero-cta">
            <a className="lc-btn lc-btn--primary lc-btn--lg" href="/register">
              Experimentar 7 dias grátis
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
