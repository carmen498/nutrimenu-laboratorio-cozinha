import React from "react";

const FEATURES = [
  { emoji: "📖", title: "Banco de receitas vivo", text: "Organize por categoria e tags. Escale qualquer receita para o número de porções que precisar — os ingredientes recalculam sozinhos." },
  { emoji: "💰", title: "Custo real, não chute", text: "Custo por porção, kg e unidade. Ingredientes + insumos + margem. Preço sugerido na tela. Sem planilha." },
  { emoji: "📅", title: "Cardápios que se multiplicam", text: "Do almoço ao buffet de 200 pessoas. Altera o Nº de pessoas e tudo atualiza. Lista de compras automática." },
  { emoji: "🔄", title: "Receitas que rendem mais", text: "Escale para qualquer porção. Peso Bruto, Rendimento (PDP) e Fator de Correção automáticos." },
  { emoji: "🛒", title: "Ingredientes atualizados", text: "Base de ingredientes com preço por grama e fator de correção, para custo sempre preciso — sem estimativa no olho." },
  { emoji: "📊", title: "Per capita com base técnica", text: "149 preparações com dados oficiais do IBGE. Nunca mais sobra demais. Nunca mais falta." },
];

export default function FeaturesSection() {
  return (
    <section className="lc-section">
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">O que o app faz</p>
          <h2 className="lc-title">
            Não é só um app de receitas. É a sua cozinha funcionando com inteligência.
          </h2>
        </div>
        <div className="lc-features-grid">
          {FEATURES.map((f) => (
            <div className="lc-feature" key={f.title}>
              <div className="lc-emoji">{f.emoji}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
        <div className="lc-features-close">
          Sua cozinha continua a mesma. Mas agora ela:{" "}
          <strong>Produz na quantidade certa</strong> — sem sobrar, sem faltar ·{" "}
          <strong>Cobra com confiança</strong> — porque sabe exatamente o que custa ·{" "}
          <strong>Planeja antes de acender o fogo</strong> — sem improviso, sem caos ·{" "}
          <strong>Cresce com você</strong> — do almoço de domingo ao buffet de 200 pessoas.
        </div>
      </div>
    </section>
  );
}