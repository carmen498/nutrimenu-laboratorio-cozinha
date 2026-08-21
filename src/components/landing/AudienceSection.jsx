import React from "react";

const AUDIENCE = [
  {
    emoji: "🍳",
    title: "A Profissional",
    text: "Cozinheiras artesanais, buffets, marmitas, confeiteiras. Você trabalha com comida e precisa de controle real. Custo por receita, escala por número de pessoas, lista de compras automática, formação de preço. Tudo em um lugar só.",
  },
  {
    emoji: "💍",
    title: "A Iniciante",
    text: "Noivas, recém-casadas, mulheres aprendendo a cozinhar. A cozinha não precisa ser um mistério. O app te diz o que fazer, quanto comprar e como não desperdiçar. Você planeja a semana inteira em minutos.",
  },
  {
    emoji: "👨",
    title: "O Independente",
    text: "Homens solteiros, divorciados, recém-independentes. Cozinhar para si mesmo é uma habilidade. O Laboratório de Cozinha te ajuda a planejar refeições simples, comprar na medida certa e não depender de delivery todo dia.",
  },
];

const YES = [
  "Cozinheiras artesanais que produzem para vender",
  "Buffets e produtoras de marmitas",
  "Nutricionistas que planejam cardápios",
  "Noivas e recém-casadas aprendendo a cozinhar",
  "Homens que passaram a cozinhar para si mesmos",
  "Quem quer parar de improvisar",
];

const NO = [
  "Quem busca receitas prontas para seguir sem pensar",
  "Quem não quer saber o custo do que produz",
  "Quem acha que cozinhar “no olho” é suficiente para vender",
];

export default function AudienceSection({ imageBaking, imageCouple }) {
  return (
    <section className="lc-section" style={{ background: "rgba(226, 210, 184, 0.4)" }}>
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">Para quem é</p>
          <h2 className="lc-title">Para quem é o Laboratório de Cozinha?</h2>
        </div>

        <div className="lc-audience-grid">
          {AUDIENCE.map((a) => (
            <div className="lc-audience-card" key={a.title}>
              <div className="lc-emoji">{a.emoji}</div>
              <h3>{a.title}</h3>
              <p>{a.text}</p>
            </div>
          ))}
        </div>

        <div className="lc-yesno">
          <div className="lc-yesno-card lc-yesno-card--yes">
            <h4>Para quem é ✓</h4>
            <ul>{YES.map((y) => <li key={y}>{y}</li>)}</ul>
          </div>
          <div className="lc-yesno-card lc-yesno-card--no">
            <h4>Para quem não é ✗</h4>
            <ul>{NO.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        </div>

        <div className="lc-audience-photos">
          <figure><img src={imageBaking} alt="Mulher com aventil de linho polvilhando açúcar em bolo de morango" loading="lazy" /></figure>
          <figure><img src={imageCouple} alt="Casal jovem cozinhando junto em cozinha clara com madeira" loading="lazy" /></figure>
        </div>
      </div>
    </section>
  );
}