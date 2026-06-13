import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChefHat } from "lucide-react";
import { toast } from "sonner";
import NovoIngredienteRapido from "@/components/receita/NovoIngredienteRapido";

export default function AddIngredienteDialog({ open, onClose, receitaId, porcoes, unidadeBase }) {
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // "ingrediente" | "subreceita"
  const [quantidade, setQuantidade] = useState("");
  const [medidaSel, setMedidaSel] = useState("g");
  const [prePreparo, setPrePreparo] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNovoIng, setShowNovoIng] = useState(false);
  const [novoIngNome, setNovoIngNome] = useState("");
  const qc = useQueryClient();

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => base44.entities.Receita.filter({ categoria: "Receitas Básicas" }),
  });

  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas"],
    queryFn: () => base44.entities.MedidaCaseira.list("-nome", 200),
  });

  const filteredIng = ingredientes.filter(
    (i) => !busca || i.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const filteredRec = receitasBasicas.filter(
    (r) => !busca || r.nome?.toUpperCase().includes(busca.toUpperCase())
  );

  const convertToGrams = (qty, measure) => {
    if (measure === "g" || measure === "ml") return qty;
    const medida = medidas.find(m => m.nome === measure);
    if (!medida) return qty;
    return qty * (medida.equivalencia_g || medida.equivalencia_ml || 1);
  };

  const handleSave = async () => {
    if (!selected) { toast.error("Selecione um ingrediente ou sub-receita"); return; }
    const qty = parseFloat(quantidade);
    if (!qty || qty <= 0) { toast.error("Informe a quantidade"); return; }

    setSaving(true);
    try {
      const existingItems = await base44.entities.IngredienteReceita.filter({ receita_id: receitaId });

      if (selectedType === "subreceita") {
        const qtdPorPorcao = qty / (porcoes || 1);
        await base44.entities.IngredienteReceita.create({
          receita_id: receitaId,
          tipo: "subreceita",
          subreceita_id: selected.id,
          subreceita_nome: selected.nome,
          quantidade_por_porcao: qtdPorPorcao,
          ordem: existingItems.length,
        });
        toast.success(`Sub-receita ${selected.nome} adicionada!`);
      } else {
        const qtdGramas = convertToGrams(qty, medidaSel);
        const qtdPorPorcao = qtdGramas / (porcoes || 1);
        await base44.entities.IngredienteReceita.create({
          receita_id: receitaId,
          ingrediente_id: selected.id,
          ingrediente_nome: selected.nome,
          pre_preparo: prePreparo,
          quantidade_por_porcao: qtdPorPorcao,
          medida_caseira: medidaSel !== "g" && medidaSel !== "ml" ? `${quantidade} ${medidaSel}` : "",
          ordem: existingItems.length,
        });
        toast.success(`${selected.nome} adicionado!`);
      }

      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      setSelected(null);
      setSelectedType(null);
      setQuantidade("");
      setMedidaSel("g");
      setPrePreparo("");
      setBusca("");
    } catch (err) {
      toast.error("Erro ao adicionar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const medidasOptions = [
    { value: "g", label: unidadeBase === "ml" ? "ml" : "g" },
    ...medidas
      .filter(m => !m.ingrediente_especifico)
      .reduce((acc, m) => {
        if (!acc.find(x => x.value === m.nome)) acc.push({ value: m.nome, label: m.nome });
        return acc;
      }, [])
  ];

  const noResults = filteredIng.length === 0 && filteredRec.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar Ingrediente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!selected ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar ingrediente ou sub-receita..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {filteredIng.slice(0, 20).map((ing) => (
                  <button
                    key={`ing-${ing.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                    onClick={() => { setSelected(ing); setSelectedType("ingrediente"); }}
                  >
                    <span className="font-medium">{ing.nome}</span>
                    <span className="text-xs text-muted-foreground">{ing.categoria}</span>
                  </button>
                ))}
                {filteredRec.slice(0, 20).map((rec) => (
                  <button
                    key={`rec-${rec.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                    onClick={() => { setSelected(rec); setSelectedType("subreceita"); }}
                  >
                    <span className="font-medium flex items-center gap-1">
                      <ChefHat className="w-3.5 h-3.5 text-primary" />
                      {rec.nome}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Receita</Badge>
                  </button>
                ))}
                {noResults && busca.trim() && selectedType !== "subreceita" && (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Ingrediente não localizado na lista. Deseja adicionar "{busca}"?
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => { setNovoIngNome(busca); setShowNovoIng(true); }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Cadastrar "{busca}"
                    </Button>
                  </div>
                )}
                {noResults && !busca.trim() && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Digite para buscar ingredientes ou sub-receitas.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-accent rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm flex items-center gap-1">
                    {selectedType === "subreceita" && <ChefHat className="w-3.5 h-3.5 text-primary" />}
                    {selected.nome || selectedType === "subreceita" ? selected.nome : selected.nome}
                    {selectedType === "subreceita" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">Sub-receita</Badge>
                    )}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSelectedType(null); }}>Trocar</Button>
                </div>
                {selectedType === "subreceita" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Rendimento: {selected.rendimento_total || "?"}{selected.unidade_base || "g"} · Custo total: R$ {(selected.custo_total || 0).toFixed(2).replace(".", ",")}
                  </p>
                )}
                {selectedType === "ingrediente" && selected.preco_por_g_rs > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {selected.preco_por_g_rs.toFixed(4).replace(".", ",")}/g
                  </p>
                )}
              </div>
              <div>
                <Label>Quantidade total (para {porcoes} porções)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Quantidade"
                    className="flex-1"
                  />
                  {selectedType === "subreceita" ? (
                    <div className="w-40 flex items-center px-3 border rounded-md text-sm text-muted-foreground bg-muted/50">
                      {unidadeBase}
                    </div>
                  ) : (
                    <Select value={medidaSel} onValueChange={setMedidaSel}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {medidasOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {medidaSel !== "g" && medidaSel !== "ml" && quantidade && selectedType !== "subreceita" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {convertToGrams(parseFloat(quantidade) || 0, medidaSel).toFixed(0)}{unidadeBase}
                  </p>
                )}
              </div>
              {selectedType !== "subreceita" && (
                <div>
                  <Label>Pré-preparo (opcional)</Label>
                  <Input value={prePreparo} onChange={(e) => setPrePreparo(e.target.value)} placeholder="Ex: picado, em cubos" />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={onClose}>Fechar</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {showNovoIng && (
        <NovoIngredienteRapido
          open={true}
          onClose={() => setShowNovoIng(false)}
          nomeSugerido={novoIngNome}
          onCreated={(ing) => {
            setSelected(ing);
            setSelectedType("ingrediente");
            setBusca(ing.nome);
            setShowNovoIng(false);
            qc.invalidateQueries({ queryKey: ["ingredientes"] });
          }}
        />
      )}
    </Dialog>
  );
}