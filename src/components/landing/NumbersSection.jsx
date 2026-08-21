import React from "react";

const NUMBERS = [
  { figure: "+2.200", label: "Receitas" },
  { figure: "+630", label: "Ingredientes" },
  { figure: "+50", label: "Cardápios" },
  { figure: "+30", label: "Anos de Experiência" },
  { figure: "18", label: "Categorias de receitas" },
];

export default function NumbersSection() {
  return (
    <section className="lc-numbers">
      <div className="lc-container lc-section" style={{ padding: "48px 20px" }}>
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