import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Loader2, ClipboardPaste, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIAS } from "@/components/receita/CategoriaPicker";

const PLACEHOLDER = `RECEITA: CONSOMÊ DE CARNE
CATEGORIA: Sopas e Caldos
PORÇÃO: 400
INGREDIENTES:
Cebola | picada | 30
Sal | temperar | 2
MODO DE PREPARO:
1. Refogar a cebola no óleo.
2. Temperar com sal.
NOTA: observação opcional`;

export default function ImportarReceitaTextoDialog({ open, onClose, onCreated }) {
  const [texto, setTexto] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [creating, setCreating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const qc = useQueryClient();

  const reset = () => {
    setTexto("");
    setParsed(null);
    setReport(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAnalisar = async () => {
    if (!texto.trim()) {
      setError("Cole o texto da receita para continuar.");
      return;
    }
    setAnalisando(true);
    setError("");
    try {
      const res = await base44.functions.invoke("analisarReceitaTexto", { texto });
      const data = res.data;
      if (!data || data.error) {
        throw new Error(data?.error || "Resposta inválida");
      }
      setParsed(data);
    } catch (err) {
      setError("Erro ao analisar: " + (err?.response?.data?.error || err?.message || "erro desconhecido"));
    } finally {
      setAnalisando(false);
    }
  };

  const handleCriar = async () => {
    if (!parsed) return;
    setCreating(true);
    try {
      const resolvidos = parsed.ingredientes.filter(i => i.resolvido);
      const pendentes = parsed.ingredientes.filter(i => !i.resolvido);

      const categoriaValida = CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : null;
      const rendimentoTotal = parsed.ingredientes.reduce((acc, i) => acc + (i.quantidade_g || 0), 0);

      let notaFinal = (parsed.nota || "").trim();
      if (pendentes.length > 0) {
        const bloco = "Ingredientes pendentes:\n" + pendentes.map(p =>
          `- ${p.nome_texto} (${p.quantidade_g}g${p.pre_preparo ? ", " + p.pre_preparo : ""})`
        ).join("\n");
        notaFinal = notaFinal ? notaFinal + "\n\n" + bloco : bloco;
      }

      const receita = await base44.entities.Receita.create({
        nome: parsed.nome.toUpperCase(),
        categorias: categoriaValida ? [categoriaValida] : [],
        revisar: !categoriaValida,
        porcoes_base: 1,
        unidade_base: "g",
        rendimento_total: rendimentoTotal,
        per_capita_g: parsed.porcao || null,
        modo_preparo: parsed.modo_preparo || "",
        nota: notaFinal,
        custo_total: 0,
        custo_por_porcao: 0,
      });

      for (let i = 0; i < resolvidos.length; i++) {
        const ing = resolvidos[i];
        await base44.entities.IngredienteReceita.create({
          receita_id: receita.id,
          tipo: "ingrediente",
          ingrediente_id: ing.ingrediente_id,
          ingrediente_nome: ing.ingrediente_nome,
          pre_preparo: ing.pre_preparo || "",
          quantidade_por_porcao: ing.quantidade_g,
          ordem: i * 10,
        });
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      setReport({ receita, vinculados: resolvidos.length, pendentes });
    } catch (err) {
      toast.error("Erro ao criar receita: " + (err.message || err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !report) handleClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => { if (report) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (report) e.preventDefault(); }}
      >
        {!parsed && !report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-primary" /> Importar Receita (colar texto)
              </DialogTitle>
              <DialogDescription>
                Cole o texto no formato estruturado (RECEITA, CATEGORIA, PORÇÃO, INGREDIENTES, MODO DE PREPARO, NOTA).
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={14}
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setError(""); }}
              placeholder={PLACEHOLDER}
              className="text-sm font-mono"
            />
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleAnalisar} disabled={analisando}>
                {analisando ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analisando...</> : "Analisar"}
              </Button>
            </div>
          </>
        )}

        {parsed && !report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Prévia da importação</DialogTitle>
              <DialogDescription>Revise antes de criar a receita.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-semibold">{parsed.nome}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <p className="font-semibold">{CATEGORIAS.includes(parsed.categoria) ? parsed.categoria : (parsed.categoria || "— (Revisar)")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Porção</p>
                  <p className="font-semibold">{parsed.porcao ? `${parsed.porcao}g` : "—"}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-semibold">Ingredientes</p>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    {parsed.ingredientes.filter(i => i.resolvido).length} resolvidos
                  </Badge>
                  {parsed.ingredientes.some(i => !i.resolvido) && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                      {parsed.ingredientes.filter(i => !i.resolvido).length} pendentes
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto border rounded-lg p-2">
                  {parsed.ingredientes.map((ing, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-1.5 rounded text-sm ${ing.resolvido ? "bg-green-50" : "bg-amber-50 border border-amber-200"}`}
                    >
                      {ing.resolvido ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      <span className="flex-1">
                        {ing.resolvido ? (
                          <>
                            <span className="font-medium">{ing.ingrediente_nome}</span>
                            {ing.ingrediente_nome.toLowerCase() !== ing.nome_texto.toLowerCase() && (
                              <span className="text-xs text-muted-foreground"> (de "{ing.nome_texto}"{ing.via_sinonimo ? " · via sinônimo" : ""})</span>
                            )}
                          </>
                        ) : (
                          <span className="font-medium text-amber-800">{ing.nome_texto} — não encontrado</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{ing.quantidade_g}g</span>
                      {ing.pre_preparo && <span className="text-xs text-muted-foreground italic shrink-0">({ing.pre_preparo})</span>}
                    </div>
                  ))}
                </div>
              </div>

              {parsed.modo_preparo && (
                <div>
                  <p className="text-sm font-semibold mb-1">Modo de preparo</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-line bg-muted/40 p-2 rounded-lg">{parsed.modo_preparo}</p>
                </div>
              )}

              {parsed.nota && (
                <div>
                  <p className="text-sm font-semibold mb-1">Nota</p>
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg">{parsed.nota}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsed(null)}>Voltar</Button>
              <Button onClick={handleCriar} disabled={creating}>
                {creating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Criando...</> : "Criar receita"}
              </Button>
            </div>
          </>
        )}

        {report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" /> Receita importada
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm">
                <strong>{report.receita.nome}</strong> foi criada com sucesso.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{report.vinculados}</p>
                  <p className="text-xs text-green-600">Ingredientes vinculados</p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-amber-700">{report.pendentes.length}</p>
                  <p className="text-xs text-amber-600">Pendentes</p>
                </div>
              </div>
              {report.pendentes.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Pendentes (salvos na nota da receita):</p>
                  {report.pendentes.map((p, i) => (
                    <p key={i} className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{p.nome_texto} — {p.quantidade_g}g</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => { const id = report.receita.id; handleClose(); onCreated(id); }}>
                Abrir receita
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}