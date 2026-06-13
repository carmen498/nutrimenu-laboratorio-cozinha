import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, AlertCircle, Plus, AlertTriangle } from "lucide-react";
import CategoriaPicker, { CATEGORIAS } from "@/components/receita/CategoriaPicker";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";

export default function NovaReceitaIA({ open, onClose, onCreated }) {
  const [texto, setTexto] = useState("");
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: medidas = [] } = useQuery({
    queryKey: ["medidas"],
    queryFn: () => base44.entities.MedidaCaseira.list("-nome", 200),
  });

  const handleParse = async () => {
    if (!texto.trim()) { toast.error("Cole o texto da receita"); return; }
    setProcessing(true);
    try {
      const ingNames = ingredientes.map(i => i.nome).join(", ");
      const medidasInfo = medidas.filter(m => !m.ingrediente_especifico).map(m =>
        `${m.nome}: ${m.equivalencia_g}g / ${m.equivalencia_ml}ml`
      ).join("; ");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este texto de receita e extraia os dados estruturados. Converta todas as medidas caseiras para gramas ou ml usando estas equivalências: ${medidasInfo}. 
        
Ingredientes disponíveis no banco (use APENAS correspondência EXATA): ${ingNames}

Texto da receita:
${texto}

IMPORTANTE: 
- Para cada ingrediente, busque correspondência EXATA no banco acima. Se não houver correspondência exata, deixe nome_banco VAZIO e marque o nome_original corretamente — o sistema criará o ingrediente novo.
- NUNCA substitua um ingrediente por outro parecido (ex: "Ovo" NÃO é "Gema", "Filé de frango" NÃO é "Peito de frango")
- Converta xícaras, colheres, unidades para gramas/ml
- Se a receita não informar porções, sugira um valor razoável
- O modo de preparo deve manter o texto original organizado em passos numerados`,
        response_json_schema: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da receita" },
            categoria: { type: "string", enum: CATEGORIAS },
            porcoes_base: { type: "number" },
            unidade_base: { type: "string", enum: ["g", "ml"] },
            modo_preparo: { type: "string" },
            ingredientes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome_original: { type: "string", description: "Nome como aparece no texto" },
                  nome_banco: { type: "string", description: "Nome mais próximo no banco de ingredientes" },
                  pre_preparo: { type: "string" },
                  quantidade_g: { type: "number", description: "Quantidade em gramas ou ml" },
                  medida_original: { type: "string", description: "Medida como aparece no texto (ex: 2 xícaras)" }
                }
              }
            }
          }
        }
      });
      setParsed(result);
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateIngrediente = (idx, field, value) => {
    const novos = [...(parsed.ingredientes || [])];
    novos[idx] = { ...novos[idx], [field]: value };
    setParsed({ ...parsed, ingredientes: novos });
  };

  const removeIngrediente = (idx) => {
    const novos = (parsed.ingredientes || []).filter((_, i) => i !== idx);
    setParsed({ ...parsed, ingredientes: novos });
  };

  const temZero = (parsed?.ingredientes || []).some(ing => (ing.quantidade_g || 0) === 0);

  const handleSave = async () => {
    if (!parsed) return;
    if (temZero) { toast.error("Preencha a quantidade de todos os ingredientes antes de salvar."); return; }
    setSaving(true);
    try {
      const passosFormatados = formatarModoPreparo(parsed.modo_preparo);
      const modoPreparoFinal = juntarPassos(passosFormatados);

      const existingRec = await base44.entities.Receita.filter({ nome: parsed.nome?.toUpperCase() });
      const dup = existingRec.length > 0;

      const catFinal = parsed.categoria || "A Revisar";
      const receita = await base44.entities.Receita.create({
        nome: parsed.nome?.toUpperCase(),
        categoria: catFinal,
        revisar: dup,
        porcoes_base: parsed.porcoes_base || 4,
        unidade_base: parsed.unidade_base || "g",
        modo_preparo: modoPreparoFinal,
        rendimento_total: 0,
        custo_total: 0,
        custo_por_porcao: 0,
      });

      if (dup) toast.warning("Receita duplicada — marcada para revisão");

      // Link ingredients
      for (let i = 0; i < (parsed.ingredientes || []).length; i++) {
        const ing = parsed.ingredientes[i];
        // Find matching ingredient in bank — exact match only
        let matchedIng = null;
        if (ing.nome_banco) {
          matchedIng = ingredientes.find(
            bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase()
          );
        }
        // If not found, create it with nome_original
        if (!matchedIng) {
          const nomeCriar = ing.nome_banco || ing.nome_original;
          // Check if it already exists in the DB (maybe created since fetch)
          const existente = await base44.entities.Ingrediente.filter({ nome: nomeCriar });
          if (existente.length > 0) {
            matchedIng = existente[0];
          } else {
            matchedIng = await base44.entities.Ingrediente.create({
              nome: nomeCriar,
              categoria: "A Revisar",
              unidade_compra: "KG",
              peso_embalagem_g: 1000,
              preco_embalagem_rs: 0,
              preco_por_g_rs: 0,
              fator_correcao: 1.0,
            });
          }
        }
        const qtdPorPorcao = (ing.quantidade_g || 0) / (parsed.porcoes_base || 4);
        await base44.entities.IngredienteReceita.create({
          receita_id: receita.id,
          ingrediente_id: matchedIng.id,
          ingrediente_nome: matchedIng.nome,
          pre_preparo: ing.pre_preparo || "",
          quantidade_por_porcao: qtdPorPorcao,
          medida_caseira: ing.medida_original || "",
          ordem: i,
        });
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success("Receita importada com sucesso!");
      onCreated(receita.id);
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Importar Receita com IA
          </DialogTitle>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole o texto completo da receita (da internet, PDF ou anotação) e a IA vai estruturar automaticamente.
            </p>
            <Textarea
              rows={10}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o texto da receita..."
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={processing}>
                {processing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Estruturar Receita</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Revise os dados antes de salvar</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={parsed.nome || ""} onChange={(e) => setParsed({ ...parsed, nome: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <CategoriaPicker value={parsed.categoria} onChange={(v) => setParsed({ ...parsed, categoria: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porções</Label>
                <Input type="number" value={parsed.porcoes_base || 4} onChange={(e) => setParsed({ ...parsed, porcoes_base: parseInt(e.target.value) || 4 })} />
              </div>
              <div>
                <Label>Unidade base</Label>
                <Select value={parsed.unidade_base || "g"} onValueChange={(v) => setParsed({ ...parsed, unidade_base: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramas</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredientes identificados</Label>
                {temZero && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Preencha as quantidades faltantes
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(parsed.ingredientes || []).map((ing, idx) => {
                  const found = ingredientes.find(bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase());
                  const isZero = (ing.quantidade_g || 0) === 0;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border text-sm ${isZero ? "bg-amber-50 border-amber-300" : "bg-card"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {found ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className="font-medium truncate">{ing.nome_banco || ing.nome_original}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-5 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {ing.medida_original} →
                          </span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className={`h-6 w-20 text-xs text-center ${isZero ? "border-amber-400" : ""}`}
                              value={ing.quantidade_g || ""}
                              placeholder="0"
                              onChange={(e) => updateIngrediente(idx, "quantidade_g", parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-xs text-muted-foreground">g</span>
                          </div>
                          {isZero && (
                            <span className="text-xs text-amber-600 font-medium">Informe a quantidade</span>
                          )}
                          {ing.pre_preparo && <span className="text-xs text-muted-foreground">· {ing.pre_preparo}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!found && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Novo</span>}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeIngrediente(idx)}>
                          <AlertCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Modo de preparo</Label>
              <Textarea rows={4} value={parsed.modo_preparo || ""} onChange={(e) => setParsed({ ...parsed, modo_preparo: e.target.value })} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsed(null)}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving || temZero}>
                {saving ? "Salvando..." : "Salvar Receita"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}