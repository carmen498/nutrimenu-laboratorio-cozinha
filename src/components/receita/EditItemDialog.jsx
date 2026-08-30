import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, ArrowLeftRight, X, DollarSign, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { buscarIngredientesRanqueado } from "@/lib/normalizarNome";

export default function EditItemDialog({ open, onClose, item, porcoesBase, fator, onSave, saving, onEditPrice }) {
  const [qtd, setQtd] = useState("");
  const [prePreparo, setPrePreparo] = useState("");
  const [novoIng, setNovoIng] = useState(null);
  const [busca, setBusca] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const ingredienteId = item?.ingrediente_id || item?.ing?.id;
  const { data: ingredienteCarregado = null } = useQuery({
    queryKey: ["ingrediente", "atalho-edicao", ingredienteId],
    queryFn: () => base44.entities.Ingrediente.get(ingredienteId),
    enabled: open && !!ingredienteId && !item?.ing,
  });
  const ingredienteAtual = item?.ing || ingredienteCarregado;

  useEffect(() => {
    if (item) {
      setQtd(String(Math.round(item.qtdNova || 0)));
      setPrePreparo(item.pre_preparo || "");
      setNovoIng(null);
      setBusca("");
      setShowSearch(false);
    }
  }, [item]);

  if (!item) return null;

  const isSubreceita = item.tipo === "subreceita";
  const isIngrediente = !isSubreceita && item.tipo !== "grupo";
  const baseTotal = (porcoesBase || 1) * (fator || 1);
  const numPorcoes = Math.round((porcoesBase || 1) * (fator || 1));

  const filteredIng = buscarIngredientesRanqueado(busca, ingredientes, 20);

  const handleSave = () => {
    const val = parseFloat(qtd);
    if (isNaN(val) || val < 0) return;
    const qtdPorPorcao = baseTotal > 0 ? val / baseTotal : val;
    const payload = { itemId: item.id, quantidade_por_porcao: qtdPorPorcao, pre_preparo: prePreparo };
    if (novoIng) {
      payload.ingrediente_id = novoIng.id;
      payload.ingrediente_nome = novoIng.nome;
    }
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Editar — {isSubreceita ? item.subreceita_nome : (item.ingrediente_nome || item.ing?.nome)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {isIngrediente && ingredienteAtual && !novoIng && (
            <div className="p-2.5 bg-muted/50 rounded-lg flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Preço atual: <span className="font-medium text-foreground">
                  {ingredienteAtual.preco_por_g_rs > 0 ? `R$ ${ingredienteAtual.preco_por_g_rs.toFixed(4).replace(".", ",")}/g` : "não cadastrado"}
                </span>
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEditPrice(ingredienteAtual)}>
                  <DollarSign className="w-3.5 h-3.5 mr-1" /> Editar cadastro do ingrediente
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir cadastro completo do ingrediente" asChild>
                  <Link to={`/ingrediente/${ingredienteId}?editar=1`}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
          {isIngrediente && (
            <div>
              {novoIng ? (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Substituir por</p>
                      <p className="font-medium text-sm">{novoIng.nome}</p>
                      {novoIng.preco_por_g_rs > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          R$ {novoIng.preco_por_g_rs.toFixed(4).replace(".", ",")}/g · FC: {(novoIng.fator_correcao || 1).toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setNovoIng(null); setBusca(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : showSearch ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ingrediente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setBusca(""); } }}
                  />
                  {busca && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                      {filteredIng.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-3">Nenhum ingrediente encontrado</p>
                      ) : (
                        filteredIng.map((ing) => (
                          <button
                            key={ing.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                            onClick={() => { setNovoIng(ing); setShowSearch(false); setBusca(""); }}
                          >
                            <span className="font-medium">{ing.nome}</span>
                            <span className="text-xs text-muted-foreground">{ing.categoria}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="mt-1 text-xs text-muted-foreground" onClick={() => { setShowSearch(false); setBusca(""); }}>
                    Cancelar busca
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSearch(true)}>
                  <ArrowLeftRight className="w-4 h-4 mr-1" /> Trocar ingrediente
                </Button>
              )}
            </div>
          )}
          <div>
            <Label>Quantidade total (para {numPorcoes} porções)</Label>
            <Input
              type="number"
              step="0.1"
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
              className="mt-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          {!isSubreceita && (
            <div>
              <Label>Pré-preparo</Label>
              <Input
                value={prePreparo}
                onChange={(e) => setPrePreparo(e.target.value)}
                placeholder="Ex: picado, em cubos"
                className="mt-1"
              />
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}