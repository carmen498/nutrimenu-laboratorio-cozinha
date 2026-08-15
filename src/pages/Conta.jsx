import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { formatarTelefone } from "@/lib/formatarTelefone";
import { formatarData, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";
import { toast } from "sonner";

function getIniciais(nome) {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  return (partes[0][0] + (partes[1]?.[0] || "")).toUpperCase();
}

export default function Conta() {
  const navigate = useNavigate();
  const { user: currentUser, checkUserAuth } = useAuth();
  const qc = useQueryClient();

  const userIdParam = new URLSearchParams(window.location.search).get("userId");
  const isAdmin = currentUser?.role === "admin";
  const isAdminViewingOther = isAdmin && !!userIdParam && userIdParam !== currentUser?.id;
  const targetUserId = isAdminViewingOther ? userIdParam : currentUser?.id;

  const { data: fetchedUser } = useQuery({
    queryKey: ["conta-usuario", targetUserId],
    queryFn: () => base44.entities.User.get(targetUserId),
    enabled: isAdminViewingOther,
  });

  const displayUser = isAdminViewingOther ? fetchedUser : currentUser;

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cep, setCep] = useState("");
  const [cidadeUf, setCidadeUf] = useState("");
  const [endereco, setEndereco] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (displayUser) {
      setNomeCompleto(displayUser.nome_completo || "");
      setTelefone(displayUser.telefone_whatsapp || "");
      setEmpresa(displayUser.empresa || "");
      setCpfCnpj(displayUser.cpf_cnpj || "");
      setRazaoSocial(displayUser.razao_social || "");
      setCep(displayUser.cep || "");
      setCidadeUf(displayUser.cidade_uf || "");
      setEndereco(displayUser.endereco || "");
    }
  }, [displayUser]);

  const telefoneValido = telefone.replace(/\D/g, "").length >= 10;

  const handleSalvar = async () => {
    if (!telefoneValido) return;
    setSaving(true);
    const payload = {
      nome_completo: nomeCompleto,
      telefone_whatsapp: telefone,
      empresa,
      cpf_cnpj: cpfCnpj,
      razao_social: razaoSocial,
      cep,
      cidade_uf: cidadeUf,
      endereco,
    };
    try {
      if (isAdminViewingOther) {
        await base44.entities.User.update(targetUserId, payload);
        qc.invalidateQueries({ queryKey: ["conta-usuario", targetUserId] });
      } else {
        await base44.auth.updateMe(payload);
        await checkUserAuth();
      }
      toast.success("Alterações salvas!");
    } catch (err) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarLinkRedefinicao = async () => {
    try {
      await base44.auth.resetPasswordRequest(displayUser.email);
      toast.success("Link de redefinição enviado para " + displayUser.email);
    } catch (err) {
      toast.error("Erro ao enviar link: " + (err.message || ""));
    }
  };

  if (isAdminViewingOther && !displayUser) {
    return <p className="text-sm text-muted-foreground text-center py-12">Carregando conta...</p>;
  }

  const planoLabel = PLANO_LABEL[displayUser?.plano_atual] || "—";
  const isPlanoAtivo = displayUser?.status_assinatura === "ativo";

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-12">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground/80">
          {getIniciais(displayUser?.nome_completo || displayUser?.full_name)}
        </div>
        <div>
          <p className="font-display text-lg font-bold" style={{ color: "#2A4E3D" }}>
            {displayUser?.nome_completo || displayUser?.full_name || "Seu nome completo"}
          </p>
          <p className="text-sm text-muted-foreground">{displayUser?.email}</p>
        </div>
        {isAdminViewingOther && (
          <Badge variant="outline" className="ml-auto gap-1 border-amber-300 bg-amber-50 text-amber-700">
            <ShieldCheck className="w-3 h-3" /> Visão admin
          </Badge>
        )}
      </div>

      {/* Bloco de plano */}
      <Card className={`p-4 space-y-2 ${isPlanoAtivo ? "bg-green-50 border-green-200" : ""}`}>
        <p className="text-sm font-semibold">
          Plano {planoLabel} · {isPlanoAtivo ? "ativo até" : "válido até"} {formatarData(displayUser?.data_expiracao) || "—"}
        </p>
        <p className="text-xs text-muted-foreground">
          Este plano não possui renovação automática. Para continuar usando após o vencimento, é necessário adquirir novamente.
        </p>
        {!isAdminViewingOther && (
          <Button variant="outline" size="sm" onClick={() => navigate("/planos")}>
            Renovar plano
          </Button>
        )}
      </Card>

      {/* Dados básicos */}
      <Card className="p-5 space-y-4">
        <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide">Dados básicos</h2>

        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Seu nome completo" />
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input value={displayUser?.email || ""} disabled />
        </div>

        <div className="space-y-1.5">
          <Label>Telefone/WhatsApp <span className="text-destructive">*</span></Label>
          <Input value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))} placeholder="(51) 99999-9999" />
          {!telefoneValido && telefone.length > 0 && (
            <p className="text-xs text-destructive">Informe um telefone válido com DDD.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Empresa/Negócio</Label>
          <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nome da empresa ou negócio" />
        </div>
      </Card>

      {/* Dados para nota fiscal */}
      <Accordion type="single" collapsible>
        <AccordionItem value="nota-fiscal" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-semibold">
            Dados complementares
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>CPF ou CNPJ</Label>
              <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Razão social (opcional, só PJ)</Label>
              <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>CEP</Label>
              <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Cidade/UF</Label>
              <Input value={cidadeUf} onChange={(e) => setCidadeUf(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label>Endereço completo</Label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Opcional" />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button className="w-full" style={{ backgroundColor: "#2A4E3D" }} disabled={!telefoneValido || saving} onClick={handleSalvar}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>

      {/* Gestão de senha — só na visão admin */}
      {isAdmin && (
        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide">Gestão de senha</h2>
          <p className="text-xs text-muted-foreground">
            Envia um e-mail com link para o usuário definir uma nova senha — cobre tanto perda de senha quanto troca de acesso de conta compartilhada.
          </p>
          <Button variant="outline" className="w-full" onClick={handleEnviarLinkRedefinicao}>
            Enviar link de redefinição
          </Button>
        </Card>
      )}
    </div>
  );
}