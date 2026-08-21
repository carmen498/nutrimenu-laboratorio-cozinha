import React from "react";

const BENEFITS = [
  { tag: "🏷", title: "Saiba exatamente o que cobrar", text: "Calcule o custo real de cada receita — ingredientes, insumos e margem — e defina seu preço com segurança, sem trabalhar no prejuízo sem saber." },
  { tag: "🏷", title: "Nunca mais erre a quantidade", text: "Use o per capita técnico para planejar qualquer evento, de 4 a 200 pessoas, com a lista de compras gerada automaticamente." },
  { tag: "🏷", title: "Organize a semana em minutos", text: "Monte o cardápio, gere a lista de compras e vá ao mercado uma vez só — sem indecisão, sem esquecimento." },
  { tag: "🏷", title: "Cozinhe para si mesmo com confiança", text: "Planeje refeições simples, na quantidade certa, sem depender de delivery todos os dias." },
];

export default function BenefitsSection() {
  return (
    <section className="lc-section">
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">Resultados</p>
          <h2 className="lc-title">O que você vai conseguir fazer</h2>
        </div>
        <div className="lc-benefits-grid">
          {BENEFITS.map((b) => (
            <div className="lc-benefit" key={b.title}>
              <div className="lc-benefit-tag">{b.tag}</div>
              <div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}