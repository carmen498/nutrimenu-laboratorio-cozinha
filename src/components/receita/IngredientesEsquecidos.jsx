import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  { nome: "Chocolate ralado para decorar", busca: ["chocolate"] },
  { nome: "Nozes / Castanhas para decorar", busca: ["nozes", "castanha", "amêndoa", "avelã"] },
];

const SUGESTOES = [...SUGESTOES_PROCESSO, ...SUGESTOES_DECORACAO];

export default function IngredientesEsquecidos({ receitaId, fator = 1 }) {
  const qc = useQueryClient();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customNome, setCustomNome] = useState("");
  const [customQtd, setCustomQtd] = useState("");

  const { data: esquecidos = [] } = useQuery({
    queryKey: ["esquecidos-receita", receitaId],
    queryFn: () => base44.entities.IngredienteEsquecidoReceita.filter({ receita_id: receitaId }),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
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

  const addMut = useMutation({
    mutationFn: async (nome) => {
      const ing = findIngrediente(nome);
      await base44.entities.IngredienteEsquecidoReceita.create({
        receita_id: receitaId,
        nome,
        quantidade_g: 30,
        ingrediente_id: ing?.id || "",
        custo_unitario: ing?.preco_por_g_rs || 0,
        custo_total: parseFloat(((30) * (ing?.preco_por_g_rs || 0)).toFixed(4)),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      setPopoverOpen(false);
      toast.success("Ingrediente esquecido adicionado");
    },
  });

  const addCustomMut = useMutation({
    mutationFn: async () => {
      if (!customNome.trim()) return;
      const qtd = parseFloat(customQtd) || 30;
      const match = ingredientesDB.find(i => i.nome?.toLowerCase().includes(customNome.trim().toLowerCase()));
      await base44.entities.IngredienteEsquecidoReceita.create({
        receita_id: receitaId,
        nome: customNome.trim(),
        quantidade_g: qtd,
        ingrediente_id: match?.id || "",
        custo_unitario: match?.preco_por_g_rs || 0,
        custo_total: parseFloat((qtd * (match?.preco_por_g_rs || 0)).toFixed(4)),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      setCustomNome("");
      setCustomQtd("");
      toast.success("Adicionado");
    },
  });

  const updateQtdMut = useMutation({
    mutationFn: async ({ itemId, quantidade_g }) => {
      const item = esquecidos.find(e => e.id === itemId);
      const cu = item?.custo_unitario || 0;
      await base44.entities.IngredienteEsquecidoReceita.update(itemId, {
        quantidade_g,
        custo_total: parseFloat((quantidade_g * cu).toFixed(4)),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (itemId) => base44.entities.IngredienteEsquecidoReceita.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["esquecidos-receita", receitaId] });
      toast.success("Removido");
    },
  });

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "R$ 0,00";

  const custoTotal = esquecidos.reduce((s, i) => s + (i.custo_total || 0), 0);
  const custoEscalado = custoTotal * fator;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground italic">
          Ingredientes Esquecidos
        </h3>
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
                <span className="text-xs font-medium text-primary w-20 text-right">
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
    </div>
  );
}