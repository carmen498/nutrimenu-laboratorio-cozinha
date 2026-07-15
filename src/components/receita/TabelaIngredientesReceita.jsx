import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChefHat, Pencil, Trash2, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import DraggableRow from "@/components/receita/DraggableRow";

function buildGridTemplate(mostrarFC, mostrarMedidaCaseira) {
  const cols = ["minmax(160px,2fr)", "minmax(110px,1.1fr)", "100px"];
  if (mostrarFC) cols.push("70px", "100px");
  if (mostrarMedidaCaseira) cols.push("150px");
  cols.push("90px", "140px");
  return cols.join(" ");
}

export default function TabelaIngredientesReceita({
  itens, receita, fator, mostrarFC, mostrarMedidaCaseira, blocos, findBlocoIdx,
  medidaByIngrediente, uteMap, getMedidaDisplay,
  editingQtdId, editingQtdValue, setEditingQtdId, setEditingQtdValue, handleConfirmQtd,
  editingIngId, ingSearch, setEditingIngId, setIngSearch, ingredientesDB, receitasBasicas,
  replaceIngMut, replaceWithSubreceitaMut,
  editingGrupoId, editingGrupoTitulo, setEditingGrupoId, setEditingGrupoTitulo, updateGrupoMut,
  convertingNAId, convertingNATitulo, setConvertingNAId, setConvertingNATitulo, convertToGrupoMut,
  editingMedidaId, medidaInputValue, setEditingMedidaId, setMedidaInputValue, updateQtdMut,
  setCadastrarMedidaIng, setEditarMedidaMc, setEditingItem,
  deleteItemOrGrupoMut, deleteSubreceitaMut, updateFCMut,
  handleMove, handleDragEnd, formatWeight, formatCustoItem,
}) {
  const gridTemplate = buildGridTemplate(mostrarFC, mostrarMedidaCaseira);

  const totalPesoLiq = itens.filter(i => !i.isGrupo).reduce((s, i) => s + (i.qtdNova || 0), 0);
  const totalPBruto = itens.filter(i => !i.isGrupo).reduce((s, i) => s + (i.qtdComprar || 0), 0);
  const totalCusto = itens.reduce((s, i) => s + (i.custo || 0), 0);

  const converterMedidaParaGramasInline = (n, mc) => {
    if (!mc) return 0;
    if (mc.equivalencia_g) return n * mc.equivalencia_g;
    if (mc.referencia_g) return n * mc.referencia_g;
    return 0;
  };

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-stretch gap-0.5 mb-1">
        <div className="w-8 shrink-0" />
        <div className="flex-1 min-w-0 grid gap-2 px-2 text-xs text-muted-foreground font-medium border-b pb-2" style={{ gridTemplateColumns: gridTemplate }}>
          <div>INGREDIENTE</div>
          <div>PREPARO</div>
          <div className="text-right">PESO LÍQ. (g)</div>
          {mostrarFC && <div className="text-right">FC</div>}
          {mostrarFC && <div className="text-right">P. BRUTO (g)</div>}
          {mostrarMedidaCaseira && <div>MEDIDA CASEIRA</div>}
          <div className="text-right">R$</div>
          <div></div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="ingredientes">
          {(provided, snapshot) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className={`space-y-1 transition-colors rounded-lg ${snapshot.isDraggingOver ? "bg-primary/5 p-1 ring-1 ring-primary/20" : ""}`}>
              {itens.map((item, idx) => {
                const isQtdZero = !item.isGrupo && (item.quantidade_por_porcao || 0) === 0;

                // Grupo header — full width row
                if (item.isGrupo) {
                  return (
                    <DraggableRow key={item.id} draggableId={item.id} index={idx} isDragDisabled={!!item.subreceita_parent_id}>
                      <Card className="p-3 bg-primary/20 border-primary/40 border-dashed">
                        <div className="flex items-center gap-2">
                          {editingGrupoId === item.id ? (
                            <>
                              <Input
                                className="h-8 text-sm font-bold flex-1"
                                value={editingGrupoTitulo}
                                onChange={(e) => setEditingGrupoTitulo(e.target.value.toUpperCase())}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && editingGrupoTitulo.trim()) {
                                    updateGrupoMut.mutate({ itemId: item.id, titulo: editingGrupoTitulo.trim().toUpperCase() });
                                  }
                                  if (e.key === "Escape") setEditingGrupoId(null);
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                if (editingGrupoTitulo.trim()) updateGrupoMut.mutate({ itemId: item.id, titulo: editingGrupoTitulo.trim().toUpperCase() });
                                else setEditingGrupoId(null);
                              }}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGrupoId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="flex-1 font-bold text-base text-primary uppercase tracking-wide px-1">{item.titulo_grupo}</span>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground disabled:opacity-30" disabled={findBlocoIdx(idx) <= 0} onClick={() => handleMove(idx, -1)} title="Mover bloco">
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground disabled:opacity-30" disabled={findBlocoIdx(idx) >= blocos.length - 1} onClick={() => handleMove(idx, 1)} title="Mover bloco">
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingGrupoId(item.id); setEditingGrupoTitulo(item.titulo_grupo); }} title="Editar título">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)} title="Remover sub-título">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </Card>
                    </DraggableRow>
                  );
                }

                // N/A marker — full width row
                if (item.isNA) {
                  return (
                    <DraggableRow key={item.id} draggableId={item.id} index={idx} isDragDisabled={!!item.subreceita_parent_id}>
                      <Card className="p-2 bg-primary/5 border-primary/20 border-dashed">
                        <div className="flex items-center gap-2">
                          {convertingNAId === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                className="h-8 text-sm font-bold flex-1"
                                value={convertingNATitulo}
                                onChange={(e) => setConvertingNATitulo(e.target.value.toUpperCase())}
                                placeholder="Digite o nome do sub-título..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && convertingNATitulo.trim()) {
                                    convertToGrupoMut.mutate({ itemId: item.id, titulo: convertingNATitulo.trim().toUpperCase() });
                                  }
                                  if (e.key === "Escape") { setConvertingNAId(null); setConvertingNATitulo(""); }
                                }}
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                if (convertingNATitulo.trim()) convertToGrupoMut.mutate({ itemId: item.id, titulo: convertingNATitulo.trim().toUpperCase() });
                                else { setConvertingNAId(null); setConvertingNATitulo(""); }
                              }}>
                                <Check className="w-3 h-3 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setConvertingNAId(null); setConvertingNATitulo(""); }}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-muted-foreground italic">N/A — sem nome</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80" onClick={() => { setConvertingNAId(item.id); setConvertingNATitulo(item.ingrediente_nome === "N/A" ? "" : item.ingrediente_nome); }} title="Converter para sub-título">
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)}><ArrowUp className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)}><ArrowDown className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItemOrGrupoMut.mutate(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </Card>
                    </DraggableRow>
                  );
                }

                const nomeCell = item.isSubreceita ? (
                  <div className="flex items-center gap-1.5">
                    <ChefHat className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{item.subreceita_nome}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-amber-300 text-amber-700 bg-amber-100/50">Preparar antes</Badge>
                    </div>
                  </div>
                ) : editingIngId === item.id ? (
                  <div className="relative">
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Buscar ingrediente..."
                        value={ingSearch}
                        onChange={(e) => setIngSearch(e.target.value)}
                        className="h-7 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Escape") { setEditingIngId(null); setIngSearch(""); } }}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => { setEditingIngId(null); setIngSearch(""); }}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    {ingSearch && (
                      <div className="absolute top-full left-0 right-0 z-50 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                        {ingredientesDB.filter(ing => ing.nome.toLowerCase().includes(ingSearch.toLowerCase())).slice(0, 20).map(ing => (
                          <button key={`ing-${ing.id}`} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            onClick={() => replaceIngMut.mutate({ itemId: item.id, newIngredienteId: ing.id, newIngredienteNome: ing.nome })}>
                            {ing.nome}
                          </button>
                        ))}
                        {receitasBasicas.filter(r => r.nome.toUpperCase().includes(ingSearch.toUpperCase())).slice(0, 10).map(r => (
                          <button key={`rec-${r.id}`} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                            onClick={() => replaceWithSubreceitaMut.mutate({ itemId: item.id, receitaId: r.id, receitaNome: r.nome })}>
                            <span className="flex items-center gap-1"><ChefHat className="w-3 h-3 text-primary" />{r.nome}</span>
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">Receita</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-sm">{item.ing?.nome || item.ingrediente_nome}</p>
                    {isQtdZero && <p className="text-xs text-amber-600 font-medium mt-0.5">Quantidade não informada</p>}
                  </div>
                );

                const pesoLiqCell = editingQtdId === item.id ? (
                  <div className="flex items-center gap-1 justify-end">
                    <Input
                      type="number"
                      className="h-7 w-20 text-sm text-right"
                      value={editingQtdValue}
                      onChange={(e) => setEditingQtdValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleConfirmQtd(item.id); if (e.key === "Escape") setEditingQtdId(null); }}
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleConfirmQtd(item.id)}><Check className="w-3 h-3 text-green-600" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingQtdId(null)}><X className="w-3 h-3 text-muted-foreground" /></Button>
                  </div>
                ) : (
                  <div className="text-right">
                    <button
                      className={`text-sm hover:underline hover:text-primary transition-colors ${isQtdZero ? "text-amber-600 font-medium" : "font-medium"}`}
                      onClick={() => { setEditingQtdId(item.id); setEditingQtdValue(item.qtdNova.toFixed(0)); }}
                      title="Clique para editar a quantidade"
                    >
                      {item.qtdNova.toFixed(0)}
                    </button>
                    {fator !== 1 && !item.isSubreceita && (
                      <p className="text-xs text-muted-foreground mt-0.5">original: {formatWeight(item.qtdOriginal, receita.unidade_base)}</p>
                    )}
                  </div>
                );

                const medidaInfo = !item.isSubreceita ? getMedidaDisplay(item) : null;
                const medidaCell = mostrarMedidaCaseira && (
                  <div>
                    {item.isSubreceita ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : editingMedidaId === item.id ? (
                      (() => {
                        const mc = medidaByIngrediente[item.ing?.id];
                        const ute = uteMap[mc?.utensilio];
                        return (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              className="h-6 w-12 text-xs border rounded px-1"
                              value={medidaInputValue}
                              onChange={(e) => setMedidaInputValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const n = parseFloat(medidaInputValue);
                                  const g = converterMedidaParaGramasInline(n, mc);
                                  if (g) {
                                    const baseTotal = (receita?.porcoes_base || 1) * fator;
                                    updateQtdMut.mutate({ itemId: item.id, quantidade_por_porcao: baseTotal > 0 ? g / baseTotal : g });
                                  }
                                  setEditingMedidaId(null);
                                }
                                if (e.key === "Escape") setEditingMedidaId(null);
                              }}
                              autoFocus
                            />
                            <span className="text-xs text-muted-foreground">{ute?.descricao_plural || ute?.descricao_singular || ""}</span>
                          </div>
                        );
                      })()
                    ) : medidaInfo?.texto ? (
                      <div className="flex items-center gap-1">
                        <button className="text-xs text-primary/70 hover:text-primary text-left" onClick={() => { setEditingMedidaId(item.id); setMedidaInputValue(""); }} title="Clique para digitar em medida caseira">
                          {medidaInfo.texto}
                        </button>
                        {medidaByIngrediente[item.ing?.id] && (
                          <button className="text-muted-foreground/60 hover:text-primary" onClick={() => { setCadastrarMedidaIng(item.ing); setEditarMedidaMc(medidaByIngrediente[item.ing.id]); }} title="Editar utensílio/referência">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground/50">—</span>
                        {item.ing && (
                          <button className="text-muted-foreground/60 hover:text-primary" onClick={() => { setCadastrarMedidaIng(item.ing); setEditarMedidaMc(null); }} title="Cadastrar medida caseira">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );

                const fc = item.ing?.fator_correcao || 1;

                const acoesCell = (
                  <div className="flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setEditingItem(item)} title="Editar quantidade e pré-preparo">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, -1)} title="Mover para cima"><ArrowUp className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => handleMove(idx, 1)} title="Mover para baixo"><ArrowDown className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => item.isSubreceita ? deleteSubreceitaMut.mutate(item.id) : deleteItemOrGrupoMut.mutate(item.id)} title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                );

                return (
                  <DraggableRow key={item.id} draggableId={item.id} index={idx} isDragDisabled={!!item.subreceita_parent_id}>
                    <div
                      className={`grid gap-2 items-center px-2 py-2 rounded-md border-b border-border/60 ${isQtdZero ? "bg-amber-50/60" : ""} ${item.isChildOfSubreceita ? "ml-6 border-l-4 border-l-amber-300 bg-amber-50/30" : ""} ${item.isSubreceita ? "bg-amber-50/40" : ""}`}
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      <div>{nomeCell}</div>
                      <div className="text-xs text-muted-foreground">{!item.isSubreceita ? (item.pre_preparo || "") : ""}</div>
                      <div>{pesoLiqCell}</div>
                      {mostrarFC && (
                        <div className="text-right">
                          {item.isSubreceita ? <span className="text-sm text-muted-foreground">—</span> : (
                            <Input
                              type="number"
                              step="0.01"
                              className="h-7 w-16 text-sm text-right ml-auto"
                              defaultValue={fc}
                              key={`${item.id}-${fc}`}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val > 0 && item.ing?.id) updateFCMut.mutate({ ingId: item.ing.id, fator_correcao: val });
                              }}
                              onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                            />
                          )}
                        </div>
                      )}
                      {mostrarFC && (
                        <div className="text-right text-sm text-muted-foreground">
                          {item.isSubreceita ? "—" : formatWeight(item.qtdComprar, receita.unidade_base)}
                        </div>
                      )}
                      {mostrarMedidaCaseira && medidaCell}
                      <div className="text-right">
                        <span className={`text-sm font-semibold ${formatCustoItem(item).className}`}>
                          {item.isSubreceita ? "—" : formatCustoItem(item).text}
                        </span>
                      </div>
                      <div>{acoesCell}</div>
                    </div>
                  </DraggableRow>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Total row — mesmo grid das linhas, reflete escala e toggles */}
      <div className="flex items-stretch gap-0.5 mt-1">
        <div className="w-8 shrink-0" />
        <div className="flex-1 min-w-0 grid gap-2 px-2 py-2 border-t-2 border-border bg-secondary/50 rounded-md" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="text-sm font-semibold">Total</div>
          <div />
          <div className="text-right text-sm font-semibold">{totalPesoLiq.toFixed(0)}</div>
          {mostrarFC && <div />}
          {mostrarFC && <div className="text-right text-sm font-semibold">{formatWeight(totalPBruto, receita.unidade_base)}</div>}
          {mostrarMedidaCaseira && <div />}
          <div className="text-right text-sm font-semibold text-primary">R$ {totalCusto.toFixed(2).replace(".", ",")}</div>
          <div />
        </div>
      </div>
    </div>
  );
}