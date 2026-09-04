import React from "react";

/** @type {Array<[string, string[]]>} */
const groups = [
  ["Planejamento", ["Receitas e sub-receitas", "Cardápios e eventos", "Per capita e rendimentos", "Pré-preparos e ordem de produção"]],
  ["Controle", ["Banco de ingredientes", "Medidas caseiras e fatores de correção", "Insumos e embalagens", "Histórico e auditorias"]],
  ["Resultado", ["Custos por receita e porção", "Formação de preço", "Orçamentos", "Exportação e relatórios em PDF"]],
  ["Produtividade", ["Importação por texto e planilha", "Sugestões assistidas por IA", "Listas de compras consolidadas", "Acesso responsivo no computador e celular"]],
];

export default function ProductResources() {
  return (
    <section className="bg-secondary/60 py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Recursos</p>
        <h2 className="mt-3 max-w-3xl font-heading text-3xl font-bold md:text-4xl">Informação centralizada para trabalhar com mais consistência</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{groups.map(([title, values]) => <article key={title} className="rounded-xl border border-border bg-card p-6"><h3 className="text-lg font-bold">{title}</h3><ul className="mt-4 space-y-3 text-sm text-muted-foreground">{values.map(value => <li key={value} className="border-t border-border pt-3">{value}</li>)}</ul></article>)}</div>
      </div>
    </section>
  );
}
