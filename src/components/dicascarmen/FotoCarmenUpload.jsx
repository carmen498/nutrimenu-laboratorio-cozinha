import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { uploadImagemSeguro } from "@/lib/securityHardening";

export default function FotoCarmenUpload() {
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);

  const { data: configs = [] } = useQuery({
    queryKey: ["configuracao-carmen"],
    queryFn: () => base44.entities.ConfiguracaoCarmen.list("", 1),
  });
  const config = configs[0];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    try {
      const fileUrl = await uploadImagemSeguro(base44, file);
      if (config) {
        await base44.entities.ConfiguracaoCarmen.update(config.id, { foto_url: fileUrl });
      } else {
        await base44.entities.ConfiguracaoCarmen.create({ foto_url: fileUrl });
      }
      qc.invalidateQueries({ queryKey: ["configuracao-carmen"] });
    } catch (err) {
      toast.error(err?.message || "Erro ao enviar foto");
    } finally {
      setEnviando(false);
      e.target.value = "";
    }
  };

  return (
    <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
      <Label className="mb-2 block text-sm font-semibold" style={{ color: "#2A4E3D" }}>
        Foto da Carmen (banner "Dicas da Carmen")
      </Label>
      <div className="flex items-center gap-3">
        <div
          className="w-16 h-24 rounded-md overflow-hidden border flex items-center justify-center shrink-0"
          style={{ borderColor: "#E8E0D5", background: "#F9F6F0" }}
        >
          {config?.foto_url ? (
            <img src={config.foto_url} alt="Carmen" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <label
          className="text-xs font-semibold px-3 py-2 rounded-md border cursor-pointer inline-flex items-center gap-1.5"
          style={{ borderColor: "#2A4E3D", color: "#2A4E3D" }}
        >
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
          {enviando ? "Enviando..." : "Trocar foto"}
          <input type="file" accept="image/jpeg,image/png" onChange={handleUpload} className="hidden" />
        </label>
        <p className="text-xs text-muted-foreground">JPG ou PNG, retrato, mín. 600×1000px.</p>
      </div>
    </Card>
  );
}