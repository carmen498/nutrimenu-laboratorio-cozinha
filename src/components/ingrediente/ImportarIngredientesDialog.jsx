import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, RefreshCw, XCircle, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadArquivoSeguro, validarCsvUpload } from "@/lib/securityHardening";

/** @param {{ open: any, onClose: () => void, onImported?: () => void }} props */
export default function ImportarIngredientesDialog(props) {
  const { open, onClose, onImported = () => {} } = props;
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleImport = async () => {
    if (!file) {
      setError("Selecione um arquivo CSV primeiro.");
      return;
    }
    setImporting(true);
    setResult(null);
    setError(null);
    setProgressMsg("Enviando arquivo...");

    let file_url;
    try {
      file_url = await uploadArquivoSeguro(base44, file, validarCsvUpload);
    } catch (err) {
      const msg = "Falha ao enviar arquivo: " + (err?.message || "erro desconhecido");
      setError(msg);
      toast.error(msg);
      setImporting(false);
      setProgressMsg("");
      return;
    }

    setProgressMsg("Processando linhas...");
    try {
      const res = await base44.functions.invoke("importarIngredientesCsv", { file_url });
      const data = res.data;
      if (!data || typeof data !== "object") {
        throw new Error("Resposta inválida da função de importação.");
      }
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data);
      if (data.criados > 0 || data.atualizados > 0) {
        toast.success(`${data.criados} criado(s), ${data.atualizados} atualizado(s)`);
      }
      onImported();
    } catch (err) {
      const msg = "Erro no processamento: " + (err?.response?.data?.error || err?.message || "erro desconhecido");
      setError(msg);
      toast.error(msg);
    } finally {
      setImporting(false);
      setProgressMsg("");
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setImporting(false);
    setProgressMsg("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !result) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display">Importar Ingredientes (CSV)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {!result && !error ? (
            <>
              <p className="text-sm text-muted-foreground">
                Colunas: <code className="text-xs bg-muted px-1 rounded">nome</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">categoria</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">unidade_compra</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">peso_embalagem_g</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">preco_embalagem_rs</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">preco_por_g_rs</code>,{" "}
                <code className="text-xs bg-muted px-1 rounded">fator_correcao</code>{" "}
                (UTF-8 com ou sem BOM, vírgula como separador).
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Ingredientes existentes (por nome exato) são atualizados com os valores do arquivo;
                nomes não encontrados são criados.
              </p>
              <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="mt-3" />
              {file && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Upload className="w-3 h-3" /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
              {importing && progressMsg && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-muted/50 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-primary font-medium">{progressMsg}</span>
                </div>
              )}
            </>
          ) : error ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Erro na importação</p>
                  <p className="text-xs text-red-600 mt-1 break-words">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{result.total_linhas}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{result.criados}</p>
                  <p className="text-xs text-green-600">Criados</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-blue-50 rounded-lg">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <p className="text-2xl font-bold text-blue-700">{result.atualizados}</p>
                  <p className="text-xs text-blue-600">Atualizados</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-amber-50 rounded-lg">
                  <XCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-2xl font-bold text-amber-700">{result.rejeitados?.length || 0}</p>
                  <p className="text-xs text-amber-600">Rejeitados</p>
                </div>
              </div>

              {result.rejeitados?.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-semibold text-red-700">
                      Rejeitados ({result.rejeitados.length})
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2">Linha</th>
                          <th className="text-left p-2">Nome</th>
                          <th className="text-left p-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rejeitados.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-muted-foreground">{item.linha}</td>
                            <td className="p-2">{item.nome || "—"}</td>
                            <td className="p-2 text-red-600">{item.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma linha rejeitada.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0">
          {!result && !error ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progressMsg || "Importando..."}
                  </>
                ) : "Importar"}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fechar</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}