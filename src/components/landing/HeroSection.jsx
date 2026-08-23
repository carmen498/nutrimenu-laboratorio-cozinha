import React from "react";
import { useAuth } from "@/lib/AuthContext";

export default function HeroSection({ heroImage }) {
  const { isAuthenticated } = useAuth();
  const primaryHref = isAuthenticated ? "/app" : "/register";
  const primaryLabel = isAuthenticated ? "Entrar no app" : "Experimentar 7 dias grátis";
  return (
    <section className="lc-hero" aria-labelledby="landing-hero-title">
      <div className="lc-container lc-topbar">
        <span className="lc-topbar-brand">Laboratório de Cozinha</span>
        <a className="lc-text-link" href={isAuthenticated ? "/app" : "/login"}>
          {isAuthenticated ? "Entrar no app" : "Já é assinante? Entrar"}
        </a>
      </div>
      <div className="lc-container lc-hero-grid">
        <div className="lc-hero-copy">
          <p className="lc-eyebrow">Planejamento de cozinha com método</p>
          <h1 id="landing-hero-title">Planeje, calcule e produza com segurança antes de acender o fogo.</h1>
          <p className="lc-hero-sub">
            Do planejamento ao prato: o app que organiza sua cozinha, escala receitas e calcula custos e compras por você — sem improviso e sem desperdício.
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
            <span className="lc-seal">7 dias grátis</span>
            <span className="lc-seal">Sem cartão no teste</span>
            <span className="lc-seal">Sem renovação automática</span>
          </div>
        </div>
        <figure className="lc-hero-media">
          {/* fetchpriority em caixa baixa: no React 18 só atributos
              desconhecidos minúsculos chegam ao DOM; a grafia camelCase
              é do React 19 e aqui gera warning a cada render. */}
          <img
            src={heroImage}
            alt="Casal maduro preparando uma refeição em uma cozinha residencial organizada"
            width="900"
            height="900"
            fetchpriority="high"
          />
        </figure>
      </div>
    </section>
  );
}
