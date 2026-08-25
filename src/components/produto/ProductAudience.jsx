import React from "react";

const audiences = [
  ["Profissionais autônomos", "Chefs, nutricionistas, cozinheiros, confeiteiros, consultores e produtores que desejam profissionalizar processos e proteger sua margem."],
  ["Negócios de alimentação", "Restaurantes, buffets, cozinhas de produção, marmitarias, confeitarias, padarias e operações de eventos que precisam de padrão e escala."],
  ["Equipes em estruturação", "Empreendedores e equipes que estão saindo de planilhas, cadernos e cálculos dispersos para uma gestão centralizada."],
];

export default function ProductAudience() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div><p className="text-sm font-bold uppercase tracking-widest text-primary">Público</p><h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Para quem transforma alimento em experiência e negócio</h2><p className="mt-5 leading-relaxed text-muted-foreground">Atende desde quem produz sozinho até operações com múltiplas receitas, pessoas e etapas de produção.</p></div>
        <div className="space-y-4">{audiences.map(([title, text]) => <article key={title} className="rounded-xl border border-border bg-card p-6"><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{text}</p></article>)}</div>
      </div>
    </section>
  );
}