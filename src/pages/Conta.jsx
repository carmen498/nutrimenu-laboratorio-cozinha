import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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

  const { data: pagamentosAprovados = [] } = useQuery({
    queryKey: ["pagamentos-aprovados-conta", targetUserId],
    queryFn: () => base44.entities.Pagamento.filter({ usuario_id: targetUserId, status: "approved" }, "-created_date", 50),
    enabled: !!targetUserId,
  });
  const ultimoPagamento = pagamentosAprovados[0] || null;

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [telefone, setTelefone] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [anotacoesAdmin, setAnotacoesAdmin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (displayUser) {
      setNomeCompleto(displayUser.nome_completo || "");
      setTelefone(displayUser.telefone_whatsapp || "");
      setEmpresa(displayUser.empresa || "");
      setCpfCnpj(displayUser.cpf_cnpj || "");
      setRazaoSocial(displayUser.razao_social || "");
      setCep(displayUser.cep || "");
      setLogradouro(displayUser.logradouro || displayUser.endereco || "");
      setNumero(displayUser.numero || "");
      setComplemento(displayUser.complemento || "");
      setBairro(displayUser.bairro || "");
      setCidade((displayUser.cidade || (displayUser.cidade_uf || "").split("/")[0]?.trim() || "").toUpperCase());
      setEstado((displayUser.estado || (displayUser.cidade_uf || "").split("/")[1]?.trim() || "").toUpperCase());
      setAnotacoesAdmin(displayUser.anotacoes_admin || "");
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
      logradouro,
      numero,
      complemento,
      bairro,
      cidade: cidade.toUpperCase(),
      estado: estado.toUpperCase(),
      // Mantidos durante a transição para preservar integrações e cadastros antigos.
      cidade_uf: [cidade.toUpperCase(), estado.toUpperCase()].filter(Boolean).join("/"),
      endereco: [logradouro, numero, complemento, bairro].filter(Boolean).join(", "),
    };
    try {
      if (isAdminViewingOther) {
        await base44.entities.User.update(targetUserId, { ...payload, anotacoes_admin: anotacoesAdmin });
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

  const handleCopiarDadosNF = async () => {
    const linhas = [
      "DADOS PARA EMISSÃO DE NOTA FISCAL",
      "",
      ["Nome completo", nomeCompleto],
      ["Empresa/Negócio", empresa],
      ["Razão social", razaoSocial],
      ["CPF/CNPJ", cpfCnpj],
      ["E-mail", displayUser?.email],
      ["Telefone/WhatsApp", telefone],
      "",
      "PLANO",
      "",
      ["Plano", ({ diario: "Passe Diário", custos_mensal: "Custos Mensal", custos_anual: "Custos Anual", ...PLANO_LABEL })[ultimoPagamento?.plano || displayUser?.plano_atual]],
      ["Data da contratação", formatarData(ultimoPagamento?.created_date || displayUser?.data_inicio)],
      "",
      "ENDEREÇO",
      "",
      ["CEP", cep],
      ["Logradouro", logradouro],
      ["Número", numero],
      ["Complemento", complemento],
      ["Bairro", bairro],
      ["Cidade", cidade],
      ["Estado", estado],
    ];
    const texto = linhas
      .filter((item) => !Array.isArray(item) || String(item[1] || "").trim())
      .map((item) => Array.isArray(item) ? `${item[0]}: ${String(item[1]).trim()}` : item)
      .join("\n");

    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Dados para emissão de NF copiados!");
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const copiado = document.execCommand("copy");
      document.body.removeChild(area);
      if (copiado) toast.success("Dados para emissão de NF copiados!");
      else toast.error("Não foi possível copiar os dados.");
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
            Dados necessários para gerar NF
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Preencha os dados usados na emissão da nota fiscal. O complemento deve ser informado somente quando houver.</p>
              <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handleCopiarDadosNF}>
                <Copy className="h-4 w-4" /> Copiar dados para emissão de NF
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>CPF ou CNPJ <span className="text-destructive">*</span></Label>
              <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="Informe o CPF ou CNPJ" />
            </div>
            <div className="space-y-1.5">
              <Label>Razão social (somente PJ)</Label>
              <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="Informe a razão social" />
            </div>
            <div className="space-y-1.5">
              <Label>CEP <span className="text-destructive">*</span></Label>
              <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-1.5">
                <Label>Logradouro <span className="text-destructive">*</span></Label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, avenida..." />
              </div>
              <div className="space-y-1.5">
                <Label>Número <span className="text-destructive">*</span></Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apartamento, sala, bloco..." />
            </div>
            <div className="space-y-1.5">
              <Label>Bairro <span className="text-destructive">*</span></Label>
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Informe o bairro" />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <div className="space-y-1.5">
                <Label>Cidade <span className="text-destructive">*</span></Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value.toUpperCase())} placeholder="INFORME A CIDADE" />
              </div>
              <div className="space-y-1.5">
                <Label>Estado <span className="text-destructive">*</span></Label>
                <Input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} placeholder="UF" maxLength={2} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Button className="w-full" style={{ backgroundColor: "#2A4E3D" }} disabled={!telefoneValido || saving} onClick={handleSalvar}>
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>

      {/* Anotações internas — só na visão admin sobre outro usuário */}
      {isAdminViewingOther && (
        <Card className="p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-muted-foreground uppercase tracking-wide">Anotações internas</h2>
          <p className="text-xs text-muted-foreground">
            Visível apenas para admins. O usuário titular nunca vê este conteúdo.
          </p>
          <Textarea
            value={anotacoesAdmin}
            onChange={(e) => setAnotacoesAdmin(e.target.value)}
            placeholder="Contatos feitos, pedidos especiais, histórico..."
            rows={5}
          />
        </Card>
      )}

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