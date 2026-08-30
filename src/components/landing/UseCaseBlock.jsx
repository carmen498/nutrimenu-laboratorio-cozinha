import React from "react";

export default function UseCaseBlock({ item, image }) {
  return (
    <article id={`secao-${item.key}`} className={`lc-use-case${item.reverse ? " lc-use-case--reverse" : ""}`}>
      <div className="lc-use-case-copy">
        <p className="lc-eyebrow">{item.label}</p>
        <h2>{item.title}</h2>
        <blockquote>“{item.quote}”</blockquote>
        <p>{item.text}</p>
        <ul>
          {item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
        </ul>
        <p className="lc-use-case-example">{item.example}</p>
      </div>
      <figure className="lc-use-case-media">
        <img src={image} alt={`Exemplo de ${item.label.toLowerCase()} planejada com o aplicativo`} width="800" height="1000" loading="lazy" />
      </figure>
    </article>
  );
}