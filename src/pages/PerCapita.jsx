import { useState, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, FileText, Pencil, RotateCcw, Check, X } from "lucide-react";
import { percapitaData, todosItens, notaTecnica, referencias } from "@/lib/perCapitaData";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const nomesGrupos = [...new Set(percapitaData.filter(i => i.tipo === "grupo").map(i => i.nome))];

export default function PerCapita() {
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [editando, setEditando] = useState(null); // prep nome sendo editado
  const [valorEdit, setValorEdit] = useState("");
  const printRef = useRef();
  const queryClient = useQueryClient();

  const { data: sobreposicoes = [] } = useQuery({
    queryKey: ["percapita-usuario"],
    queryFn: () => base44.entities.PerCapitaUsuario.list(),
  });

  const sobreposicaoMap = useMemo(() => {
    const map = {};
    for (const s of sobreposicoes) {
      map[s.prep_nome] = s;
    }
    return map;
  }, [sobreposicoes]);

  const temPersonalizados = sobreposicoes.length > 0;

  const itensFiltrados = useMemo(() => {
    let currentGrupo = "";
    let grupoJaAdicionado = false;
    const results = [];

    for (const item of percapitaData) {
      if (item.tipo === "grupo") {
        currentGrupo = item.nome;
        grupoJaAdicionado = false;

        // Filtro "personalizados": só inclui grupo se tiver algum item personalizado nele
        if (filtroGrupo === "__personalizados__") {
          // Verifica se há itens personalizados neste grupo
          const temItemPersonalizado = percapitaData.some(
            i => i.tipo !== "grupo" && i.prep && sobreposicaoMap[i.prep] &&
            // Checa se o item pertence a este grupo atual
            percapitaData.indexOf(i) > percapitaData.indexOf(item)
          );
          // Não é eficiente, vamos usar outra abordagem
          continue;
        }

        if (!filtroGrupo || filtroGrupo === currentGrupo) {
          results.push(item);
          grupoJaAdicionado = true;
        }
        continue;
      }

      // Filtro "personalizados"
      if (filtroGrupo === "__personalizados__") {
        if (!sobreposicaoMap[item.prep]) continue;
      } else {
        // Filtra por grupo
        if (filtroGrupo && currentGrupo !== filtroGrupo) continue;
      }

      // Filtra por busca textual
      if (search.trim()) {
        const s = search.toLowerCase();
        const match =
          String(item.prep || "").toLowerCase().includes(s) ||
          String(item.medida || "").toLowerCase().includes(s) ||
          String(currentGrupo || "").toLowerCase().includes(s);
        if (!match) continue;
      }

      // Garante que o cabeçalho do grupo apareça uma única vez antes dos itens
      if (!grupoJaAdicionado) {
        results.push({ tipo: "grupo", nome: currentGrupo });
        grupoJaAdicionado = true;
      }

      results.push(item);
    }

    return results;
  }, [search, filtroGrupo, sobreposicaoMap]);

  const iniciarEdicao = useCallback((item) => {
    const sob = sobreposicaoMap[item.prep];
    setEditando(item.prep);
    setValorEdit(String(sob ? sob.per_capita_g : item.g));
  }, [sobreposicaoMap]);

  const cancelarEdicao = useCallback(() => {
    setEditando(null);
    setValorEdit("");
  }, []);

  const salvarEdicao = useCallback(async (item) => {
    const novoG = parseFloat(valorEdit);
    if (isNaN(novoG) || novoG <= 0) return;
    const existente = sobreposicaoMap[item.prep];

    if (existente) {
      await base44.entities.PerCapitaUsuario.update(existente.id, {
        per_capita_g: novoG,
      });
    } else {
      await base44.entities.PerCapitaUsuario.create({
        prep_nome: item.prep,
        per_capita_g: novoG,
        original_g: item.g,
      });
    }

    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
    setEditando(null);
    setValorEdit("");
  }, [valorEdit, sobreposicaoMap, queryClient]);

  const resetarValor = useCallback(async (item) => {
    const sob = sobreposicaoMap[item.prep];
    if (!sob) return;
    await base44.entities.PerCapitaUsuario.delete(sob.id);
    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
  }, [sobreposicaoMap, queryClient]);

  const getDisplayG = (item) => {
    const sob = sobreposicaoMap[item.prep];
    return sob ? sob.per_capita_g : item.g;
  };

  const isPersonalizado = (item) => !!sobreposicaoMap[item.prep];

  const totalItens = todosItens.length;

  // Para PDF: itens personalizados com asterisco
  const itensPersonalizados = useMemo(() => {
    return itensFiltrados.filter(i => i.tipo !== "grupo" && sobreposicaoMap[i.prep]);
  }, [itensFiltrados, sobreposicaoMap]);

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
          Carmen S. Reinstein · Laboratório de Cozinha · Gastronomia Planejada · 2026
        </p>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="font-display text-lg font-bold">TABELA DE REFERÊNCIA · PER CAPITA DE PREPARAÇÕES PRONTAS</h1>
        <p className="text-xs text-muted-foreground">Carmen S. Reinstein · Laboratório de Cozinha · 2026</p>
        {itensPersonalizados.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            * Valores personalizados pelo usuário. Consulte a nota de rodapé.
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 no-print">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou medida..."
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
          {temPersonalizados && (
            <option value="__personalizados__">⭐ Personalizados por mim ({sobreposicoes.length})</option>
          )}
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
              <th className="text-left px-2 py-2 font-semibold text-xs">Preparação / Alimento</th>
              <th className="text-right px-2 py-2 font-semibold text-xs w-36">Per capita médio (g)</th>
              <th className="text-left px-2 py-2 font-semibold text-xs hidden md:table-cell">Medida caseira de referência</th>
            </tr>
          </thead>
          <tbody>
            {itensFiltrados.map((item, idx) => {
              if (item.tipo === "grupo") {
                return (
                  <tr key={`g-${item.nome}-${idx}`} className="bg-green-100 border-b border-green-200">
                    <td colSpan={3} className="px-3 py-2">
                      <span className="font-bold text-sm text-green-900 uppercase tracking-wide">{item.nome}</span>
                    </td>
                  </tr>
                );
              }

              const personalizado = isPersonalizado(item);
              const displayG = getDisplayG(item);
              const isEven = idx % 2 === 0;
              const editandoEste = editando === item.prep;

              return (
                <tr key={`i-${item.prep}-${idx}`} className={`border-b border-border/40 ${isEven ? "bg-white" : "bg-green-50/50"} hover:bg-muted/40`}>
                  <td className="px-2 py-1.5 font-medium text-xs">
                    <span>{item.prep}</span>
                    {personalizado && (
                      <Badge
                        className="ml-2 text-[10px] px-1.5 py-0 no-print"
                        style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #F59E0B" }}
                      >
                        <span className="hidden print:inline">*</span>
                        <span className="print:hidden">Personalizado</span>
                      </Badge>
                    )}
                    {/* Print asterisk */}
                    {personalizado && <span className="hidden print:inline text-[#B45309] ml-0.5">*</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {editandoEste ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          value={valorEdit}
                          onChange={(e) => setValorEdit(e.target.value)}
                          className="w-20 h-7 text-sm text-right"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") salvarEdicao(item);
                            if (e.key === "Escape") cancelarEdicao();
                          }}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => salvarEdicao(item)}>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelarEdicao}>
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-bold text-base" style={{ color: "#1B4332" }}>{displayG}g</span>
                        <button
                          className="no-print p-0.5 rounded hover:bg-muted transition-colors"
                          onClick={() => iniciarEdicao(item)}
                          title="Editar valor"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                        {personalizado && (
                          <button
                            className="no-print p-0.5 rounded hover:bg-red-50 transition-colors"
                            onClick={() => resetarValor(item)}
                            title="Restaurar valor original"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600 hover:text-red-500" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{item.medida}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Print footnote for personalized items */}
      {itensPersonalizados.length > 0 && (
        <div className="hidden print:block mt-4 px-2">
          <p className="text-xs text-muted-foreground">
            * Valores personalizados (original entre parênteses):
            {" "}
            {itensPersonalizados.map((item, i) => {
              const sob = sobreposicaoMap[item.prep];
              return (
                <span key={item.prep}>
                  {item.prep}: {sob.per_capita_g}g (original: {sob.original_g}g)
                  {i < itensPersonalizados.length - 1 ? " · " : ""}
                </span>
              );
            })}
          </p>
        </div>
      )}

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
          "Os per capitas são médias de referência. Ajustar conforme: perfil dos comensais · tipo e duração do evento · clima · horário · tipo de serviço (empratado vs bufê) · margem de segurança 10-15%. Não existe norma técnica brasileira de per capita para preparações prontas para servir. Carmen S. Reinstein · Laboratório de Cozinha · 2026."
        </p>
      </footer>
    </div>
  );
}