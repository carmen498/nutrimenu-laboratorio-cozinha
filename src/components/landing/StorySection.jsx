import React from "react";

const PARAGRAPHS = [
  "Cresci em Livramento, na fronteira com o Uruguai. A cozinha da minha família cheirava a doces, geleias, galinha ao molho pardo e arroz com pêssegos secos ao sol. Aos 5 anos, eu já era convocada a 'cuidar das panelas' enquanto as mulheres da casa faziam a alquimia acontecer.",
  "Aquele fogão a lenha me formou.",
  "Décadas depois, vendi meu apartamento para fundar a BRUBINS — uma empresa de alimentação que começou na cozinha de casa e cresceu até atender hotéis, eventos corporativos e ceias de centenas de pessoas. Planejava de madrugada, cozinhava de dia, ensinava à noite.",
  "Publiquei livros. Dei consultorias. Formei turmas. Errei muito. Acertei mais.",
  "O que aprendi em todo esse tempo é simples: cozinhar bem não é dom. É organização. É método. É saber quanto fazer, quanto custa e como planejar antes de acender o fogo.",
  "O Laboratório de Cozinha nasceu disso. Da minha história e da história de todo mundo que um dia ficou na frente do fogão sem saber por onde começar.",
  "Se você cozinha — seja para sua família, para vender ou para aprender — esse app foi feito para você.",
];

export default function StorySection({ image }) {
  return (
    <section className="lc-story lc-section">
      <div className="lc-container lc-story-grid">
        <div className="lc-story-media">
          <img src={image} alt="Carmen Reinstein cozinhando em uma cozinha rústica, mexendo uma panela de cobre sobre o fogão" loading="lazy" />
        </div>
        <div className="lc-story-text">
          <h2>Comecei aos 5 anos cuidando das panelas. Nunca mais parei.</h2>
          <div className="lc-story-body">
            {PARAGRAPHS.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <p className="lc-story-sign">Carmen Reinstein · Culinarista · Nutricionista · Empresária</p>
          <p className="lc-story-seals">👩‍🍳 30+ anos de experiência · 📚 3 livros publicados · 👥 Milhares de alunas formadas</p>
        </div>
      </div>
    </section>
  );
}