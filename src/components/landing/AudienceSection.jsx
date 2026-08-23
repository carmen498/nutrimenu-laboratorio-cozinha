import React from "react";

const AUDIENCE = [
  {
    kicker: "Profissional",
    title: "Para quem precisa transformar receita em operação",
    text: "Cozinheiras artesanais, buffets, marmitas, confeiteiras e nutricionistas que precisam controlar quantidade, custo e compra sem depender de planilhas paralelas.",
  },
  {
    kicker: "Iniciante",
    title: "Para quem quer organizar a cozinha antes da correria",
    text: "Famílias, casais e pessoas aprendendo a cozinhar que querem decidir o cardápio, comprar na medida certa e aproveitar melhor o que já têm em casa.",
  },
  {
    kicker: "Independente",
    title: "Para quem passou a cozinhar para si mesmo",
    text: "Quem mora sozinho ou mudou de rotina e quer planejar refeições simples, evitar excesso de compras e depender menos de delivery no dia a dia.",
  },
];

const YES = [
  "Quer saber quanto produzir antes de começar",
  "Precisa enxergar custo e rendimento da receita",
  "Quer transformar cardápio em lista de compras",
  "Prefere método a anotações espalhadas",
];

const NO = [
  "Procura apenas um catálogo de receitas para copiar",
  "Não pretende acompanhar custos ou quantidades",
  "Prefere manter planejamento e produção separados",
];

export default function AudienceSection({ imageBaking, imageCouple }) {
  return (
    <section className="lc-section lc-audience-section" aria-labelledby="audience-title">
      <div className="lc-container">
        <div className="lc-section-head lc-container--narrow">
          <p className="lc-eyebrow">Para quem funciona melhor</p>
          <h2 className="lc-title" id="audience-title">Uma ferramenta para cozinhas de tamanhos diferentes, com o mesmo problema: organizar antes de produzir.</h2>
        </div>

        <div className="lc-audience-editorial">
          <div className="lc-audience-copy">
            {AUDIENCE.map((item) => (
              <article className="lc-audience-row" key={item.title}>
                <p className="lc-audience-kicker">{item.kicker}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="lc-audience-photos">
            <figure className="lc-audience-photo lc-audience-photo--large">
              <img src={imageBaking} alt="Pessoa preparando um bolo em uma bancada organizada" width="800" height="800" loading="lazy" />
            </figure>
            <figure className="lc-audience-photo lc-audience-photo--small">
              <img src={imageCouple} alt="Casal cozinhando junto em uma cozinha residencial" width="700" height="700" loading="lazy" />
            </figure>
          </div>
        </div>

        <div className="lc-yesno">
          <div className="lc-yesno-card lc-yesno-card--yes">
            <h3>Faz sentido para você se...</h3>
            <ul>{YES.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="lc-yesno-card lc-yesno-card--no">
            <h3>Talvez não seja a melhor escolha se...</h3>
            <ul>{NO.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}