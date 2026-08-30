import React from "react";

const MOTOR = [
  { title: "Per capitas inteligentes", text: "Quantidades por tipo de pessoa e de serviço, não um número único por cabeça." },
  { title: "Fator de correção", text: "O app compra o peso bruto, não o peso da receita pronta." },
  { title: "Escalador de receitas", text: "De 4 para 40 porções com todos os ingredientes recalculados." },
  { title: "Cascata de preços", text: "Um ingrediente muda, todas as receitas atualizam." },
];

const NUMBERS = [
  { figure: "+2.200", label: "Receitas" },
  { figure: "+630", label: "Ingredientes" },
  { figure: "+50", label: "Cardápios" },
  { figure: "17", label: "Categorias de receitas" },
];

export default function NumbersSection() {
  return (
    <section className="lc-numbers lc-engine" aria-labelledby="engine-title">
      <div className="lc-container lc-section">
        <h2 id="engine-title">Isto não é um app de receitas</h2>
        <p className="lc-engine-lead">Por baixo de cada tela existe um motor de cálculo profissional: per capitas por perfil de cliente, fator de correção por ingrediente, escalador proporcional de receitas e formação de preço com cascata automática. É a diferença entre guardar receitas e planejar, calcular e produzir.</p>
        <div className="lc-engine-grid">
          {MOTOR.map((item) => (
            <article key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="lc-eyebrow">O que você encontra dentro do app</p>
        <div className="lc-numbers-grid">
          {NUMBERS.map((n) => (
            <div key={n.label}>
              <div className="lc-number-figure">{n.figure}</div>
              <div className="lc-number-label">{n.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}