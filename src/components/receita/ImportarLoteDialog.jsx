import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";

export default function ImportarLoteDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name?.split(".").pop()?.toLowerCase();
    if (!["csv", "pdf", "docx"].includes(ext)) {
      toast.error("Formato não suportado. Use .csv, .pdf ou .docx");
      return;
    }
    setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
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
          receitasExtraidas = Array.isArray(result.output) ? result.output : (result.output.items || []);
        }
      } else {
        // PDF or DOCX — use LLM to extract recipes
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
        }));
      }

      if (receitasExtraidas.length === 0) {
        toast.error("Nenhuma receita encontrada no arquivo.");
        setImporting(false);
        return;
      }

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
        };
        const existingItem = existingMap[nome.toLowerCase()];
        if (existingItem) {
          const { id, created_date, updated_date, created_by_id, ...rest } = payload;
          await base44.entities.Receita.update(existingItem.id, { ...rest, revisar: true });
          updated++;
        } else {
          await base44.entities.Receita.create({ ...payload, revisar: false });
          created++;
        }
      }
      toast.success(`Importação concluída! ${created} criadas, ${updated} atualizadas, ${skipped} ignoradas.`);
      qc.invalidateQueries({ queryKey: ["receitas"] });
      onClose();
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Importar receitas em lote</DialogTitle>
          <DialogDescription>
            Importe planilhas .csv ou arquivos .pdf e .docx com múltiplas receitas de uma vez.
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
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
              <p className="text-[10px] text-muted-foreground/70 mt-1">Formatos aceitos: .csv, .pdf, .docx</p>
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

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Importar</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}