import { criarIngredienteReceita } from '@/lib/secureChildEntities';
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ChefHat, Star } from "lucide-react";
import { toast } from "sonner";
import NovoIngredienteRapido from "@/components/receita/NovoIngredienteRapido";
import { buscarIngredientesRanqueado, buscarReceitasMultiPalavra } from "@/lib/normalizarNome";
import { explodeSubreceita } from "@/lib/subreceitaUtils";
import { fetchAllFilteredPages, fetchAllPages } from "@/lib/fetchAllPages";
import { registrarHistorico } from "@/lib/registrarHistorico";
import { getMedidaIngredienteId, getMedidaPesoG } from "@/lib/ingredienteReceitaCalc";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";

export default function AddIngredienteDialog({ open, onClose, receitaId, receitaNome, porcoes, unidadeBase }) {
  const unidadeCanonica = unidadeBase === "ml" ? "ml" : "g";
  const [busca, setBusca] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // "ingrediente" | "subreceita"
  const [quantidade, setQuantidade] = useState("");
  const [medidaSel, setMedidaSel] = useState(unidadeCanonica);
  const [prePreparo, setPrePreparo] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNovoIng, setShowNovoIng] = useState(false);
  const [novoIngNome, setNovoIngNome] = useState("");
  const qc = useQueryClient();

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "-nome"),
  });

  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas-caseiras"],
    queryFn: () => base44.entities.MedidaCaseira.list("-nome", 500),
  });

  const filteredIng = buscarIngredientesRanqueado(busca, ingredientes, 20);
  const favoritos = !busca ? ingredientes.filter(i => i.favorito).slice(0, 8) : [];
  const outros = !busca ? filteredIng.filter(i => !i.favorito) : filteredIng;
  const filteredRec = buscarReceitasMultiPalavra(busca, receitasBasicas, receitaId, 20);

  const medidaSelecionada = medidaSel?.startsWith("mc:")
    ? medidas.find((m) => m.id === medidaSel.slice(3)) || null
    : null;

  const medidaCompativelComSelecionado = (m) => {
    if (!selected || selectedType !== "ingrediente") return !getMedidaIngredienteId(m) && !m.ingrediente_especifico;
    const ingredienteId = getMedidaIngredienteId(m);
    if (ingredienteId) return ingredienteId === selected.id;
    if (m.ingrediente_especifico) {
      return m.ingrediente_especifico.trim().toLowerCase() === selected.nome?.trim().toLowerCase();
    }
    return true;
  };

  const convertToGrams = (qty, measureValue) => {
    if (measureValue === "g" || measureValue === "ml") return qty;
    const medida = measureValue?.startsWith("mc:")
      ? medidas.find((m) => m.id === measureValue.slice(3))
      : null;
    if (!medida) return qty;
    const refG = getMedidaPesoG(medida) || Number(medida.equivalencia_ml) || 0;
    return refG > 0 ? qty * refG : qty;
  };

  const handleSave = async () => {
    if (!selected) { toast.error("Selecione um ingrediente ou sub-receita"); return; }
    const qty = parseFloat(quantidade);
    if (!qty || qty <= 0) { toast.error("Informe a quantidade"); return; }

    setSaving(true);
    try {
      const existingItems = await fetchAllFilteredPages(
        base44.entities.IngredienteReceita,
        { receita_id: receitaId },
        "ordem",
        500
      );
      const maxOrdem = existingItems.reduce((max, i) => Math.max(max, i.ordem || 0), 0);

      if (selectedType === "subreceita") {
        const qtdPorPorcao = qty / (porcoes || 1);
        // Valida ciclo/origem e calcula o cache ANTES de persistir o marcador.
        // Assim uma falha de expansão não deixa uma relação órfã/pendente no banco.
        const { children, rendimentoEfetivo, rendimentoEstimado, diagnostico } = await explodeSubreceita(selected, qtdPorPorcao, { pilhaInicial: [receitaId] });
        const markerItem = await criarIngredienteReceita({
          receita_id: receitaId,
          tipo: "subreceita",
          subreceita_id: selected.id,
          subreceita_nome: selected.nome,
          quantidade_por_porcao: qtdPorPorcao,
          unidade_quantidade: unidadeCanonica,
          ordem: maxOrdem + 10,
        });
        let nextOrdem = maxOrdem + 11;
        for (const child of children) {
          await criarIngredienteReceita({
            ...child,
            receita_id: receitaId,
            ordem: nextOrdem++,
            subreceita_parent_id: markerItem.id,
          });
        }
        await base44.entities.IngredienteReceita.update(markerItem.id, {
          modelo_versao: 2,
          subreceita_modo: "referencia_cache",
          subreceita_cache_versao: 2,
          subreceita_sincronizacao_status: children.length > 0 ? "sincronizada" : "a_validar",
          subreceita_dependencias_assinatura: diagnostico?.assinaturaDependencias || "",
          subreceita_origem_updated_at: diagnostico?.raizAtualizadaEm || "",
          subreceita_sincronizada_em: diagnostico?.geradoEm || new Date().toISOString(),
        });
        const pulledCount = children.length;
        const rendMsg = rendimentoEstimado
          ? ` — Rendimento não cadastrado, usando soma dos ingredientes: ${rendimentoEfetivo}g. Ajuste na ficha da receita se necessário.`
          : "";
        toast.success(`Sub-receita ${selected.nome} adicionada${pulledCount > 0 ? ` com ${pulledCount} ingredientes puxados` : ""}!${rendMsg}`);
        registrarHistorico(receitaId, receitaNome, ["Ingredientes"]);
      } else {
        const qtdGramas = convertToGrams(qty, medidaSel);
        const qtdPorPorcao = qtdGramas / (porcoes || 1);
        await criarIngredienteReceita({
          receita_id: receitaId,
          tipo: "ingrediente",
          ingrediente_id: selected.id,
          ingrediente_nome: selected.nome,
          pre_preparo: prePreparo,
          quantidade_por_porcao: qtdPorPorcao,
          unidade_quantidade: unidadeCanonica,
          medida_caseira_id: medidaSelecionada?.id || "",
          quantidade_medida_caseira: medidaSelecionada ? qty : undefined,
          medida_caseira: medidaSelecionada ? `${quantidade} ${medidaSelecionada.nome}` : "",
          ordem: maxOrdem + 10,
        });
        toast.success(`${selected.nome} adicionado!`);
        registrarHistorico(receitaId, receitaNome, ["Ingredientes"]);
      }

      await invalidarCustosDependentesSeguro({
        receitaIds: [receitaId],
        motivo: selectedType === "subreceita" ? "subreceita_adicionada" : "ingrediente_adicionado",
        origem: "composicao_receita",
      });
      qc.invalidateQueries({ queryKey: ["itens-receita", receitaId] });
      setSelected(null);
      setSelectedType(null);
      setQuantidade("");
      setMedidaSel(unidadeCanonica);
      setPrePreparo("");
      setBusca("");
    } catch (err) {
      toast.error("Erro ao adicionar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const medidasOptions = [
    { value: unidadeCanonica, label: unidadeCanonica },
    ...medidas
      .filter((m) => !m.so_gramas && medidaCompativelComSelecionado(m))
      .map((m) => ({ value: `mc:${m.id}`, label: m.nome }))
      .filter((m, idx, arr) => arr.findIndex((x) => x.value === m.value) === idx),
  ];

  const noResults = filteredIng.length === 0 && filteredRec.length === 0;
  const usandoMedidaCaseira = !!medidaSelecionada;

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
                {favoritos.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground px-3 pt-1 pb-0.5 tracking-wide flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Sugestões rápidas (favoritos)
                    </p>
                    {favoritos.map((ing) => (
                      <button
                        key={`fav-${ing.id}`}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                        onClick={() => { setSelected(ing); setSelectedType("ingrediente"); setMedidaSel(unidadeCanonica); }}
                      >
                        <span className="font-medium flex items-center gap-1.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          {ing.nome}
                        </span>
                        <span className="text-xs text-muted-foreground">{ing.categoria}</span>
                      </button>
                    ))}
                    <div className="border-t border-border mx-3 my-1" />
                  </>
                )}
                {(busca ? filteredIng : outros).slice(0, 20).map((ing) => (
                  <button
                    key={`ing-${ing.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                    onClick={() => { setSelected(ing); setSelectedType("ingrediente"); setMedidaSel(unidadeCanonica); }}
                  >
                    <span className="font-medium">{ing.nome}</span>
                    <span className="text-xs text-muted-foreground">{ing.categoria}</span>
                  </button>
                ))}
                {filteredRec.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground px-3 pt-2 pb-0.5 tracking-wide flex items-center gap-1">
                      <ChefHat className="w-3 h-3 text-primary" /> Sub-receitas
                    </p>
                    {filteredRec.map((rec) => (
                      <button
                        key={`rec-${rec.id}`}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                        onClick={() => { setSelected(rec); setSelectedType("subreceita"); setMedidaSel(unidadeCanonica); }}
                      >
                        <span className="font-medium flex items-center gap-1">
                          <ChefHat className="w-3.5 h-3.5 text-primary" />
                          {rec.nome}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Receita</Badge>
                      </button>
                    ))}
                  </>
                )}
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
                    {selected.nome}
                    {selectedType === "subreceita" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">Sub-receita</Badge>
                    )}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSelectedType(null); setMedidaSel(unidadeCanonica); }}>Trocar</Button>
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
                      {unidadeCanonica}
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
                {usandoMedidaCaseira && quantidade && selectedType !== "subreceita" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ {convertToGrams(parseFloat(quantidade) || 0, medidaSel).toFixed(0)}{unidadeCanonica}
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
            setMedidaSel(unidadeCanonica);
            setShowNovoIng(false);
            qc.invalidateQueries({ queryKey: ["ingredientes"] });
          }}
        />
      )}
    </Dialog>
  );
}
