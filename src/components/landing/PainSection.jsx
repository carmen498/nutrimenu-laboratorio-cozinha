import React from "react";

const QUOTES = [
  "Vendo lasanha congelada para supermercados e não sei se estou cobrando certo.",
  "Fiz um jantar e cobrei barato demais — trabalhei no prejuízo.",
  "Fiz comida para 10 pessoas e sobrou para 30.",
  "Comprei tudo errado no mercado e desperdicei metade.",
  "Nunca sei definir o cardápio para a cozinheira preparar — fico mudando de ideia, ela fica sem direção e no dia do evento a cozinha vira um caos.",
  "Casei e nunca tinha cozinhado na vida.",
  "Me separei e não faço ideia de quanto comprar para mim.",
  "Monto cardápios no papel e erro a quantidade toda vez.",
];

export default function PainSection({ image }) {
  return (
    <section className="lc-section">
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">A dor</p>
          <h2 className="lc-title">
            Livro de receitas é coisa do passado. Você ainda usa caderno, papel e calculadora para planejar sua cozinha?
          </h2>
        </div>
        <div className="lc-pain-grid">
          <div>
            <div className="lc-pain-quotes">
              {QUOTES.map((q) => (
                <blockquote key={q} className="lc-pain-quote">"{q}"</blockquote>
              ))}
            </div>
            <p className="lc-pain-close">
              A cozinha tem uma lógica. O Laboratório de Cozinha coloca essa lógica na palma da sua mão.
            </p>
          </div>
          <div className="lc-pain-media">
            <img src={image} alt="Mesa de madeira rústica em vista de cima com caderno de receitas, potes etiquetados e plano de produção" loading="lazy" />
          </div>
        </div>
      </div>
    </section>
  );
}