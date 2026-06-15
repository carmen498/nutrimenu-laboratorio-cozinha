import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, FileText, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";

const STEPS = { UPLOAD: "upload", VALIDATING: "validating", ERROR: "error", PARTIAL: "partial", IMPORTING: "importing" };

export default function ImportarLoteDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [step, setStep] = useState(STEPS.UPLOAD);
  const [validated, setValidated] = useState({ receitas: [], invalidos: 0 });
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const reset = () => {
    setFile(null);
    setStep(STEPS.UPLOAD);
    setValidated({ receitas: [], invalidos: 0 });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name?.split(".").pop()?.toLowerCase();
    if (!["csv", "pdf", "docx"].includes(ext)) {
      toast.error("Formato não suportado. Use .csv, .pdf ou .docx");
      return;
    }
    setFile(f);
    setStep(STEPS.UPLOAD);
    setValidated({ receitas: [], invalidos: 0 });
  };

  const handleValidateAndImport = async () => {
    if (!file) return;
    setStep(STEPS.VALIDATING);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const ext = file.name?.split(".").pop()?.toLowerCase();

      let receitasExtraidas = [];

      if (ext === "csv") {
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nome_receita: { type: "string" },
                categoria: { type: "string" },
                porcoes_base: { type: "number" },
                rendimento_g: { type: "number" },
                modo_preparo: { type: "string" },
              }
            }
          }
        });
        if (result.status === "success" && result.output) {
          const arr = Array.isArray(result.output) ? result.output : (result.output.items || []);
          // Filter entries that at least have a nome_receita
          receitasExtraidas = arr.filter(item => (item.nome_receita || "").trim());
        }
      } else {
        const llmResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Analise este arquivo e extraia TODAS as receitas encontradas nele. Para cada receita, retorne: nome, categoria (no formato "Grupo, Subcategoria"), porcoes_base, rendimento_g, modo_preparo. Se houver múltiplas receitas, retorne todas em um array. Se não houver receitas claras, retorne array vazio.`,
          file_urls: [file_url],
          response_json_schema: {
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
                  }
                }
              }
            }
          }
        });
        receitasExtraidas = (llmResult.receitas || []).map(r => ({
          nome_receita: r.nome,
          categoria: r.categoria,
          porcoes_base: r.porcoes_base,
          rendimento_g: r.rendimento_g,
          modo_preparo: r.modo_preparo,
        })).filter(item => (item.nome_receita || "").trim());
      }

      // Validate: at least one recipe must be found
      if (receitasExtraidas.length === 0) {
        setStep(STEPS.ERROR);
        return;
      }

      // Check if CSV had total entries vs valid entries
      const totalExtraido = ext === "csv"
        ? (await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: { type: "array", items: { type: "object", properties: { nome_receita: { type: "string" } } } }
          }).then(r => {
            if (r.status === "success" && r.output) {
              const arr = Array.isArray(r.output) ? r.output : (r.output.items || []);
              return arr.length;
            }
            return receitasExtraidas.length;
          }).catch(() => receitasExtraidas.length))
        : receitasExtraidas.length;

      const invalidos = totalExtraido - receitasExtraidas.length;

      if (invalidos > 0) {
        setValidated({ receitas: receitasExtraidas, invalidos });
        setStep(STEPS.PARTIAL);
      } else {
        // All valid — proceed directly to import
        await doImport(receitasExtraidas);
      }
    } catch (err) {
      toast.error("Erro na validação: " + err.message);
      setStep(STEPS.UPLOAD);
    }
  };

  const doImport = async (receitasExtraidas) => {
    setStep(STEPS.IMPORTING);
    try {
      const existing = await base44.entities.Receita.list("-nome", 500);
      const existingMap = {};
      existing.forEach((r) => { existingMap[r.nome?.toLowerCase().trim()] = r; });

      let created = 0, updated = 0, skipped = 0;
      for (const item of receitasExtraidas) {
        const nome = (item.nome_receita || "").trim();
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
        const existingItem = existingMap[nome.toLowerCase()];
        if (existingItem) {
          await base44.entities.Receita.update(existingItem.id, { ...payload, revisar: true });
          updated++;
        } else {
          await base44.entities.Receita.create(payload);
          created++;
        }
      }
      toast.success(`Importação concluída! ${created} criadas, ${updated} atualizadas, ${skipped} ignoradas.`);
      qc.invalidateQueries({ queryKey: ["receitas"] });
      handleClose();
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
      setStep(STEPS.PARTIAL);
    }
  };

  const handleImportOnlyValid = async () => {
    await doImport(validated.receitas);
  };

  const formatInstructions = (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-accent/50 transition-colors"
        onClick={() => setShowFormat(!showFormat)}
      >
        <span className="flex items-center gap-1.5">
          {showFormat ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Ver formato esperado
        </span>
      </button>
      {showFormat && (
        <div className="px-4 pb-4 space-y-3 text-sm text-muted-foreground border-t">
          <p className="font-semibold text-foreground pt-3">Seu arquivo deve seguir este formato:</p>
          <ul className="space-y-2 list-disc list-inside">
            <li>
              <strong>Nome da receita</strong> em linha isolada (ex: <code className="bg-muted px-1 rounded text-xs">Bacalhau em Camadas</code>)
            </li>
            <li>
              <strong>Ingredientes</strong> listados abaixo, um por linha, com:<br />
              <code className="bg-muted px-1 rounded text-xs">Nome do ingrediente | quantidade em gramas</code><br />
              ou <code className="bg-muted px-1 rounded text-xs">Nome do ingrediente | forma de preparo | quantidade em gramas</code><br />
              <span className="text-xs">(forma de preparo é opcional: ex: picado, dessalgado, amassado)</span>
            </li>
            <li>
              <strong>Modo de preparo:</strong> após a palavra "Modo de preparo:", com passos numerados
            </li>
            <li>Repita o mesmo padrão para cada receita no arquivo</li>
          </ul>
          <div className="flex items-center gap-4 text-xs pt-1">
            <span><strong>Formatos aceitos:</strong> <code className="bg-muted px-1 rounded">.docx</code> · <code className="bg-muted px-1 rounded">.pdf</code> · <code className="bg-muted px-1 rounded">.csv</code></span>
            <span><strong>Limite:</strong> até 50 receitas por arquivo</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderDropZone = () => (
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
            onClick={(e) => { e.stopPropagation(); setFile(null); setStep(STEPS.UPLOAD); }}
          >
            Trocar arquivo
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm font-medium">Arraste o arquivo aqui</p>
          <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">.csv, .pdf, .docx</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.pdf,.docx"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );

  const renderFooter = () => {
    switch (step) {
      case STEPS.UPLOAD:
        return (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleValidateAndImport} disabled={!file}>
              <Sparkles className="w-4 h-4 mr-1" /> Importar
            </Button>
          </div>
        );
      case STEPS.VALIDATING:
        return (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Validando...
            </Button>
          </div>
        );
      case STEPS.IMPORTING:
        return (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" disabled>Cancelar</Button>
            <Button disabled>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar receitas em lote</DialogTitle>
          <DialogDescription>
            Importe planilhas .csv ou arquivos .pdf e .docx com múltiplas receitas de uma vez.
          </DialogDescription>
        </DialogHeader>

        {/* Format instructions — always visible, collapsed by default */}
        {formatInstructions}

        {step === STEPS.ERROR ? (
          /* --- ERROR: no recipes found --- */
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                Não conseguimos identificar receitas no seu arquivo. Verifique se ele segue o formato esperado: nome da receita em linha isolada, ingredientes com quantidade, e modo de preparo numerado. Consulte "Ver formato esperado" para mais detalhes.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => { setStep(STEPS.UPLOAD); setFile(null); }}>
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : step === STEPS.PARTIAL ? (
          /* --- PARTIAL: some valid, some not --- */
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>{validated.receitas.length} receitas</strong> identificadas.{" "}
                <strong>{validated.invalidos}</strong> não puderam ser lidas — verifique o formato dessas entradas.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar tudo</Button>
              <Button onClick={handleImportOnlyValid}>
                Importar apenas {validated.receitas.length} válidas
              </Button>
            </div>
          </div>
        ) : (
          /* --- Normal upload flow --- */
          <>
            {renderDropZone()}
            {renderFooter()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}