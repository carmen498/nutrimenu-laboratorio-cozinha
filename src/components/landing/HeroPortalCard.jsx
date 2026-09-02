import React from "react";

export default function HeroPortalCard({ portal, image, priority = false }) {
  return (
    <article className="lc-portal-card">
      <img
        className="lc-portal-image"
        src={image}
        alt={`Planejamento para ${portal.label.toLowerCase()} no Laboratório de Cozinha`}
        width="800"
        height="1000"
        loading={priority ? "eager" : "lazy"}
        {...(priority ? { fetchpriority: "high" } : {})}
      />
      <div className="lc-portal-body">
        {portal.badge && <p className="lc-portal-badge">{portal.badge}</p>}
        <p className="lc-eyebrow">{portal.label}</p>
        <h2>{portal.title}</h2>
        <p>{portal.text}</p>
        <a className="lc-btn lc-btn--primary lc-portal-button" href={portal.href}>{portal.button}</a>
      </div>
    </article>
  );
}