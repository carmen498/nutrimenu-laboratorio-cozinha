import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ImportarMedidasDialog({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importarMedidasCaseirasCsv", { file_url });
      setResult(res.data);
      toast.success(`Importação concluída: ${res.data.criados} criados, ${res.data.ignorados} ignorados`);
      if (onImported) onImported();
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
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Importar Medidas Caseiras (CSV)</DialogTitle>
        </DialogHeader>
        {!result ? (
          <>
            <p className="text-sm text-muted-foreground">
              Colunas:{" "}
              <code className="text-xs bg-muted px-1 rounded">ingrediente_nome</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">utensilio_simbolo</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">referencia_g</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">medida_pronto_g</code>,{" "}
              <code className="text-xs bg-muted px-1 rounded">so_gramas</code>{" "}
              (UTF-8, vírgula como separador).
            </p>
            <p className="text-xs text-muted-foreground">
              O ingrediente é localizado por nome exato e o utensílio por símbolo. Apenas registros em
              MedidaCaseira são criados — nenhum outro dado é alterado.
            </p>
            <Input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={handleImport} disabled={!file || importing}>
                {importing ? "Importando..." : "Importar"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{result.criados}</p>
                  <p className="text-xs text-green-600">Criados</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-amber-700">{result.ignorados}</p>
                  <p className="text-xs text-amber-600">Ignorados (já existem)</p>
                </div>
              </div>
            </div>
            {result.naoEncontrados.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-semibold text-red-700">
                    Não encontrados ({result.naoEncontrados.length})
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-2">Linha</th>
                        <th className="text-left p-2">Ingrediente</th>
                        <th className="text-left p-2">Utensílio</th>
                        <th className="text-left p-2">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.naoEncontrados.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 text-muted-foreground">{item.linha}</td>
                          <td className="p-2">{item.ingrediente_nome}</td>
                          <td className="p-2 text-muted-foreground">{item.utensilio_simbolo}</td>
                          <td className="p-2 text-red-600">{item.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {result.naoEncontrados.length === 0 && (
              <p className="text-xs text-muted-foreground">Todos os ingredientes e utensílios foram encontrados.</p>
            )}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}