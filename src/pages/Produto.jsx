import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import ProductHero from "@/components/produto/ProductHero";
import ProductCapabilities from "@/components/produto/ProductCapabilities";
import ProductResources from "@/components/produto/ProductResources";
import ProductAudience from "@/components/produto/ProductAudience";
import ProductMarketing from "@/components/produto/ProductMarketing";

export default function Produto() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Produto | Laboratório de Cozinha";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHero />
      <main>
        <section className="mx-auto max-w-4xl px-5 py-16 text-center md:py-20">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">O produto</p>
          <h2 className="mt-3 font-heading text-3xl font-bold md:text-4xl">Da receita anotada à operação organizada</h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Uma plataforma web de planejamento e gestão gastronômica criada para substituir informações dispersas por um fluxo único: cadastrar, calcular, planejar, comprar, produzir e analisar.</p>
        </section>
        <ProductCapabilities />
        <ProductResources />
        <ProductAudience />
        <ProductMarketing />
      </main>
      <footer className="border-t border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
        <div className="mb-3 flex flex-wrap justify-center gap-5"><Link to="/">Início</Link><Link to="/sobre">Sobre</Link><Link to="/contato">Contato</Link><Link to="/termos">Termos</Link><Link to="/privacidade">Privacidade</Link></div>
        <p>Laboratório de Cozinha · Plataforma ZR</p>
      </footer>
    </div>
  );
}