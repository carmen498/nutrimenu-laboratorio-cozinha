// Diálogo "Pedir nota fiscal" da página /conta-zr. Coleta os dados fiscais
// do cliente (pré-preenchidos com o que existe no cadastro), exibe os dados
// da compra em somente leitura, e permite copiar tudo para a área de
// transferência ou registrar o pedido (notificando o administrador).
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, X, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const NOME_PLANO = {
  zr_tin: "ZR Tabela de Informação Nutricional",
  zr_tin_renovacao: "Renovação — ZR Tabela de Informação Nutricional",
  zr_full: "ZR Profissional",
  zr_full_renovacao: "Renovação — ZR Profissional",
  zr_arquitetura: "ZR Arquitetura do Rótulo",
  zr_arquitetura_renovacao: "Renovação — ZR Arquitetura do Rótulo",
  zr_full_upgrade_tin: "Upgrade para ZR Profissional (TIN)",
  zr_full_upgrade_arquitetura: "Upgrade para ZR Profissional (Arquitetura)",
  zr_full_upgrade_tin_arquitetura: "Upgrade para ZR Profissional (TIN + Arquitetura)",
};

const formatarDataHora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export default function PedirNotaFiscalDialog({ pagamento, user, onClose }) {
  const docInicial = String(user?.cpf_cnpj || "").replace(/\D/g, "");
  const [tipo, setTipo] = useState(docInicial.length === 14 ? "pj" : "pf");
  const [cpfCnpj, setCpfCnpj] = useState(user?.cpf_cnpj || "");
  const [nomeRazao, setNomeRazao] = useState(
    docInicial.length === 14 ? (user?.razao_social || "") : (user?.nome_completo || user?.full_name || "")
  );
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [emailNf, setEmailNf] = useState(user?.email || "");
  const [cep, setCep] = useState(user?.cep || "");
  const [logradouro, setLogradouro] = useState(user?.logradouro || user?.endereco || "");
  const [numero, setNumero] = useState(user?.numero || "");
  const [complemento, setComplemento] = useState(user?.complemento || "");
  const [bairro, setBairro] = useState(user?.bairro || "");
  const [cidade, setCidade] = useState(user?.cidade || String(user?.cidade_uf || "").split("/")[0] || "");
  const [estado, setEstado] = useState(user?.estado || String(user?.cidade_uf || "").split("/")[1] || "");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const planoNome = NOME_PLANO[pagamento?.plano] || pagamento?.plano || "—";
  const valorTxt = `R$ ${Number(pagamento?.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const dataTxt = formatarDataHora(pagamento?.created_date);
  const formaTxt = pagamento?.forma_pagamento === "pix" ? "PIX" : "Cartão";
  const transacaoMp = pagamento?.mercadopago_order_id || "—";

  const handleTipoChange = (novoTipo) => {
    setTipo(novoTipo);
    setNomeRazao(novoTipo === "pj" ? (user?.razao_social || "") : (user?.nome_completo || user?.full_name || ""));
  };

  const copiarDados = () => {
    const linhas = [
      "PEDIDO DE NOTA FISCAL — Guia Técnico ZR",
      "",
      "DADOS DO CLIENTE",
      `Tipo: ${tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}`,
      `CPF/CNPJ: ${cpfCnpj}`,
      `${tipo === "pf" ? "Nome completo" : "Razão social"}: ${nomeRazao}`,
      ...(inscricaoEstadual ? [`Inscrição estadual: ${inscricaoEstadual}`] : []),
      `E-mail para envio da nota: ${emailNf}`,
      "",
      "ENDEREÇO",
      `CEP: ${cep}`,
      `Logradouro: ${logradouro}`,
      `Número: ${numero}`,
      ...(complemento ? [`Complemento: ${complemento}`] : []),
      `Bairro: ${bairro}`,
      `Cidade: ${cidade}`,
      `UF: ${estado}`,
      "",
      "DADOS DA COMPRA",
      `Plano: ${planoNome}`,
      `Valor: ${valorTxt}`,
      `Data: ${dataTxt}`,
      `Forma de pagamento: ${formaTxt}`,
      `Transação MP: ${transacaoMp}`,
    ];
    navigator.clipboard.writeText(linhas.join("\n")).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  };

  const solicitar = async () => {
    const doc = String(cpfCnpj).replace(/\D/g, "");
    if (doc.length !== 11 && doc.length !== 14) {
      toast.error("Informe um CPF ou CNPJ válido.");
      return;
    }
    if (!nomeRazao.trim()) {
      toast.error(tipo === "pf" ? "Informe o nome completo." : "Informe a razão social.");
      return;
    }
    if (!emailNf.trim()) {
      toast.error("Informe o e-mail para envio da nota.");
      return;
    }
    if (!cep || !logradouro || !numero || !bairro || !cidade || !estado) {
      toast.error("Preencha o endereço completo.");
      return;
    }
    setEnviando(true);
    try {
      await base44.functions.invoke("solicitarNotaFiscalZR", {
        pagamento_id: pagamento.id,
        dados: {
          tipo,
          cpf_cnpj: cpfCnpj,
          nome_razao: nomeRazao,
          inscricao_estadual: inscricaoEstadual,
          email_nf: emailNf,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
        },
      });
      toast.success("Pedido registrado. A nota será emitida pelo Nutrimenu e enviada por e-mail.");
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Não foi possível registrar o pedido.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-lg bg-[#FBF8F1] rounded-xl border border-[#E2DBC9] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E2DBC9] px-5 py-4">
          <h3 className="zr-serif text-lg font-semibold text-[#1F1B16]">Pedir nota fiscal</h3>
          <button onClick={onClose} className="text-[#6B6358] hover:text-[#1F1B16]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-[#6B6358] bg-[#F4F1EA] rounded-lg p-3">
            A nota fiscal é emitida pelo Nutrimenu e enviada por e-mail. Esta página coleta e encaminha o seu pedido —
            não emite a nota automaticamente.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#3A342B]">Tipo de pessoa</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-[#3A342B] cursor-pointer">
                <input type="radio" name="tipo-nf" checked={tipo === "pf"} onChange={() => handleTipoChange("pf")} />
                Pessoa Física
              </label>
              <label className="flex items-center gap-2 text-sm text-[#3A342B] cursor-pointer">
                <input type="radio" name="tipo-nf" checked={tipo === "pj"} onChange={() => handleTipoChange("pj")} />
                Pessoa Jurídica
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#3A342B]">{tipo === "pf" ? "CPF" : "CNPJ"}</label>
            <input value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#3A342B]">{tipo === "pf" ? "Nome completo" : "Razão social"}</label>
            <input value={nomeRazao} onChange={(e) => setNomeRazao(e.target.value)} className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
          </div>

          {tipo === "pj" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#3A342B]">Inscrição estadual (opcional)</label>
              <input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[#3A342B]">E-mail para envio da nota</label>
            <input value={emailNf} onChange={(e) => setEmailNf(e.target.value)} className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#3A342B]">Endereço</p>
            <input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="CEP" className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            <input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Logradouro" className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número" className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
              <input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Complemento" className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            </div>
            <input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className="col-span-2 w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
              <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="UF" maxLength={2} className="w-full rounded-md border border-[#E2DBC9] bg-white px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="rounded-lg border border-[#E2DBC9] bg-[#F4F1EA] p-3 space-y-1">
            <p className="text-xs font-medium text-[#3A342B] mb-1">Dados da compra (somente leitura)</p>
            <p className="text-xs text-[#6B6358]"><strong>Plano:</strong> {planoNome}</p>
            <p className="text-xs text-[#6B6358]"><strong>Valor:</strong> {valorTxt}</p>
            <p className="text-xs text-[#6B6358]"><strong>Data:</strong> {dataTxt}</p>
            <p className="text-xs text-[#6B6358]"><strong>Forma de pagamento:</strong> {formaTxt}</p>
            <p className="text-xs text-[#6B6358]"><strong>Transação MP:</strong> {transacaoMp}</p>
          </div>
        </div>

        <div className="flex gap-2 border-t border-[#E2DBC9] px-5 py-4">
          <button onClick={copiarDados} className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-[#E2DBC9] bg-white text-[#3A342B] text-sm font-medium px-4 py-2 hover:bg-[#F4F1EA]">
            {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copiado ? "Dados copiados" : "Copiar dados"}
          </button>
          <button onClick={solicitar} disabled={enviando} className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#1F1B16] text-[#F4F1EA] text-sm font-medium px-4 py-2 hover:bg-[#2A2420] disabled:opacity-60">
            {enviando && <Loader2 className="w-4 h-4 animate-spin" />}
            Solicitar nota fiscal
          </button>
        </div>
      </div>
    </div>
  );
}