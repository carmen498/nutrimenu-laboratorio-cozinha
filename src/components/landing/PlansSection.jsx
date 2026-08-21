import React from "react";

const PLANS = [
  { name: "Teste Grátis", price: "R$ 0", detail: "7 dias de acesso completo", featured: false, cta: "Começar teste" },
  { name: "30 dias", price: "R$ 29,90/30 dias", detail: "Sem fidelidade", featured: false, cta: "Assinar 30 dias" },
  { name: "Anual", price: "R$ 16,50/mês", detail: "Cobrado em parcela única de R$ 198,00/ano", featured: true, cta: "Assinar anual" },
  { name: "Renovação", price: "R$ 16,50/mês", detail: "A partir do 2º ano · em até 6x, ou R$ 99,00 à vista/ano · Benefício de fidelidade", featured: false, cta: "Saiba mais" },
];

export default function PlansSection() {
  return (
    <section className="lc-section" style={{ background: "rgba(226, 210, 184, 0.4)" }}>
      <div className="lc-container">
        <div className="lc-section-head" style={{ textAlign: "center" }}>
          <p className="lc-eyebrow">Planos</p>
          <h2 className="lc-title">Escolha o seu plano</h2>
          <p className="lc-lead">Sem renovação automática — você decide quando continuar.</p>
        </div>
        <div className="lc-plans-grid">
          {PLANS.map((p) => (
            <div className={`lc-plan${p.featured ? " lc-plan--featured" : ""}`} key={p.name}>
              {p.featured && <span className="lc-plan-badge">Mais vantajoso</span>}
              <h3 className="lc-plan-name">{p.name}</h3>
              <div className="lc-plan-price">{p.price}</div>
              <p className="lc-plan-detail">{p.detail}</p>
              <a className={`lc-btn ${p.featured ? "lc-btn--primary" : "lc-btn--secondary"}`} href="/register">
                {p.cta} →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}