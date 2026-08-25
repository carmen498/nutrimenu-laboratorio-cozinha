import React from "react";
import { Link } from "react-router-dom";

const benefits = ["Menos improviso e retrabalho", "Mais precisão em quantidades e compras", "Visibilidade real de custos", "Padronização para crescer com qualidade"];

export default function ProductMarketing() {
  return (
    <section className="border-t border-border bg-primary py-16 text-primary-foreground md:py-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-2 lg:items-center">
        <div><p className="text-sm font-bold uppercase tracking-widest opacity-80">Valor para o mercado</p><h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Mais controle antes, durante e depois da produção</h2><p className="mt-5 max-w-2xl leading-relaxed opacity-90">O produto combina conhecimento gastronômico e tecnologia para ajudar a produzir com previsibilidade, reduzir desperdícios e tomar decisões comerciais com dados.</p></div>
        <div><ul className="grid gap-3 sm:grid-cols-2">{benefits.map(item => <li key={item} className="rounded-lg border border-primary-foreground/30 p-4 font-semibold">{item}</li>)}</ul><Link to="/register" className="mt-6 inline-flex rounded-md bg-primary-foreground px-6 py-3 font-bold text-primary">Experimentar por 7 dias</Link></div>
      </div>
    </section>
  );
}