import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Search, CheckCircle2, Merge } from "lucide-react";
import { toast } from "sonner";
import { buscarIngredientesRanqueado } from "@/lib/normalizarNome";
import { fetchAllPages } from "@/lib/fetchAllPages";

export default function FundirIngredienteDialog({ open, onClose, ingrediente }) {
  const [busca, setBusca] = useState("");
  const [destino, setDestino] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progresso, setProgresso] = useState(null); // { processadas, total }
  const [resultado, setResultado] = useState(null);
  const qc = useQueryClient();

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
    enabled: open,
  });

  const filtered = buscarIngredientesRanqueado(busca, ingredientes, 20).filter(
    (i) => i.id !== ingrediente?.id
  );

  const reset = () => {
    setBusca("");
    setDestino(null);
    setPreview(null);
    setResultado(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectDestino = async (ing) => {
    setDestino(ing);
    setLoadingPreview(true);
    try {
      const res = await base44.functions.invoke("fundirIngredientes", {
        origem_id: ingrediente.id,
        destino_id: ing.id,
        acao: "preview",
      });
      setPreview(res.data);
    } catch (err) {
      toast.error("Erro ao carregar prévia: " + (err.message || ""));
      setDestino(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmar = async () => {
    if (!destino || !preview) return;
    setConfirming(true);
    const total = preview.total || 0;
    const nomesPorReceita = {};
    preview.receitas.forEach((r) => { nomesPorReceita[r.receita_id] = r.receita_nome; });

    let processadas = 0;
    const falhas = [];
    const failedIds = [];
    setProgresso({ processadas: 0, total });

    try {
      while (true) {
        const res = await base44.functions.invoke("fundirIngredientes", {
          origem_id: ingrediente.id,
          destino_id: destino.id,
          acao: "confirmar_lote",
          limit: 30,
          failedIds,
        });
        const data = res.data || {};
        processadas += data.processedCount || 0;
        (data.novasFalhas || []).forEach((f) => {
          falhas.push({ receita_id: f.receita_id, receita_nome: nomesPorReceita[f.receita_id] || f.receita_id, erro: f.erro });
          failedIds.push(f.linha_id);
        });
        setProgresso({ processadas: Math.min(processadas + falhas.length, total), total });

        if (data.done) break;
      }

      let origemExcluido = false;
      if (falhas.length === 0) {
        const delRes = await base44.functions.invoke("fundirIngredientes", {
          origem_id: ingrediente.id,
          destino_id: destino.id,
          acao: "excluir_origem",
        });
        origemExcluido = !!delRes.data?.success;
      }

      const resultadoFinal = {
        success: falhas.length === 0,
        receitasAtualizadas: processadas,
        falhas,
        origemExcluido,
        origemNome: ingrediente.nome,
        destinoNome: destino.nome,
      };
      setResultado(resultadoFinal);
      if (resultadoFinal.success) {
        qc.invalidateQueries({ queryKey: ["ingredientes"] });
        qc.invalidateQueries({ queryKey: ["receitas"] });
        qc.invalidateQueries({ queryKey: ["all-itens-receita"] });
      }
    } catch (err) {
      toast.error("Erro ao fundir: " + (err.message || ""));
    } finally {
      setConfirming(false);
      setProgresso(null);
    }
  };

  const handleFinish = () => {
    reset();
    onClose(resultado?.success ? true : false);
  };

  if (!ingrediente) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Merge className="w-5 h-5" /> Fundir "{ingrediente.nome}"
          </DialogTitle>
        </DialogHeader>

        {resultado ? (
          <div className="space-y-4">
            {resultado.success ? (
              <div className="text-center py-4 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <p className="font-medium">
                  {resultado.receitasAtualizadas} receita{resultado.receitasAtualizadas === 1 ? "" : "s"} atualizada{resultado.receitasAtualizadas === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-muted-foreground">
                  "{resultado.origemNome}" foi excluído e substituído por "{resultado.destinoNome}".
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-medium">Algumas receitas falharam</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {resultado.receitasAtualizadas} receita(s) foram atualizadas, mas o ingrediente "{resultado.origemNome}" NÃO foi excluído pois as receitas abaixo falharam:
                </p>
                <ul className="list-disc list-inside text-sm text-destructive space-y-0.5 max-h-40 overflow-y-auto">
                  {resultado.falhas.map((f) => (
                    <li key={f.receita_id}>{f.receita_nome || f.receita_id}: {f.erro}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleFinish}>Concluir</Button>
            </div>
          </div>
        ) : !destino ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha o ingrediente que vai <strong>permanecer</strong> no cadastro (destino). "{ingrediente.nome}" será substituído por ele em todas as receitas e depois excluído.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ingrediente destino..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filtered.length === 0 && busca.trim() && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum ingrediente encontrado.</p>
              )}
              {filtered.map((ing) => (
                <button
                  key={ing.id}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-accent text-sm flex justify-between items-center"
                  onClick={() => handleSelectDestino(ing)}
                >
                  <span className="font-medium">{ing.nome}</span>
                  <span className="text-xs text-muted-foreground">{ing.categoria}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg flex items-center justify-center gap-2 text-sm font-medium">
              <span className="truncate">{ingrediente.nome}</span>
              <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
              <span className="truncate">{destino.nome}</span>
              <Button variant="ghost" size="sm" className="ml-2 shrink-0" onClick={() => { setDestino(null); setPreview(null); }}>
                Trocar
              </Button>
            </div>

            {loadingPreview ? (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando prévia...</p>
            ) : preview ? (
              preview.total === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  "{ingrediente.nome}" não é usado em nenhuma receita. A fusão apenas excluirá este ingrediente.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">
                    <strong>{preview.total}</strong> receita{preview.total === 1 ? "" : "s"} usa{preview.total === 1 ? "" : "m"} "{ingrediente.nome}":
                  </p>
                  <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                    {preview.receitas.map((r) => (
                      <div key={r.receita_id} className="px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{r.receita_nome}</span>
                          <span className="text-muted-foreground whitespace-nowrap">{r.quantidade_por_porcao.toFixed(1).replace(".", ",")} g/porção</span>
                        </div>
                        {r.destino_ja_existe && (
                          <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            "{destino.nome}" já está nesta receita ({r.destino_quantidade_atual.toFixed(1).replace(".", ",")} g) — as quantidades serão somadas.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : null}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handleConfirmar}
                disabled={loadingPreview || confirming || !preview}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {confirming ? "Fundindo..." : "Confirmar fusão"}
              </Button>
            </div>

            {confirming && progresso && progresso.total > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Processando {progresso.processadas} de {progresso.total} receitas...
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}