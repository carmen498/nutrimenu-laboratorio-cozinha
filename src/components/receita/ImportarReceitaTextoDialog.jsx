import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, AlertTriangle, Loader2, ClipboardPaste, ChefHat, ChevronDown, FileText, Ban } from "lucide-react";
import { toast } from "sonner";
import { CATEGORIAS } from "@/components/receita/CategoriaPicker";
import ImportarReceitaTextoItemDetail from "@/components/receita/ImportarReceitaTextoItemDetail";
import { fetchAllPages } from "@/lib/fetchAllPages";

const PLACEHOLDER = `RECEITA: CONSOMÊ DE CARNE
CATEGORIA: Sopas e Caldos
PC: 400
INGREDIENTES:
Cebola | picada | 30
Sal | temperar | 2
MODO DE PREPARO:
1. Refogar a cebola no óleo.
2. Temperar com sal.
NOTA: observação opcional

===== (opcional: cole mais receitas abaixo, cada uma com sua linha RECEITA:) =====

RECEITA: OUTRA RECEITA
...`;

async function criarReceitaDoItem(item, ingredientesById) {
  const resolvidos = item.ingredientes.filter((i) => i.resolvido);
  const pendentes = item.ingredientes.filter((i) => !i.resolvido);

  const categoriaValida = CATEGORIAS.includes(item.categoria) ? item.categoria : null;
  // Peso Bruto real = soma apenas dos ingredientes vinculados (resolvidos), pois só eles
  // geram registro IngredienteReceita — mesma base usada pelo fallback dinâmico de
  // "Quantidade Total" (rendimentoEfetivo em custoReceita.js) quando rendimento_total é null.
  const rendimentoTotal = resolvidos.reduce((acc, i) => acc + (i.quantidade_g || 0), 0);

  let notaFinal = (item.nota || "").trim();
  if (pendentes.length > 0) {
    const bloco = "Ingredientes pendentes:\n" + pendentes.map((p) =>
      `- ${p.nome_texto} (${p.quantidade_g}g${p.pre_preparo ? ", " + p.pre_preparo : ""})`
    ).join("\n");
    notaFinal = notaFinal ? notaFinal + "\n\n" + bloco : bloco;
  }

  const custoTotal = resolvidos.reduce((acc, i) => {
    const ing = ingredientesById[i.ingrediente_id];
    if (!ing) return acc;
    const fc = ing.fator_correcao || 1;
    return acc + (i.quantidade_g || 0) * fc * (ing.preco_por_g_rs || 0);
  }, 0);
  const custoTotalRounded = parseFloat(custoTotal.toFixed(2));

  const pcRecomendado = item.porcao || 0;
  const nPorcoes = pcRecomendado > 0 && rendimentoTotal > 0 ? rendimentoTotal / pcRecomendado : 1;
  const custoPorPorcaoRounded = parseFloat((custoTotalRounded / nPorcoes).toFixed(2));

  const receita = await base44.entities.Receita.create({
    nome: item.nome.toUpperCase(),
    categorias: categoriaValida ? [categoriaValida] : [],
    revisar: false,
    porcoes_base: 1,
    unidade_base: "g",
    rendimento_total: null,
    per_capita_g: item.porcao || null,
    modo_preparo: item.modo_preparo || "",
    nota: notaFinal,
    custo_total: custoTotalRounded,
    custo_por_porcao: custoPorPorcaoRounded,
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

  return { receita, vinculados: resolvidos.length, pendentes };
}

export default function ImportarReceitaTextoDialog({ open, onClose, onCreated }) {
  const [texto, setTexto] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [parsedList, setParsedList] = useState(null); // array of { ...receita, selecionada, expanded }
  const [creating, setCreating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const reset = () => {
    setTexto("");
    setParsedList(null);
    setReport(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setTexto(ev.target.result || ""); setError(""); };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleAnalisar = async () => {
    if (!texto.trim()) {
      setError("Cole o texto ou selecione um arquivo .txt para continuar.");
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
      setParsedList(data.receitas.map((r) => ({
        ...r,
        selecionada: !r.erro && !r.existe,
        expanded: false,
      })));
    } catch (err) {
      setError("Erro ao analisar: " + (err?.response?.data?.error || err?.message || "erro desconhecido"));
    } finally {
      setAnalisando(false);
    }
  };

  const toggleSelecionada = (idx) => {
    setParsedList((prev) => prev.map((it, i) => (i === idx ? { ...it, selecionada: !it.selecionada } : it)));
  };

  const toggleExpanded = (idx) => {
    setParsedList((prev) => prev.map((it, i) => (i === idx ? { ...it, expanded: !it.expanded } : it)));
  };

  const handleCriarSelecionadas = async () => {
    if (!parsedList) return;
    setCreating(true);
    try {
      const ingredientesDb = await fetchAllPages(base44.entities.Ingrediente, "-nome");
      const ingredientesById = {};
      ingredientesDb.forEach((ing) => { ingredientesById[ing.id] = ing; });

      const criadas = [];
      const puladas = [];
      for (const item of parsedList) {
        if (item.erro) {
          puladas.push({ nome: item.nome, motivo: item.erro });
          continue;
        }
        if (item.existe) {
          puladas.push({ nome: item.nome, motivo: "já existe" });
          continue;
        }
        if (!item.selecionada) {
          puladas.push({ nome: item.nome, motivo: "não selecionada" });
          continue;
        }
        const result = await criarReceitaDoItem(item, ingredientesById);
        criadas.push({ nome: item.nome, id: result.receita.id, vinculados: result.vinculados, pendentes: result.pendentes });
      }
      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      setReport({ total: parsedList.length, criadas, puladas });
    } catch (err) {
      toast.error("Erro ao criar receitas: " + (err.message || err));
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
        {!parsedList && !report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-primary" /> Importar formato padrão (PC:)
              </DialogTitle>
              <DialogDescription>
                Arquivo .txt no formato padrão: RECEITA:/CATEGORIA:/PC:/INGREDIENTES:/MODO DE PREPARO: — importação exata, sem IA.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={14}
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setError(""); }}
              placeholder={PLACEHOLDER}
              className="text-sm font-mono"
            />
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".txt" className="hidden" onChange={handleFileChange} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-1" /> Carregar arquivo .txt
              </Button>
            </div>
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

        {parsedList && !report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Prévia da importação</DialogTitle>
              <DialogDescription>
                {parsedList.length} receita{parsedList.length > 1 ? "s" : ""} encontrada{parsedList.length > 1 ? "s" : ""} no texto. Revise e selecione o que deseja criar.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {parsedList.map((item, idx) => {
                const resolvidosCount = item.ingredientes.filter((i) => i.resolvido).length;
                const pendentesCount = item.ingredientes.filter((i) => !i.resolvido).length;
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5">
                      <Checkbox
                        checked={item.selecionada}
                        disabled={!!item.erro || item.existe}
                        onCheckedChange={() => toggleSelecionada(idx)}
                      />
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-2 min-w-0 text-left"
                        onClick={() => toggleExpanded(idx)}
                      >
                        <span className="font-medium text-sm truncate">{item.nome}</span>
                        {item.erro ? (
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 shrink-0">
                            <Ban className="w-3 h-3 mr-1" /> {item.erro}
                          </Badge>
                        ) : (
                          <>
                            {item.existe && (
                              <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700 shrink-0">já existe</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 shrink-0">{resolvidosCount} resolvidos</Badge>
                            {pendentesCount > 0 && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 shrink-0">{pendentesCount} pendentes</Badge>
                            )}
                          </>
                        )}
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 ml-auto transition-transform ${item.expanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    {item.expanded && !item.erro && (
                      <div className="px-2.5 pb-2.5 border-t">
                        <ImportarReceitaTextoItemDetail item={item} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsedList(null)}>Voltar</Button>
              <Button onClick={handleCriarSelecionadas} disabled={creating || !parsedList.some((i) => i.selecionada)}>
                {creating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Criando...</> : "Criar selecionadas"}
              </Button>
            </div>
          </>
        )}

        {report && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" /> Relatório da importação
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/40 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{report.total}</p>
                  <p className="text-xs text-muted-foreground">No texto</p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">{report.criadas.length}</p>
                  <p className="text-xs text-green-600">Criadas</p>
                </div>
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-center">
                  <p className="text-2xl font-bold text-slate-700">{report.puladas.length}</p>
                  <p className="text-xs text-slate-600">Puladas</p>
                </div>
              </div>

              {report.criadas.some((c) => c.pendentes.length > 0) && (
                <div className="text-xs space-y-1.5">
                  <p className="font-medium text-muted-foreground">Pendências por receita (salvas na nota):</p>
                  {report.criadas.filter((c) => c.pendentes.length > 0).map((c, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-200 rounded p-1.5">
                      <p className="font-medium text-amber-800">{c.nome}</p>
                      {c.pendentes.map((p, j) => (
                        <p key={j} className="text-amber-700 pl-2">- {p.nome_texto} ({p.quantidade_g}g)</p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {report.puladas.length > 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Puladas:</p>
                  {report.puladas.map((p, i) => (
                    <p key={i} className="bg-slate-100 px-2 py-0.5 rounded">{p.nome} — {p.motivo}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              {report.criadas.length === 1 && (
                <Button onClick={() => { const id = report.criadas[0].id; handleClose(); onCreated(id); }}>
                  Abrir receita
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}