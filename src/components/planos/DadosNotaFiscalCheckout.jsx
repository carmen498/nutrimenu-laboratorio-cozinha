import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { avaliarDadosFiscais } from "@/lib/dadosFiscais";
import { mascararCpfCnpj, mascararCep } from "@/lib/mascaras";
import { capitalizarNome } from "@/lib/capitalizarNome";

// Sem CPF/CNPJ e endereço completo não há como emitir a nota fiscal — por isso
// estes dados são exigidos no checkout, e o servidor revalida antes de cobrar.
export default function DadosNotaFiscalCheckout() {
  const { user, checkUserAuth } = useAuth();
  const [salvando, setSalvando] = useState(false);
  // Sugestão editável: se nome_completo estiver vazio, pré-preenche com
  // full_name normalizado para a pessoa confirmar. O backend nunca lê
  // full_name — este valor só vira nome_completo depois de salvo e
  // validado pelo avaliarDadosFiscais + capitalizarNome.
  const nomeSugerido = (user?.nome_completo || "").trim()
    || capitalizarNome(String(user?.full_name || "").trim());
  const [form, setForm] = useState({
    nome_completo: nomeSugerido,
    razao_social: user?.razao_social || "",
    cpf_cnpj: user?.cpf_cnpj ? mascararCpfCnpj(user.cpf_cnpj) : "",
    cep: user?.cep ? mascararCep(user.cep) : "",
    logradouro: user?.logradouro || user?.endereco || "",
    numero: user?.numero || "",
    complemento: user?.complemento || "",
    bairro: user?.bairro || "",
    cidade: (user?.cidade || (user?.cidade_uf || "").split("/")[0] || "").toUpperCase(),
    estado: (user?.estado || (user?.cidade_uf || "").split("/")[1] || "").toUpperCase(),
  });

  const set = (campo, transform) => (e) =>
    setForm((f) => ({ ...f, [campo]: transform ? transform(e.target.value) : e.target.value }));
  const avaliacao = avaliarDadosFiscais(form);
  const documentoLimpo = String(form.cpf_cnpj || "").replace(/\D/g, "");
  const ehCnpj = documentoLimpo.length === 14;

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await base44.auth.updateMe({
        ...form,
        nome_completo: capitalizarNome(form.nome_completo),
        cidade_uf: [form.cidade, form.estado].filter(Boolean).join("/"),
        endereco: [form.logradouro, form.numero, form.complemento, form.bairro].filter(Boolean).join(", "),
      });
      await checkUserAuth();
      toast.success("Dados para nota fiscal salvos!");
    } catch (err) {
      toast.error("Não foi possível salvar: " + (err.message || ""));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
      <div>
        <p className="text-sm font-semibold text-amber-950">Dados para a nota fiscal</p>
        <p className="text-xs text-amber-900">Obrigatórios para concluir a compra. Ficam salvos na sua conta.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ehCnpj ? (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Razão social *</Label>
            <Input value={form.razao_social} onChange={set("razao_social")} placeholder="Nome empresarial" />
          </div>
        ) : (
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Confirme seu nome completo — vai na nota fiscal e no pagamento *</Label>
            <Input value={form.nome_completo} onChange={set("nome_completo")} placeholder="Seu nome completo" />
          </div>
        )}
        <div className="space-y-1"><Label className="text-xs">CPF ou CNPJ *</Label><Input value={form.cpf_cnpj} onChange={set("cpf_cnpj", mascararCpfCnpj)} placeholder="000.000.000-00" /></div>
        <div className="space-y-1"><Label className="text-xs">CEP *</Label><Input value={form.cep} onChange={set("cep", mascararCep)} placeholder="00000-000" /></div>
        <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Logradouro *</Label><Input value={form.logradouro} onChange={set("logradouro")} placeholder="Rua, avenida..." /></div>
        <div className="space-y-1"><Label className="text-xs">Número *</Label><Input value={form.numero} onChange={set("numero")} /></div>
        <div className="space-y-1"><Label className="text-xs">Complemento</Label><Input value={form.complemento} onChange={set("complemento")} placeholder="Apto, sala..." /></div>
        <div className="space-y-1"><Label className="text-xs">Bairro *</Label><Input value={form.bairro} onChange={set("bairro")} /></div>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div className="space-y-1"><Label className="text-xs">Cidade *</Label><Input value={form.cidade} onChange={set("cidade", (v) => v.toUpperCase())} /></div>
          <div className="space-y-1"><Label className="text-xs">UF *</Label><Input value={form.estado} maxLength={2} onChange={set("estado", (v) => v.toUpperCase().slice(0, 2))} /></div>
        </div>
      </div>
      {!avaliacao.completo && (
        <p className="text-xs text-amber-900">Falta preencher: {avaliacao.faltando.join(", ")}.</p>
      )}
      <Button size="sm" className="w-full" disabled={!avaliacao.completo || salvando} onClick={handleSalvar}>
        {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar dados e liberar pagamento
      </Button>
    </div>
  );
}