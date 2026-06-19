import { useState, useMemo, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, FileText, Pencil, RotateCcw, Check, X, Plus, Trash2 } from "lucide-react";
import { percapitaData, todosItens, notaTecnica, referencias } from "@/lib/perCapitaData";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const nomesGrupos = [...new Set(percapitaData.filter(i => i.tipo === "grupo").map(i => i.nome))];
const prepSet = new Set(todosItens.map(i => i.prep));

export default function PerCapita() {
  const [search, setSearch] = useState("");
  const [filtroGrupo, setFiltroGrupo] = useState("");
  const [editando, setEditando] = useState(null); // "prep_nome" sendo editado (sobreposição ou user-item)
  const [valorEdit, setValorEdit] = useState("");
  const [medidaEdit, setMedidaEdit] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPrep, setAddPrep] = useState("");
  const [addG, setAddG] = useState("");
  const [addMedida, setAddMedida] = useState("");
  const [addGrupo, setAddGrupo] = useState(nomesGrupos[0] || "");
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

  // User-created items (not in original percapitaData)
  const userItems = useMemo(() => {
    return sobreposicoes.filter(s => !prepSet.has(s.prep_nome));
  }, [sobreposicoes]);

  const getUserItemsByGrupo = useCallback((grupo) => {
    return userItems.filter(s => s.grupo === grupo);
  }, [userItems]);

  const temPersonalizados = sobreposicoes.length > 0;

  const itensFiltrados = useMemo(() => {
    let currentGrupo = "";
    let grupoJaAdicionado = false;
    const results = [];

    for (const item of percapitaData) {
      if (item.tipo === "grupo") {
        currentGrupo = item.nome;
        grupoJaAdicionado = false;
        continue;
      }

      let origMatches = false;

      // "Personalizados" filter: only show items with overrides or user-created
      if (filtroGrupo === "__personalizados__") {
        const isOverride = sobreposicaoMap[item.prep];
        const userInGroup = getUserItemsByGrupo(currentGrupo);
        const anyUserMatch = userInGroup.some(ui => {
          if (search.trim()) {
            const s = search.toLowerCase();
            return String(ui.prep_nome || "").toLowerCase().includes(s) ||
                   String(ui.medida || "").toLowerCase().includes(s);
          }
          return true;
        });
        if (!isOverride && !anyUserMatch) continue;
        if (search.trim() && isOverride) {
          const s = search.toLowerCase();
          if (!String(item.prep || "").toLowerCase().includes(s) &&
              !String(item.medida || "").toLowerCase().includes(s)) continue;
        }
      } else {
        // Filter by search across original items + user items in this group
        let shouldIncludeGrupo = false;

        // Check original item matches
        origMatches = true;
        if (filtroGrupo && currentGrupo !== filtroGrupo) origMatches = false;
        if (search.trim()) {
          const s = search.toLowerCase();
          const match =
            String(item.prep || "").toLowerCase().includes(s) ||
            String(item.medida || "").toLowerCase().includes(s) ||
            String(currentGrupo || "").toLowerCase().includes(s);
          if (!match) origMatches = false;
        }

        // Check user items in this group match
        const userInGroup = getUserItemsByGrupo(currentGrupo);
        const userMatch = userInGroup.some(ui => {
          if (filtroGrupo && currentGrupo !== filtroGrupo) return false;
          if (search.trim()) {
            const s = search.toLowerCase();
            return String(ui.prep_nome || "").toLowerCase().includes(s) ||
                   String(ui.medida || "").toLowerCase().includes(s) ||
                   String(currentGrupo || "").toLowerCase().includes(s);
          }
          return true;
        });

        if (origMatches || userMatch) shouldIncludeGrupo = true;
        if (!shouldIncludeGrupo) continue;
      }

      // Add group header once
      if (!grupoJaAdicionado) {
        results.push({ tipo: "grupo", nome: currentGrupo });
        grupoJaAdicionado = true;
      }

      // Add original item if it matches (or is an override in personalizados mode)
      if (filtroGrupo === "__personalizados__") {
        if (sobreposicaoMap[item.prep]) results.push(item);
      } else if (origMatches) {
        results.push(item);
      }

      // Add matching user items
      const userInGroupNow = getUserItemsByGrupo(currentGrupo);
      for (const ui of userInGroupNow) {
        let uiMatches = true;
        if (filtroGrupo && filtroGrupo !== "__personalizados__" && currentGrupo !== filtroGrupo) uiMatches = false;
        if (search.trim()) {
          const s = search.toLowerCase();
          uiMatches = String(ui.prep_nome || "").toLowerCase().includes(s) ||
                      String(ui.medida || "").toLowerCase().includes(s) ||
                      String(currentGrupo || "").toLowerCase().includes(s);
        }
        if (uiMatches) results.push({ tipo: "user", data: ui, grupo: currentGrupo });
      }
    }

    return results;
  }, [search, filtroGrupo, userItems, getUserItemsByGrupo]);

  const iniciarEdicao = useCallback((item, isUserItem) => {
    if (isUserItem) {
      setEditando("user:" + item.data.id);
      setValorEdit(String(item.data.per_capita_g));
      setMedidaEdit(item.data.medida || "");
    } else {
      const sob = sobreposicaoMap[item.prep];
      setEditando(item.prep);
      setValorEdit(String(sob ? sob.per_capita_g : item.g));
    }
  }, [sobreposicaoMap]);

  const cancelarEdicao = useCallback(() => {
    setEditando(null);
    setValorEdit("");
    setMedidaEdit("");
  }, []);

  const salvarEdicao = useCallback(async (item) => {
    const isUserItem = typeof item.data !== "undefined";

    if (isUserItem) {
      const novoG = parseFloat(valorEdit);
      if (isNaN(novoG) || novoG <= 0) return;
      await base44.entities.PerCapitaUsuario.update(item.data.id, {
        per_capita_g: novoG,
        medida: medidaEdit,
      });
    } else {
      const novoG = parseFloat(valorEdit);
      if (isNaN(novoG) || novoG <= 0) return;
      const existente = sobreposicaoMap[item.prep];
      if (existente) {
        await base44.entities.PerCapitaUsuario.update(existente.id, { per_capita_g: novoG });
      } else {
        await base44.entities.PerCapitaUsuario.create({
          prep_nome: item.prep,
          per_capita_g: novoG,
          original_g: item.g,
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
    setEditando(null);
    setValorEdit("");
    setMedidaEdit("");
  }, [valorEdit, medidaEdit, sobreposicaoMap, queryClient]);

  const resetarValor = useCallback(async (item) => {
    const sob = sobreposicaoMap[item.prep];
    if (!sob) return;
    await base44.entities.PerCapitaUsuario.delete(sob.id);
    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
  }, [sobreposicaoMap, queryClient]);

  const deletarUserItem = useCallback(async (item) => {
    if (!confirm(`Excluir "${item.data.prep_nome}"?`)) return;
    await base44.entities.PerCapitaUsuario.delete(item.data.id);
    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
  }, [queryClient]);

  const handleAddItem = useCallback(async () => {
    const g = parseFloat(addG);
    if (!addPrep.trim() || isNaN(g) || g <= 0 || !addGrupo) return;
    await base44.entities.PerCapitaUsuario.create({
      prep_nome: addPrep.trim(),
      per_capita_g: g,
      original_g: 0,
      medida: addMedida.trim(),
      grupo: addGrupo,
    });
    queryClient.invalidateQueries({ queryKey: ["percapita-usuario"] });
    setAddPrep("");
    setAddG("");
    setAddMedida("");
    setAddGrupo(nomesGrupos[0] || "");
    setShowAddForm(false);
  }, [addPrep, addG, addMedida, addGrupo, queryClient]);

  const getDisplayG = (item) => {
    if (item.tipo === "user") return item.data.per_capita_g;
    const sob = sobreposicaoMap[item.prep];
    return sob ? sob.per_capita_g : item.g;
  };

  const isPersonalizado = (item) => {
    if (item.tipo === "user") return true;
    return !!sobreposicaoMap[item.prep];
  };

  const totalItens = todosItens.length + userItems.length;

  const itensPersonalizados = useMemo(() => {
    return itensFiltrados.filter(i => i.tipo !== "grupo" && isPersonalizado(i));
  }, [itensFiltrados]);

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
          {nomesGrupos.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
          {temPersonalizados && (
            <option value="__personalizados__">⭐ Personalizados por mim ({sobreposicoes.length})</option>
          )}
        </select>
        <Button variant="outline" onClick={() => window.print()}>
          <FileText className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
        <Button variant="default" onClick={() => setShowAddForm(!showAddForm)} className="gap-1">
          <Plus className="w-4 h-4" /> Adicionar Item
        </Button>
      </div>

      {/* Add item inline form */}
      {showAddForm && (
        <Card className="p-4 border-amber-300 bg-amber-50/60 no-print">
          <p className="text-sm font-semibold text-amber-800 mb-3">Novo item personalizado</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Preparação</label>
              <Input
                placeholder="Ex: Strogonoff de frango"
                value={addPrep}
                onChange={(e) => setAddPrep(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Per capita (g)</label>
              <Input
                type="number"
                placeholder="200"
                value={addG}
                onChange={(e) => setAddG(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Medida caseira</label>
              <Input
                placeholder="Ex: 1 concha média"
                value={addMedida}
                onChange={(e) => setAddMedida(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Grupo</label>
              <select
                value={addGrupo}
                onChange={(e) => setAddGrupo(e.target.value)}
                className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {nomesGrupos.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAddItem} disabled={!addPrep.trim() || !addG || !addGrupo}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Salvar
            </Button>
          </div>
        </Card>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground no-print">
        {itensFiltrados.filter(i => i.tipo !== "grupo").length} itens encontrados
      </p>

      {/* Empty state for personalizados */}
      {filtroGrupo === "__personalizados__" && itensFiltrados.filter(i => i.tipo !== "grupo").length === 0 && (
        <Card className="p-8 text-center border-amber-200 bg-amber-50/40">
          <p className="text-muted-foreground text-sm">Você ainda não personalizou nenhum item.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Edite o valor per capita de qualquer preparação ou adicione um novo item para vê-lo aqui.
          </p>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b-2 border-border">
              <th className="text-left px-2 py-2 font-semibold text-xs">Preparação / Alimento</th>
              <th className="text-right px-2 py-2 font-semibold text-xs w-44">Per capita médio (g)</th>
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

              const userItem = item.tipo === "user";
              const prepNome = userItem ? item.data.prep_nome : item.prep;
              const medida = userItem ? (item.data.medida || "—") : item.medida;
              const personalizado = isPersonalizado(item);
              const displayG = getDisplayG(item);
              const isEven = idx % 2 === 0;
              const editKey = userItem ? "user:" + item.data.id : item.prep;
              const editandoEste = editando === editKey;

              return (
                <tr key={`i-${prepNome}-${idx}`} className={`border-b border-border/40 ${isEven ? "bg-white" : "bg-green-50/50"} hover:bg-muted/40`}>
                  <td className="px-2 py-1.5 font-medium text-xs">
                    <span>{prepNome}</span>
                    {personalizado && (
                      <Badge
                        className="ml-2 text-[10px] px-1.5 py-0 no-print"
                        style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #F59E0B" }}
                      >
                        <span className="print:hidden">Personalizado</span>
                      </Badge>
                    )}
                    {personalizado && <span className="hidden print:inline text-[#B45309] ml-0.5">*</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {editandoEste ? (
                      <div className="flex items-center justify-end gap-1 flex-wrap">
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
                        {userItem && (
                          <Input
                            placeholder="Medida"
                            value={medidaEdit}
                            onChange={(e) => setMedidaEdit(e.target.value)}
                            className="w-28 h-7 text-xs"
                          />
                        )}
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
                          onClick={() => iniciarEdicao(item, userItem)}
                          title="Editar valor"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                        {personalizado && !userItem && (
                          <button
                            className="no-print p-0.5 rounded hover:bg-red-50 transition-colors"
                            onClick={() => resetarValor(item)}
                            title="Restaurar valor original"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600 hover:text-red-500" />
                          </button>
                        )}
                        {userItem && (
                          <button
                            className="no-print p-0.5 rounded hover:bg-red-50 transition-colors"
                            onClick={() => deletarUserItem(item)}
                            title="Excluir item"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{medida}</td>
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
              if (item.tipo === "user") {
                return (
                  <span key={item.data.id}>
                    {item.data.prep_nome}: {item.data.per_capita_g}g (item adicionado)
                    {i < itensPersonalizados.length - 1 ? " · " : ""}
                  </span>
                );
              }
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