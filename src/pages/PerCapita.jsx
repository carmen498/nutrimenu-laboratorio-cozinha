import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, FileText } from "lucide-react";
import { grupos, todosItens } from "@/lib/perCapitaData";

export default function PerCapita() {
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const printRef = useRef();

  const nomesGrupos = useMemo(() => [...new Set(grupos.map(g => g.grupo))], []);

  const itensFiltrados = useMemo(() => {
    let results = todosItens;
    if (filtroGrupo) {
      results = results.filter(i => i.grupo === filtroGrupo);
    }
    if (search.trim()) {
      const s = search.toLowerCase();
      results = results.filter(i =>
        i.prep.toLowerCase().includes(s) ||
        i.cat.toLowerCase().includes(s) ||
        i.medida.toLowerCase().includes(s) ||
        i.grupo.toLowerCase().includes(s)
      );
    }
    return results;
  }, [search, filtroGrupo]);

  return (
    <div className="space-y-4 pb-24 md:pb-8" ref={printRef}>
      {/* Header */}
      <div className="text-center space-y-1 no-print">
        <h1 className="font-display text-lg md:text-xl font-bold leading-tight">
          TABELA DE REFERÊNCIA · PER CAPITA DE PREPARAÇÕES PRONTAS — CONSUMO BRASILEIRO
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground max-w-3xl mx-auto">
          Quantidade média por pessoa · preparação pronta para servir (g/pessoa) · Base: POF IBGE 2017-2018 + Calculadora Nutrimenu + Referências de UAN
        </p>
        <p className="text-[10px] text-muted-foreground italic">
          Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026 — Estudo preliminar · valores a validar conforme tipo de evento e perfil dos comensais
        </p>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="font-display text-lg font-bold">TABELA DE REFERÊNCIA · PER CAPITA DE PREPARAÇÕES PRONTAS</h1>
        <p className="text-xs text-muted-foreground">Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria ou medida..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filtroGrupo}
          onChange={(e) => setFiltroGrupo(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Todos os grupos ({todosItens.length} itens)</option>
          {nomesGrupos.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground no-print">
        {itensFiltrados.length} {itensFiltrados.length === 1 ? "item" : "itens"} encontrado{itensFiltrados.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b-2 border-border">
              <th className="text-left px-2 py-2 font-semibold text-xs w-10">Nº</th>
              <th className="text-left px-2 py-2 font-semibold text-xs">Categoria</th>
              <th className="text-left px-2 py-2 font-semibold text-xs">Preparação / Alimento</th>
              <th className="text-right px-2 py-2 font-semibold text-xs w-28">Per capita médio (g)</th>
              <th className="text-left px-2 py-2 font-semibold text-xs hidden md:table-cell">Medida caseira de referência</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item, idx) => (
              <tr key={item.n} className={`border-b border-border/50 hover:bg-muted/30 ${idx % 2 === 0 ? "bg-white" : "bg-muted/20"} ${idx === 0 || itensFiltrados[idx-1]?.grupo !== item.grupo ? "border-t-2 border-t-primary/20" : ""}`}>
                <td className="px-2 py-1.5 text-muted-foreground text-xs">{item.n}</td>
                <td className="px-2 py-1.5 text-xs text-muted-foreground">{item.cat}</td>
                <td className="px-2 py-1.5 font-medium text-xs">
                  {(idx === 0 || itensFiltrados[idx-1]?.grupo !== item.grupo) && (
                    <span className="block text-[10px] text-primary font-semibold uppercase tracking-wide mb-0.5">{item.grupo}</span>
                  )}
                  {item.prep}
                </td>
                <td className="px-2 py-1.5 text-right font-bold text-primary text-xs tabular-nums">{item.g}</td>
                <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{item.medida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Referências */}
      <Accordion type="single" collapsible className="no-print">
        <AccordionItem value="refs">
          <AccordionTrigger className="text-sm font-medium">Referências bibliográficas</AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-1 text-sm text-muted-foreground list-decimal list-inside">
              <li>POF IBGE 2017-2018 · ibge.gov.br/pof2017-2018</li>
              <li>Calculadora de Custos de Produção Nutrimenu · Carmen S. Reinstein · 2025</li>
              <li>Instrução Normativa IN 75/2020 ANVISA · Anexo V</li>
              <li>Abreu ES et al. · Gestão de UAN · Metha · 2016</li>
              <li>CFN Resolução 600/2018</li>
              <li>Carmen S. Reinstein · experiência profissional · 20+ anos</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Rodapé */}
      <footer className="text-center space-y-3 pt-4">
        <p className="text-xs text-muted-foreground italic max-w-2xl mx-auto leading-relaxed">
          "Não existe norma técnica brasileira específica de per capita para preparações prontas para servir. O Anexo V da IN 75/2020 (ANVISA) trata de porções para rotulagem nutricional — não de serviço. Esta tabela é estudo pioneiro. Carmen S. Reinstein / Nutrimenu / Receita na Medida · 2026."
        </p>
      </footer>
    </div>
  );
}