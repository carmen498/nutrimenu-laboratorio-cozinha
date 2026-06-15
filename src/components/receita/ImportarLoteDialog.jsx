import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Sparkles, FileText, ClipboardPaste, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";

const TABS = { PASTE: "paste", FILE: "file" };

const RECIPE_EXTRACTION_PROMPT = `
Analise este conteúdo e extraia TODAS as receitas encontradas.

O conteúdo pode vir de uma tabela Word convertida para texto corrido com este padrão:

Nome da receita: [NOME]
Ingredientes Pré-preparo Qtd. 1 porção
[ingrediente] [pré-preparo opcional] [número]
[ingrediente] [número]
Modo de preparo:
1. [passo]
2. [passo]
Nome da receita: [PRÓXIMA]

REGRAS DE EXTRAÇÃO:

1. SEPARADOR DE RECEITAS: cada "Nome da receita:" inicia uma nova receita. Tudo até o próximo "Nome da receita:" pertence a essa receita.

2. CABEÇALHOS A IGNORAR: linhas como "Ingredientes", "Pré-preparo", "Qtd.", "Qtd. 1 porção", "Ingredientes Pré-preparo Qtd. 1 porção" são cabeçalhos de tabela — NÃO são ingredientes.

3. SUB-TÍTULOS: linhas em CAIXA ALTA isoladas (ex: "FARINHAS DO EMPANADO"), linhas terminadas em ":" (ex: "Fritar:", "Misturar ao molho:", "SEPARADO:"), ou linhas curtas sem número no final e sem ser o nome da receita — tratar como sub-título de grupo (tipo: "grupo").

4. LINHA DE INGREDIENTE: qualquer linha com um número no final. O número é a quantidade em gramas (substitua vírgula por ponto: "250,00" → 250, "5,00" → 5). O texto antes é o nome + pré-preparo opcional. Ex: "Farinha de trigo 250,00" → nome="Farinha de trigo", quantidade_g=250. Ex: "Cebola picada 150,00" → nome="Cebola", pre_preparo="picada", quantidade_g=150.

5. MODO DE PREPARO: tudo após "Modo de preparo:" até o próximo "Nome da receita:" ou fim do conteúdo. Reescreva no padrão: uma ação por linha numerada, verbo no imperativo direto (Derreta, Acrescente, Bata, Asse), sem repetir ingredientes.

6. QUANTIDADE: sempre em gramas, converta vírgula para ponto. Ex: "250,00" → 250, "0,01" → 0.01.

7. CATEGORIA: deduza do nome e ingredientes (ex: "Carnes, Bovina", "Confeitaria, Doces e Docinhos", "Acompanhamentos, Arroz e Risotos"). Se incerto, use string vazia.

Retorne TODAS as receitas, mesmo que muitas. Se não houver receitas claras, retorne array vazio.
`;

export default function ImportarLoteDialog({ open, onClose }) {
  const [tab, setTab] = useState(TABS.PASTE);
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const reset = () => {
    setTexto("");
    setFile(null);
    setError(false);
    setResult(null);
    setLoading(false);
    setImporting(false);
  };

  const handleClose = () => {
    reset();
    setTab(TABS.PASTE);
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name?.split(".").pop()?.toLowerCase();
    if (!["docx", "pdf", "txt"].includes(ext)) {
      toast.error("Formato não suportado. Use .docx, .pdf ou .txt");
      return;
    }
    setFile(f);
    setError(false);
    setResult(null);
  };

  const handleIdentify = async () => {
    if (tab === TABS.PASTE && !texto.trim()) { toast.error("Cole o texto da receita"); return; }
    if (tab === TABS.FILE && !file) { toast.error("Selecione um arquivo"); return; }

    setLoading(true);
    setError(false);
    setResult(null);

    try {
      let receitasExtraidas = [];

      const responseSchema = {
        type: "object",
        properties: {
          receitas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome: { type: "string" },
                categoria: { type: "string" },
                porcoes_base: { type: "number" },
                rendimento_g: { type: "number" },
                modo_preparo: { type: "string" },
                ingredientes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nome: { type: "string" },
                      pre_preparo: { type: "string" },
                      quantidade_g: { type: "number" },
                      tipo: { type: "string", enum: ["ingrediente", "grupo"] }
                    }
                  }
                }
              }
            }
          }
        }
      };

      if (tab === TABS.PASTE) {
        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: RECIPE_EXTRACTION_PROMPT + `\nConteúdo:\n${texto}`,
          response_json_schema: responseSchema,
          model: "gemini_3_flash"
        });
        receitasExtraidas = (llmResult.receitas || []).filter(r => (r.nome || "").trim());
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: RECIPE_EXTRACTION_PROMPT,
          file_urls: [file_url],
          response_json_schema: responseSchema,
          model: "gemini_3_flash"
        });
        receitasExtraidas = (llmResult.receitas || []).filter(r => (r.nome || "").trim());
      }

      if (receitasExtraidas.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }

      setResult({ receitas: receitasExtraidas });
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!result?.receitas?.length) return;
    setImporting(true);
    try {
      // Load all existing ingredients for matching
      const existingIngredientes = await base44.entities.Ingrediente.list("-nome", 2000);
      const ingredienteMap = {};
      existingIngredientes.forEach(ing => {
        const key = ing.nome?.toLowerCase().trim();
        if (key) ingredienteMap[key] = ing;
      });

      // Load existing recipes for duplicate detection
      const existingReceitas = await base44.entities.Receita.list("-nome", 500);
      const receitaMap = {};
      existingReceitas.forEach(r => { receitaMap[r.nome?.toLowerCase().trim()] = r; });

      let created = 0, updated = 0, skipped = 0;

      for (const item of result.receitas) {
        const nome = (item.nome || "").trim();
        if (!nome) { skipped++; continue; }

        const modoPreparo = item.modo_preparo
          ? juntarPassos(formatarModoPreparo(item.modo_preparo))
          : "";

        const payload = {
          nome: nome.toUpperCase(),
          categoria: item.categoria || "",
          porcoes_base: item.porcoes_base || 1,
          rendimento_total: item.rendimento_g || 0,
          unidade_base: "g",
          modo_preparo: modoPreparo,
          revisar: false,
        };

        let receitaId;
        const existingReceita = receitaMap[nome.toLowerCase()];
        if (existingReceita) {
          receitaId = existingReceita.id;
          await base44.entities.Receita.update(receitaId, { ...payload, revisar: true });
          // Delete old IngredienteReceita for this recipe
          const oldItems = await base44.entities.IngredienteReceita.filter({ receita_id: receitaId }, "", 200);
          for (const old of oldItems) {
            await base44.entities.IngredienteReceita.delete(old.id);
          }
          updated++;
        } else {
          const newReceita = await base44.entities.Receita.create(payload);
          receitaId = newReceita.id;
          created++;
        }

        // Create IngredienteReceita entries
        const ingredientes = item.ingredientes || [];
        let ordem = 0;
        for (const ing of ingredientes) {
          if (ing.tipo === "grupo") {
            await base44.entities.IngredienteReceita.create({
              receita_id: receitaId,
              ingrediente_id: "",
              ingrediente_nome: "",
              tipo: "grupo",
              titulo_grupo: ing.nome || "",
              ordem: ordem++,
              quantidade_por_porcao: 0,
            });
            continue;
          }

          // Match or create ingredient
          const ingNome = (ing.nome || "").trim();
          if (!ingNome) { ordem++; continue; }

          const ingKey = ingNome.toLowerCase();
          let ingId = ingredienteMap[ingKey]?.id;

          if (!ingId) {
            // Create new ingredient
            const novoIng = await base44.entities.Ingrediente.create({
              nome: ingNome,
              categoria: "A Revisar",
              unidade_compra: "KG",
              peso_embalagem_g: 1000,
              preco_embalagem_rs: 0,
              preco_por_g_rs: 0,
              fator_correcao: 1,
              revisar: false,
            });
            ingId = novoIng.id;
            ingredienteMap[ingKey] = novoIng;
          }

          const qtd = ing.quantidade_g || 0;
          await base44.entities.IngredienteReceita.create({
            receita_id: receitaId,
            ingrediente_id: ingId,
            ingrediente_nome: ingNome,
            pre_preparo: ing.pre_preparo || "",
            quantidade_por_porcao: qtd,
            tipo: "ingrediente",
            ordem: ordem++,
          });
        }
      }

      toast.success(`Importação concluída! ${created} criadas, ${updated} atualizadas, ${skipped} ignoradas.`);
      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      handleClose();
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const hasContent = tab === TABS.PASTE ? texto.trim() : file;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Importar receitas em lote</DialogTitle>
          <DialogDescription>
            Cole suas receitas ou envie um arquivo. A IA identifica e organiza tudo automaticamente.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === TABS.PASTE ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab(TABS.PASTE); setError(false); setResult(null); }}
          >
            <ClipboardPaste className="w-4 h-4" />
            Colar texto
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === TABS.FILE ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab(TABS.FILE); setError(false); setResult(null); }}
          >
            <Upload className="w-4 h-4" />
            Enviar arquivo
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-3 bg-muted rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Não encontramos receitas no conteúdo enviado. Tente colar diretamente o texto da receita.
            </p>
          </div>
        )}

        {/* Result state — show identified recipes */}
        {result && !loading && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>{result.receitas.length} receitas</strong> identificadas.
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {result.receitas.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span className="font-medium truncate">{(r.nome || "").toUpperCase() || "(sem nome)"}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{(r.ingredientes || []).length} ingr.</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResult(null); setError(false); }}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...</> : <>Importar {result.receitas.length} receitas</>}
              </Button>
            </div>
          </div>
        )}

        {/* Content area */}
        {!result && !error && (
          <>
            {tab === TABS.PASTE ? (
              <Textarea
                className="min-h-40 resize-y"
                placeholder="Cole aqui uma ou várias receitas — do jeito que estiverem, como da internet ou suas anotações."
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : file ? "border-green-300 bg-green-50/50" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              >
                {file ? (
                  <div className="space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-green-600" />
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                    <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">.docx · .pdf · .txt</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {!result && !error && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleIdentify} disabled={!hasContent || loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Identificando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Identificar Receitas</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}