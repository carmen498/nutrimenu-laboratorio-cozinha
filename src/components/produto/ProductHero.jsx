import React from "react";
import { Link } from "react-router-dom";

export default function ProductHero() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-6xl px-5 py-5 flex items-center justify-between gap-4">
        <Link to="/" className="font-heading text-lg font-bold text-foreground">Laboratório de Cozinha</Link>
        <Link to="/register" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Experimentar grátis</Link>
      </div>
      <div className="mx-auto max-w-4xl px-5 py-16 text-center md:py-24">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">Documentação do produto</p>
        <h1 className="font-heading text-4xl font-bold leading-tight text-foreground md:text-6xl">Gestão gastronômica do planejamento ao resultado</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          O Laboratório de Cozinha transforma receitas, cardápios, compras, produção e custos em um processo organizado, calculável e replicável para profissionais e negócios de alimentação.
        </p>
      </div>
    </header>
  );
}