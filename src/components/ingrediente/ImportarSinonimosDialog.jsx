import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle, AlertTriangle, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ImportarSinonimosDialog({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importarSinonimosCsv", { file_url });
      setResult(res.data);
      if (res.data.criados > 0) {
        toast.success(`${res.data.criados} sinônimo(s) criado(s)`);
      }
    } catch (err) {
      toast.error("Erro na importação: " + (err.message || ""));
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !result) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display">Importar Sinônimos (CSV)</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {!result ? (
            <>
              <p className="text-sm text-muted-foreground">
                Formato: colunas <code className="text-xs bg-muted px-1 rounded">ingrediente_nome</code> e{" "}
                <code className="text-xs bg-muted px-1 rounded">sinonimo</code> (UTF-8, vírgula como separador,
                campos com vírgula entre aspas).
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                O ingrediente é localizado por nome exato (somente leitura). Sinônimos duplicados
                (em qualquer ingrediente) são ignorados. Nenhum dado do ingrediente é alterado.
              </p>
              <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} className="mt-3" />
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-! p-3 bg-muted/50 rounded-lg">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{result.total_linhas}</p>
                  <p className="text-xs text-muted-foreground">Total no arquivo</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{result.criados}</p>
                  <p className="text-xs text-green-600">Criados</p>
                </div>
                <div className="flex flex-col items-center gap-1 p-3 bg-amber-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <p className="text-2xl font-bold text-amber-700">{result.ignorados}</p>
                  <p className="text-xs text-amber-600">Ignorados (já existem)</p>
                </div>
              </div>

              {result.rejeitados.length > 0 ? (
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
                          <th className="text-left p-2">Ingrediente</th>
                          <th className="text-left p-2">Sinônimo</th>
                          <th className="text-left p-2">Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rejeitados.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-muted-foreground">{item.linha}</td>
                            <td className="p-2">{item.ingrediente_nome || "—"}</td>
                            <td className="p-2 text-muted-foreground">{item.sinonimo || "—"}</td>
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
          {!result ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importando..." : "Importar"}
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