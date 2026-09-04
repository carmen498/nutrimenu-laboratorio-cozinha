import React from "react";
import { BookOpen, Calculator, CalendarDays, ChartNoAxesCombined, ClipboardList, PackageSearch, Scale, Sparkles } from "lucide-react";

/** @type {Array<[import("lucide-react").LucideIcon, string, string]>} */
const items = [
  [BookOpen, "Receitas profissionais", "Cadastre, importe e organize receitas com ingredientes, preparo, rendimento, categorias, fotos e fichas técnicas."],
  [Scale, "Escalonamento automático", "Ajuste porções e quantidades mantendo proporções, medidas e custos coerentes para cada produção."],
  [Calculator, "Custos e precificação", "Calcule custo total, custo por porção, insumos, despesas e referências para formar preços com mais segurança."],
  [CalendarDays, "Cardápios e eventos", "Monte cardápios por ocasião, refeição ou período e planeje produções para diferentes volumes de atendimento."],
  [ClipboardList, "Listas de compras", "Consolide ingredientes e quantidades das receitas escolhidas para reduzir esquecimentos e compras imprecisas."],
  [PackageSearch, "Ingredientes e insumos", "Centralize preços, fornecedores, embalagens, fatores de correção, medidas caseiras e histórico de atualização."],
  [Sparkles, "Importação com IA", "Transforme receitas em texto em estruturas organizadas e acelere a entrada de informações no sistema."],
  [ChartNoAxesCombined, "Relatórios operacionais", "Gere fichas, orçamentos, dossiês, listas e documentos para apoiar produção, atendimento e decisão."],
];

export default function ProductCapabilities() {
  return <section className="mx-auto max-w-6xl px-5 py-16 md:py-20"><div className="mb-10 max-w-3xl"><p className="text-sm font-bold uppercase tracking-widest text-primary">Funcionalidades</p><h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Um fluxo completo para cozinhas que precisam de método</h2></div><div className="grid gap-5 md:grid-cols-2">{items.map(([Icon, title, text]) => <article key={title} className="rounded-xl border border-border bg-card p-6"><Icon className="mb-4 h-6 w-6 text-primary"/><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{text}</p></article>)}</div></section>;
}
