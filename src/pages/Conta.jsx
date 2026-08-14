import { useState, useEffect } from "react";
import { User as UserIcon, CreditCard, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatarTelefone } from "@/lib/formatarTelefone";
import { toast } from "sonner";

export default function Conta() {
  const { user, checkUserAuth } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNomeCompleto(user.nome_completo || "");
      setTelefone(user.telefone_whatsapp || "");
      setEmpresa(user.empresa || "");
    }
  }, [user]);

  const telefoneValido = telefone.replace(/\D/g, "").length >= 10;

  const handleSalvar = async () => {
    if (!telefoneValido) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ nome_completo: nomeCompleto, telefone_whatsapp: telefone, empresa });
      await checkUserAuth();
      toast.success("Alterações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <UserIcon className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Conta</h1>
      </div>

      {/* Seção 1 — Dados cadastrais */}
      <Card className="p-5 space-y-4">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide">Dados cadastrais</h2>

        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>

        <div className="space-y-1.5">
          <Label>
            Telefone/WhatsApp <span className="text-destructive">*</span>
          </Label>
          <Input
            value={telefone}
            onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
            placeholder="(51) 99999-9999"
          />
          {!telefoneValido && telefone.length > 0 && (
            <p className="text-xs text-destructive">Informe um telefone válido com DDD.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={user?.email || ""} disabled />
        </div>

        <div className="space-y-1.5">
          <Label>Empresa/Negócio</Label>
          <Input
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Nome da empresa ou negócio"
          />
        </div>

        <Button
          className="w-full"
          style={{ backgroundColor: "#2A4E3D" }}
          disabled={!telefoneValido || saving}
          onClick={handleSalvar}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </Card>

      {/* Seção 2 — Plano/Assinatura */}
      <Card className="p-5 space-y-3">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5" /> Plano/Assinatura
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Gerencie seu plano, créditos e pagamento no painel Base44.</span>
        </div>
        <Button variant="outline" className="w-full gap-1.5" asChild>
          <a href="https://app.base44.com/billing" target="_blank" rel="noopener noreferrer">
            Gerenciar assinatura <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </Card>
    </div>
  );
}