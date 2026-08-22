import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadImagemSeguro } from "@/lib/securityHardening";

const CHAVE_NOME = "empresa_nome";
const CHAVE_LOGO = "empresa_logo_url";

async function getConfig(chave) {
  const rows = await base44.entities.AppConfig.filter({ chave });
  return rows[0] || null;
}

async function setConfig(chave, valor) {
  const existente = await getConfig(chave);
  if (existente) {
    await base44.entities.AppConfig.update(existente.id, { valor });
  } else {
    await base44.entities.AppConfig.create({ chave, valor });
  }
}

export default function DadosEmpresaSection() {
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  const [nome, setNome] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: configNome } = useQuery({
    queryKey: ["app-config", CHAVE_NOME],
    queryFn: () => getConfig(CHAVE_NOME),
  });
  const { data: configLogo } = useQuery({
    queryKey: ["app-config", CHAVE_LOGO],
    queryFn: () => getConfig(CHAVE_LOGO),
  });

  useEffect(() => {
    if (configNome?.valor !== undefined) setNome(configNome.valor || "");
  }, [configNome]);
  useEffect(() => {
    if (configLogo?.valor !== undefined) setLogoUrl(configLogo.valor || "");
  }, [configLogo]);

  const handleUploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fileUrl = await uploadImagemSeguro(base44, file);
      setLogoUrl(fileUrl);
    } catch (err) {
      toast.error("Erro ao enviar logo: " + (err.message || ""));
    } finally {
      setUploading(false);
    }
  };

  const handleSalvar = async () => {
    setSaving(true);
    try {
      await Promise.all([setConfig(CHAVE_NOME, nome), setConfig(CHAVE_LOGO, logoUrl)]);
      qc.invalidateQueries({ queryKey: ["app-config", CHAVE_NOME] });
      qc.invalidateQueries({ queryKey: ["app-config", CHAVE_LOGO] });
      toast.success("Alterações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5" /> Dados da empresa/marca
      </h2>

      <div className="space-y-1.5">
        <Label>Nome da empresa/marca</Label>
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da sua empresa" />
      </div>

      <div className="space-y-1.5">
        <Label>Logo</Label>
        <p className="text-xs text-muted-foreground">Usada nos cabeçalhos dos PDFs exportados (Ficha Técnica, Ficha de Custos, Lista de Compras)</p>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo da empresa" className="w-16 h-16 object-contain rounded-md border" />
          ) : (
            <div className="w-16 h-16 rounded-md border border-dashed flex items-center justify-center text-muted-foreground text-xs">
              Sem logo
            </div>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            {uploading ? "Enviando..." : "Enviar logo"}
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadLogo} />
        </div>
      </div>

      <Button className="w-full" style={{ backgroundColor: "#2A4E3D" }} disabled={saving} onClick={handleSalvar}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </Card>
  );
}