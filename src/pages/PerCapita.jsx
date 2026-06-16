import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, FileText } from "lucide-react";
import { percapitaData, todosItens, notaTecnica, referencias } from "@/lib/perCapitaData";

const nomesGrupos = [...new Set(percapitaData.filter(i => i.tipo === "grupo").map(i => i.nome))];

export default function PerCapita() {
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const printRef = useRef();

  const itensFiltrados = useMemo(() => {
    let currentGrupo = "";
    const results = [];

    for (const item of percapitaData) {
      if (item.tipo === "grupo") {
        currentGrupo = item.nome;
        // Sempre inclui o cabeçalho do grupo, a menos que estejamos filtrando por outro grupo
        if (!filtroGrupo || filtroGrupo === currentGrupo) {
          results.push(item);
        }
      } else {
        // Filtra por grupo
        if (filtroGrupo && currentGrupo !== filtroGrupo) continue;
        // Filtra por busca textual
        if (search.trim()) {
          const s = search.toLowerCase();
          const match =
            String(item.prep || "").toLowerCase().includes(s) ||
            String(item.cat || "").toLowerCase().includes(s) ||
            String(item.medida || "").toLowerCase().includes(s) ||
            String(currentGrupo || "").toLowerCase().includes(s);
          if (!match) continue;
        }
        // Garante que o cabeçalho do grupo apareça antes dos itens
        const last = results[results.length - 1];
        if (!last || last.tipo !== "grupo" || last.nome !== currentGrupo) {
          results.push({ tipo: "grupo", nome: currentGrupo });
        }
        results.push(item);
      }
    }
    return results;
  }, [search, filtroGrupo]);

  const totalItens = todosItens.length;

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
          Carmen S. Reinstein · Nutrimenu · Receita na Medida · 2026 — Estudo pioneiro · valores a validar conforme tipo de evento e perfil dos comensais
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
          <option value="">Todos os grupos ({totalItens} itens)</option>
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
        {itensFiltrados.filter(i => i.tipo !== "grupo").length} itens encontrados
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
            {itensFiltrados.map((item, idx) => {
              if (item.tipo === "grupo") {
                return (
                  <tr key={`g-${item.nome}-${idx}`} className="bg-green-100 border-b border-green-200">
                    <td colSpan={5} className="px-3 py-2">
                      <span className="font-bold text-sm text-green-900 uppercase tracking-wide">{item.nome}</span>
                    </td>
                  </tr>
                );
              }

              const isEven = idx % 2 === 0;
              const displayG = typeof item.g === "number" ? item.g : item.g;

              return (
                <tr key={`i-${item.n || idx}-${item.prep}-${idx}`} className={`border-b border-border/40 ${isEven ? "bg-white" : "bg-green-50/50"} hover:bg-muted/40`}>
                  <td className="px-2 py-1.5 text-muted-foreground text-xs">{item.n || "—"}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{item.cat}</td>
                  <td className="px-2 py-1.5 font-medium text-xs">{item.prep}</td>
                  <td className="px-2 py-1.5 text-right font-bold text-primary text-xs tabular-nums">{displayG}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{item.medida}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Nota Técnica */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="whitespace-pre-line text-sm text-blue-900 leading-relaxed">
          <h3 className="font-bold text-primary text-base mb-2 font-display">NOTA TÉCNICA</h3>
          {notaTecnica.replace(/^NOTA TÉCNICA[\s\S]*?\n\n/, "")}
        </div>
      </Card>

      {/* Referências */}
      <Accordion type="single" collapsible className="no-print">
        <AccordionItem value="refs">
          <AccordionTrigger className="text-sm font-medium">Referências bibliográficas</AccordionTrigger>
          <AccordionContent>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {referencias.map((ref, idx) => (
                <li key={idx} className="list-inside" style={{ listStyleType: "none" }}>
                  <span className="font-semibold text-primary mr-1">[{ref.n}]</span>
                  <span className="font-medium">{ref.titulo}</span>
                  {ref.texto && <span className="text-muted-foreground"> — {ref.texto}</span>}
                </li>
              ))}
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