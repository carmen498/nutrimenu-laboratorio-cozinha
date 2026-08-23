import React from "react";
import { Calculator, Scale, CalendarCheck, CookingPot } from "lucide-react";

const BENEFITS = [
  { Icon: Calculator, title: "Saiba exatamente o que cobrar", text: "Calcule o custo real de cada receita — ingredientes, insumos e margem — e defina seu preço com segurança, sem trabalhar no prejuízo sem saber." },
  { Icon: Scale, title: "Nunca mais erre a quantidade", text: "Use o per capita técnico para planejar qualquer evento, de 4 a 200 pessoas, com a lista de compras gerada automaticamente." },
  { Icon: CalendarCheck, title: "Organize a semana em minutos", text: "Monte o cardápio, gere a lista de compras e vá ao mercado uma vez só — sem indecisão, sem esquecimento." },
  { Icon: CookingPot, title: "Cozinhe para si mesmo com confiança", text: "Planeje refeições simples, na quantidade certa, sem depender de delivery todos os dias." },
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
              <div className="lc-benefit-tag" aria-hidden="true">
                <b.Icon size={20} strokeWidth={2} />
              </div>
              <div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="lc-benefits-cta">
          <a className="lc-text-link" href="#planos">Ver planos e preços</a>
        </p>
      </div>
    </section>
  );
}
