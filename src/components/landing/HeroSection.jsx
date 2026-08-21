import React from "react";

export default function HeroSection({ heroImage }) {
  return (
    <section className="lc-hero">
      <div className="lc-container lc-hero-grid">
        <div>
          <p className="lc-eyebrow">
            Para cozinheiras profissionais, produtoras artesanais e quem quer organizar a cozinha de vez.
          </p>
          <h1>O que vamos cozinhar hoje?</h1>
          <p className="lc-hero-sub">
            Do planejamento ao prato — sem improviso, sem desperdício, sem estresse.
            O app que organiza sua cozinha, escala suas receitas e calcula tudo por você.
          </p>
          <div className="lc-hero-cta">
            <a className="lc-btn lc-btn--primary lc-btn--lg" href="/register">
              Quero experimentar 7 dias grátis →
            </a>
          </div>
          <div className="lc-hero-seals lc-seals">
            <span className="lc-seal">Acesso imediato</span>
            <span className="lc-seal">Sem cobrança automática</span>
            <span className="lc-seal">Sem fidelidade</span>
          </div>
        </div>
        <div className="lc-hero-media">
          <img src={heroImage} alt="Casal maduro cozinhando junto em cozinha rústica com produção farta" />
        </div>
      </div>
    </section>
  );
}