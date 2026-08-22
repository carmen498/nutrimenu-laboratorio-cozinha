import React from "react";

const FEATURES = [
  { index: "01", title: "Receitas que escalam com você", text: "Ajuste porções e rendimentos sem refazer contas. Os ingredientes acompanham a nova escala automaticamente." },
  { index: "02", title: "Custos que mostram o preço real", text: "Visualize custo por porção, quilo ou unidade, some insumos e margem e decida o preço com base em dados." },
  { index: "03", title: "Cardápios ligados à lista de compras", text: "Planeje uma semana, um almoço ou um evento e transforme o cardápio em uma compra organizada." },
  { index: "04", title: "Rendimento e fator de correção", text: "Considere peso bruto, rendimento e fator de correção para reduzir erro de produção e desperdício." },
  { index: "05", title: "Ingredientes com base de apoio", text: "Centralize ingredientes, preços e fatores para não depender de anotações soltas ou estimativas feitas no olho." },
  { index: "06", title: "Per capita com referência técnica", text: "Use referências de consumo para dimensionar preparações e planejar quantidades com mais segurança." },
];

export default function FeaturesSection() {
  return (
    <section className="lc-section lc-features" aria-labelledby="features-title">
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">O método dentro do app</p>
          <h2 className="lc-title" id="features-title">
            Da receita à compra, cada etapa conversa com a próxima.
          </h2>
          <p className="lc-lead">
            O Laboratório de Cozinha foi pensado para reduzir retrabalho. Você informa uma vez e reaproveita os dados no planejamento, na produção e no custo.
          </p>
        </div>

        <div className="lc-feature-list">
          {FEATURES.map((feature) => (
            <article className="lc-feature-row" key={feature.title}>
              <span className="lc-feature-index" aria-hidden="true">{feature.index}</span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="lc-features-close">
          <p>Menos improviso entre uma etapa e outra.</p>
          <div className="lc-outcome-strip">
            <span>Quantidade certa</span>
            <span>Custo conhecido</span>
            <span>Compra planejada</span>
            <span>Produção organizada</span>
          </div>
        </div>
      </div>
    </section>
  );
}
