import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { APP_SITE_URLS } from "@/lib/publicUrls";

const PLANS = [
  { name: "Teste Grátis", price: "R$ 0", period: "", detail: "7 dias de acesso completo · sem cartão", featured: false, cta: "Começar teste" },
  { name: "30 dias", price: "R$ 29,90", period: "/30 dias", detail: "Sem fidelidade · pague de novo só se quiser continuar", featured: false, cta: "Assinar 30 dias" },
  { name: "Anual", price: "R$ 198", period: "/ano", detail: "Cobrança única, com opção de parcelar no cartão · equivale a R$ 16,50/mês", featured: true, cta: "Assinar anual" },
];

export default function PlansSection() {
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? APP_SITE_URLS.plans : APP_SITE_URLS.register;
  return (
    <section className="lc-section lc-section--tinted" id="planos" aria-labelledby="plans-title">
      <div className="lc-container">
        <div className="lc-section-head lc-section-head--center">
          <p className="lc-eyebrow">Planos</p>
          <h2 className="lc-title" id="plans-title">Escolha o seu plano</h2>
          <p className="lc-lead">Nenhum plano renova sozinho — cada período só continua se você quiser.</p>
        </div>
        <div className="lc-plans-grid">
          {PLANS.map((p) => (
            <div className={`lc-plan${p.featured ? " lc-plan--featured" : ""}`} key={p.name}>
              {p.featured && <span className="lc-plan-badge">Mais vantajoso</span>}
              <h3 className="lc-plan-name">{p.name}</h3>
              <div className="lc-plan-price">
                {p.price}
                {p.period && <span className="lc-plan-period">{p.period}</span>}
              </div>
              <p className="lc-plan-detail">{p.detail}</p>
              <a className={`lc-btn ${p.featured ? "lc-btn--primary" : "lc-btn--secondary"}`} href={ctaHref}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>
        <p className="lc-plans-note">
          Quem fica, paga menos: a partir do 2º ano, a renovação do plano anual custa R$ 99,00 — metade do valor. Sem renovação automática: você decide se continua.
        </p>
      </div>
    </section>
  );
}