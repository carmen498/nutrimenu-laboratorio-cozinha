import { criarIngredienteEsquecidoReceita } from '@/lib/secureChildEntities';
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const useMutationAny = /** @type {any} */ (useMutation);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";

const SUGESTOES_PROCESSO = [
  { nome: "Farinha para enfarinhar/espichar massa", busca: ["farinha de trigo", "farinha"] },
  { nome: "Cacau em pó para polvilhar forma", busca: ["cacau em pó", "cacau"] },
  { nome: "Óleo/manteiga para untar", busca: ["óleo", "manteiga", "azeite"] },
  { nome: "Queijo parmesão para salpicar/gratinar", busca: ["queijo parmesão", "parmesão"] },
  { nome: "Ovo / Gema para pincelar", busca: ["ovo", "gema"] },
  { nome: "Leite para pincelar", busca: ["leite"] },
  { nome: "Farinha de rosca para empanar", busca: ["farinha de rosca", "farinha"] },
  { nome: "Sal da água do cozimento", busca: ["sal"] },
];

const SUGESTOES_DECORACAO = [
  { nome: "Açúcar de confeiteiro para polvilhar", busca: ["açúcar de confeiteiro", "açúcar"] },
  { nome: "Granulado / Confeitos para decorar", busca: ["granulado", "confeito", "chocolate"] },
  { nome: "Glacê / Cobertura", busca: ["glacê", "cobertura", "açúcar"] },
  { nome: "Calda para finalizar", busca: ["calda", "mel", "açúcar"] },
  { nome: "Brilho para torta", busca: ["gelatina", "geléia", "brilho"] },
  { nome: "Azeite para finalizar", busca: ["azeite"] },
  { nome: "Flor de sal para finalizar", busca: ["sal", "flor de sal"] },
  { nome: "Chantilly para decorar", busca: ["chantilly", "creme de leite"] },
  { nome: "Frutas frescas para decorar", busca: ["frutas", "morango", "framboesa", "mirtilo"] },
  { nome: "Ervas frescas para decorar", busca: ["ervas", "manjericão", "salsa", "coentro", "cebolinha", "hortelã"] },
  { nome: "Chocolate ralado para decorar", busca: ["chocolate em barra", "chocolate meio amargo", "chocolate ao leite", "chocolate"] },
  { nome: "Nozes / Castanhas para decorar", busca: ["nozes", "castanha", "amêndoa", "avelã"] },
];

const SUGESTOES = [...SUGESTOES_PROCESSO, ...SUGESTOES_DECORACAO];

export default function IngredientesEsquecidos({ receitaId, fator = 1 }) {
  const qc = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customNome, setCustomNome] = useState("");
  const [customQtd, setCustomQtd] = useState("");
  const [editingCustoId, setEditingCustoId] = useState(null);
  const [editingCustoVal, setEditingCustoVal] = useState("");
  const [savedCustoId, setSavedCustoId] = useState(null);

  const { data: esquecidos = [] } = useQuery({
    queryKey: ["esquecidos-receita", receitaId],
    queryFn: () => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: receitaId }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const findIngrediente = (nomeSugestao) => {
    const sug = SUGESTOES.find(s => s.nome === nomeSugestao);
    if (!sug) return null;
    for (const term of sug.busca) {
      const match = ingredientesDB.find(i => i.nome?.toLowerCase().includes(term.toLowerCase()));
      if (match) return match;
    }
    return null;
  };

  const addMut = useMutationAny({
    mutationFn: async (nome) => {
      const ing = findIngrediente(nome);
      await criarIngredienteEsquecidoReceita({
        receita_id: receitaId,
        nome,
        quantidade_g: 30,
        ingrediente_id: ing?.id || "",
        custo_unitario: ing?.preco_por_g_rs || 0,
        custo_total: parseFloat(((30) * (ing?.preco_por_g_rs || 0)).toFixed(4)),
      });
      await invalidarCustosDependentesSeguro({ receitaIds: [receitaId], motivo: "ingrediente_esquecido_adicionado", origem: "ingrediente_esquecido" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      setPopoverOpen(false);
      toast.success("Ingrediente esquecido adicionado");
    },
  });

  const addCustomMut = useMutationAny({
    mutationFn: async () => {
      if (!customNome.trim()) return;
      const qtd = parseFloat(customQtd) || 30;
      const match = ingredientesDB.find(i => i.nome?.toLowerCase().includes(customNome.trim().toLowerCase()));
      await criarIngredienteEsquecidoReceita({
        receita_id: receitaId,
        nome: customNome.trim(),
        quantidade_g: qtd,
        ingrediente_id: match?.id || "",
        custo_unitario: match?.preco_por_g_rs || 0,
        custo_total: parseFloat((qtd * (match?.preco_por_g_rs || 0)).toFixed(4)),
      });
      await invalidarCustosDependentesSeguro({ receitaIds: [receitaId], motivo: "ingrediente_esquecido_adicionado", origem: "ingrediente_esquecido" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      setCustomNome("");
      setCustomQtd("");
      toast.success("Adicionado");
    },
  });

  const updateQtdMut = useMutationAny({
    mutationFn: async ({ itemId, quantidade_g }) => {
      const item = esquecidos.find(e => e.id === itemId);
      const cu = item?.custo_unitario || 0;
      await base44.entities.IngredienteEsquecidoReceita.update(itemId, {
        quantidade_g,
        custo_total: parseFloat((quantidade_g * cu).toFixed(4)),
      });
      await invalidarCustosDependentesSeguro({ receitaIds: [receitaId], motivo: "quantidade_ingrediente_esquecido_alterada", origem: "ingrediente_esquecido" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] }),
  });

  const updateCustoMut = useMutationAny({
    mutationFn: async ({ itemId, custo_unitario }) => {
      const item = esquecidos.find(e => e.id === itemId);
      const qtd = item?.quantidade_g || 0;
      await base44.entities.IngredienteEsquecidoReceita.update(itemId, {
        custo_unitario,
        custo_total: parseFloat((custo_unitario * qtd).toFixed(4)),
      });
      await invalidarCustosDependentesSeguro({ receitaIds: [receitaId], motivo: "custo_ingrediente_esquecido_alterado", origem: "ingrediente_esquecido" });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      setEditingCustoId(null);
      setSavedCustoId(vars.itemId);
      setTimeout(() => setSavedCustoId(null), 1200);
      toast.success("Custo salvo");
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const deleteMut = useMutationAny({
    mutationFn: async (itemId) => {
      await base44.entities.IngredienteEsquecidoReceita.delete(itemId);
      await invalidarCustosDependentesSeguro({ receitaIds: [receitaId], motivo: "ingrediente_esquecido_removido", origem: "ingrediente_esquecido" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      toast.success("Removido");
    },
  });

  const confirmCusto = (itemId) => {
    const val = parseFloat(String(editingCustoVal).replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      updateCustoMut.mutate({ itemId, custo_unitario: parseFloat(val.toFixed(6)) });
    } else {
      setEditingCustoId(null);
    }
  };

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "R$ 0,00";

  const custoTotal = esquecidos.reduce((s, i) => s + (i.custo_total || 0), 0);
  const custoEscalado = custoTotal * fator;

  return (
    <Card id="ingredientes-esquecidos" className="p-4 scroll-mt-24">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-muted-foreground italic">
            Ingredientes Esquecidos
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground/60 hover:text-muted-foreground shrink-0"
                title="O que são Ingredientes Esquecidos?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-y-auto text-sm" align="start">
              <p className="font-semibold mb-2">O que são Ingredientes Esquecidos?</p>
              <p className="text-muted-foreground mb-3">
                São itens que fazem parte do preparo mas não entram na lista principal por não terem peso ou quantidade controlada com precisão — ainda assim, têm custo real e devem ser registrados.
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li><span className="text-foreground font-medium">Água:</span> usada para cozinhar ou diluir. Atenção especial — seu volume interfere no cálculo do rendimento, no tamanho da porção e nos valores da tabela nutricional.</li>
                <li><span className="text-foreground font-medium">Farinha:</span> para espichar a massa</li>
                <li><span className="text-foreground font-medium">Açúcar:</span> para polvilhar a forma</li>
                <li><span className="text-foreground font-medium">Manteiga:</span> para untar</li>
                <li><span className="text-foreground font-medium">Óleo:</span> para fritar, grelhar ou untar formas</li>
                <li><span className="text-foreground font-medium">Enfeites:</span> do prato ou do buffet</li>
                <li><span className="text-foreground font-medium">Sal e pimenta:</span> utilizados para temperar durante o preparo</li>
                <li><span className="text-foreground font-medium">Fermento:</span> pequenas quantidades usadas em algumas receitas</li>
                <li><span className="text-foreground font-medium">Vinagre:</span> utilizado para temperar ou limpar hortaliças</li>
                <li><span className="text-foreground font-medium">Café ou chá:</span> utilizados para adicionar sabor</li>
                <li>Salsa picada para finalização</li>
                <li>Parmesão (para polvilhar)</li>
                <li><span className="text-foreground font-medium">Cremes e pastas:</span> como maionese, mostarda, etc.</li>
                <li><span className="text-foreground font-medium">Especiarias ou raspas de frutas cítricas:</span> canela, noz-moscada, cravo-da-índia, folhas de louro, etc.</li>
                <li>Flores comestíveis</li>
                <li><span className="text-foreground font-medium">Molhos prontos:</span> pequenas quantidades de molhos como molho de soja, molho inglês, etc.</li>
              </ol>
            </PopoverContent>
          </Popover>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground">
              <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="max-h-64 overflow-y-auto">
              <div className="px-3 py-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Processo</p>
              </div>
              {SUGESTOES_PROCESSO.map((sug, idx) => (
                <button
                  key={"p"+idx}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => addMut.mutate(sug.nome)}
                >
                  {sug.nome}
                </button>
              ))}
              <div className="px-3 py-1.5 border-t mt-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Decoração / Acabamento</p>
              </div>
              {SUGESTOES_DECORACAO.map((sug, idx) => (
                <button
                  key={"d"+idx}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => addMut.mutate(sug.nome)}
                >
                  {sug.nome}
                </button>
              ))}
              <div className="border-t px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1.5">Outro (digitar):</p>
                <div className="space-y-1.5">
                  <Input
                    placeholder="Nome do ingrediente"
                    value={customNome}
                    onChange={(e) => setCustomNome(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      placeholder="g"
                      value={customQtd}
                      onChange={(e) => setCustomQtd(e.target.value)}
                      className="h-8 w-20 text-sm"
                      min={1}
                    />
                    <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => addCustomMut.mutate()} disabled={!customNome.trim()}>
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {esquecidos.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 italic px-1">
          Nenhum ingrediente esquecido. Use para itens de processo e acabamento.
        </p>
      ) : (
        <div className="space-y-1">
          {esquecidos.map((item) => (
            <Card key={item.id} className="p-2 bg-muted/30 border-muted">
              <div className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-muted-foreground truncate">{item.nome}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Input
                    type="number"
                    className="h-7 w-16 text-xs text-center"
                    min={0}
                    step={1}
                    value={item.quantidade_g || 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      updateQtdMut.mutate({ itemId: item.id, quantidade_g: val });
                    }}
                  />
                  <span className="text-xs text-muted-foreground w-4">g</span>
                </div>
                <div className="shrink-0 text-right" style={{ width: "130px" }}>
                  {editingCustoId === item.id ? (
                    <div className="flex items-center gap-0.5 justify-end">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-6 w-16 text-[10px] text-center"
                        value={editingCustoVal}
                        onChange={(e) => setEditingCustoVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            confirmCusto(item.id);
                          }
                          if (e.key === "Escape") setEditingCustoId(null);
                        }}
                        onBlur={() => {
                          setTimeout(() => confirmCusto(item.id), 150);
                        }}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div>
                      <span className="block text-[10px] text-muted-foreground leading-none">R$/g</span>
                      <button
                        className="text-xs font-medium text-primary hover:underline"
                        onClick={() => {
                          setEditingCustoId(item.id);
                          setEditingCustoVal(String((item.custo_unitario || 0)).replace(".", ","));
                        }}
                        title="Editar custo por grama"
                      >
                        {formatCurrency(item.custo_unitario || 0)}
                      </button>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium w-20 text-right transition-colors duration-300 ${savedCustoId === item.id ? "text-green-600" : "text-primary"}`}>
                  {formatCurrency(item.custo_total || 0)}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(item.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
          {fator !== 1 && (
            <div className="flex justify-end text-xs text-muted-foreground pr-1">
              <span>Subtotal: {formatCurrency(custoTotal)} · Escalado (×{fator.toFixed(2)}): {formatCurrency(custoEscalado)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}