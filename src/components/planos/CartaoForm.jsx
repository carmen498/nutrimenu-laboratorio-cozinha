import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { carregarMercadoPagoDeviceId, carregarMercadoPagoSdk, MERCADOPAGO_PUBLIC_KEY } from "@/lib/mercadoPagoConfig";
import { maxParcelasPlano } from "@/lib/parcelamentoPlanos";
import { useAuth } from "@/lib/AuthContext";
import { mascararCpf, mascararTelefone, mascararValidadeCartao, mascararNumeroCartao } from "@/lib/mascaras";

const moeda = (valor) => Number(valor).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const formatarOpcaoParcelamento = (opcao) => {
  if (opcao.installment_amount == null) return `${opcao.installments}x`;
  const parcela = `${opcao.installments}x de ${moeda(opcao.installment_amount)}`;
  return Number(opcao.installment_rate) > 0
    ? `${parcela} · total ${moeda(opcao.total_amount)}`
    : `${parcela} sem juros`;
};

export default function CartaoForm({ plano, addonPlanoId = null, somenteAddon = false, email, onClose, onSuccess, onErroUpgrade, aceiteTermos = false, podePagar = true }) {
  const { user } = useAuth();
  const planoEhZr = String(plano || "").startsWith("zr_");
  const parcelasFixasLegadas = Array.from({ length: maxParcelasPlano(plano) }, (_, i) => ({
    installments: i + 1,
    installment_amount: null,
    installment_rate: 0,
    total_amount: null,
  }));
  const [parcelasOpcoes, setParcelasOpcoes] = useState(planoEhZr ? [] : parcelasFixasLegadas);
  const [carregandoParcelas, setCarregandoParcelas] = useState(false);
  const [avisoParcelas, setAvisoParcelas] = useState("");
  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const cpfInicial = String(user?.cpf_cnpj || "").replace(/\D/g, "").length === 11 ? mascararCpf(user.cpf_cnpj) : "";
  const [cpf, setCpf] = useState(cpfInicial);
  const [cpfEditavel, setCpfEditavel] = useState(!cpfInicial);
  const [telefone, setTelefone] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tentativaPagamentoRef = useRef(null);

  useEffect(() => {
    // Pré-carrega o SDK e o identificador antifraude somente quando o cartão é aberto.
    Promise.all([carregarMercadoPagoSdk(), carregarMercadoPagoDeviceId()]).catch(() => {});
  }, []);

  useEffect(() => {
    if (!planoEhZr) return;
    const bin = numero.replace(/\D/g, "").slice(0, 6);
    if (bin.length !== 6) {
      setParcelas("1");
      setParcelasOpcoes([]);
      setAvisoParcelas("");
      return;
    }

    let ativo = true;
    const timer = setTimeout(async () => {
      setCarregandoParcelas(true);
      setAvisoParcelas("");
      try {
        const resposta = await base44.functions.invoke("consultarParcelamentoMercadoPago", { plano, bin });
        if (!ativo) return;
        const opcoes = Array.isArray(resposta.data?.payer_costs) ? resposta.data.payer_costs : [];
        const validas = opcoes.filter((opcao) =>
          Number.isInteger(Number(opcao.installments)) &&
          Number.isFinite(Number(opcao.installment_amount)) &&
          (Number(opcao.installment_rate) <= 0 || Number.isFinite(Number(opcao.total_amount)))
        );
        setParcelasOpcoes(validas);
        setParcelas(String(validas[0]?.installments || 1));
        setAvisoParcelas(resposta.data?.aviso || "");
      } catch {
        if (!ativo) return;
        setParcelasOpcoes([{ installments: 1, installment_amount: null, installment_rate: 0, total_amount: null }]);
        setParcelas("1");
        setAvisoParcelas("Não foi possível carregar as opções de parcelamento. O pagamento poderá ser feito em 1x.");
      } finally {
        if (ativo) setCarregandoParcelas(false);
      }
    }, 400);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [numero, plano, planoEhZr]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!aceiteTermos) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para concluir a contratação.");
      return;
    }
    if (!podePagar) {
      setError("Complete os dados para emissão de nota fiscal acima antes de pagar.");
      return;
    }
    setLoading(true);
    try {
      const MercadoPago = await carregarMercadoPagoSdk();
      const mp = new MercadoPago(MERCADOPAGO_PUBLIC_KEY);

      const [mes, ano] = validade.split("/").map((v) => v.trim());
      const cardNumberLimpo = numero.replace(/\D/g, "");
      const cpfLimpo = cpf.replace(/\D/g, "");
      const mesNumero = Number(mes);
      const anoCompleto = ano?.length === 2 ? `20${ano}` : ano;
      if (cardNumberLimpo.length < 13 || cardNumberLimpo.length > 19) {
        throw new Error("Confira o número do cartão.");
      }
      if (!mes || !anoCompleto || mesNumero < 1 || mesNumero > 12 || !/^\d{4}$/.test(anoCompleto)) {
        throw new Error("Informe a validade no formato MM/AA.");
      }
      const agora = new Date();
      if (Number(anoCompleto) < agora.getFullYear() || (Number(anoCompleto) === agora.getFullYear() && mesNumero < agora.getMonth() + 1)) {
        throw new Error("O cartão está vencido. Confira a validade.");
      }
      if (!/^\d{3,4}$/.test(cvv)) {
        throw new Error("Confira o código de segurança do cartão.");
      }
      if (!nome.trim()) {
        throw new Error("Informe o nome impresso no cartão.");
      }
      if (cpfLimpo.length !== 11) {
        throw new Error("Informe um CPF válido do titular do cartão.");
      }
      const telefoneLimpo = telefone.replace(/\D/g, "");
      if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
        throw new Error("Informe um telefone válido com DDD.");
      }

      const metodos = await mp.getPaymentMethods({ bin: cardNumberLimpo.slice(0, 6) });
      const paymentMethodId = metodos?.results?.[0]?.id || metodos?.[0]?.id;
      if (!paymentMethodId) {
        throw new Error("Não foi possível identificar a bandeira do cartão.");
      }

      const cardToken = await mp.createCardToken({
        cardNumber: cardNumberLimpo,
        cardholderName: nome.trim(),
        cardExpirationMonth: mes.padStart(2, "0"),
        cardExpirationYear: anoCompleto,
        securityCode: cvv,
        identificationType: "CPF",
        identificationNumber: cpfLimpo,
      });

      if (!cardToken?.id) {
        throw new Error("Não foi possível proteger os dados do cartão. Preencha novamente.");
      }

      // O Device ID é um sinal antifraude recomendado pelo Mercado Pago e reduz
      // recusas legítimas classificadas como "high_risk".
      const deviceId = await carregarMercadoPagoDeviceId();
      if (!deviceId) {
        throw new Error("Não foi possível validar a segurança deste dispositivo. Atualize a página e tente novamente no Chrome ou Safari.");
      }

      if (!tentativaPagamentoRef.current) tentativaPagamentoRef.current = crypto.randomUUID();
      const res = await base44.functions.invoke("criarPagamentoMercadoPago", {
        plano,
        ...(addonPlanoId ? { addon_plano_id: addonPlanoId } : {}),
        somente_addon: somenteAddon,
        tentativa_id: tentativaPagamentoRef.current,
        forma_pagamento: "cartao",
        aceite_termos: true,
        token: cardToken.id,
        device_id: deviceId,
        installments: parseInt(parcelas, 10),
        card_bin: cardNumberLimpo.slice(0, 6),
        payment_method_id: paymentMethodId,
        payer: { email, cpf: cpfLimpo, telefone },
      });

      onSuccess(res.data);
    } catch (err) {
      const status = err?.response?.data?.status;
      if (["rejected", "cancelled", "estornado"].includes(status)) tentativaPagamentoRef.current = null;
      const respostaErro = err?.response?.data;
      if (respostaErro?.code === "upgrade_requer_faixas") {
        onErroUpgrade?.(respostaErro);
        return;
      }
      if (respostaErro?.code === "nome_fiscal_invalido") {
        setError(respostaErro.error + " Atualize seus dados de nota fiscal acima e tente novamente.");
        return;
      }
      const mensagem = respostaErro?.error || err.message || "Erro ao processar o pagamento.";
      const orientacao = respostaErro?.orientacao;
      setError(orientacao ? `${mensagem}. ${orientacao}` : mensagem);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cartao-numero">Número do cartão</Label>
        <Input
          id="cartao-numero"
          value={numero}
          onChange={(e) => setNumero(mascararNumeroCartao(e.target.value))}
          placeholder="0000 0000 0000 0000"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cartao-nome">Nome impresso no cartão</Label>
        <Input
          id="cartao-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoComplete="off"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cartao-validade">Validade (MM/AA)</Label>
          <Input
            id="cartao-validade"
            value={validade}
            onChange={(e) => setValidade(mascararValidadeCartao(e.target.value))}
            placeholder="MM/AA"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cartao-cvv">CVV</Label>
          <Input
            id="cartao-cvv"
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            placeholder="000"
            required
            autoComplete="off"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cartao-cpf">CPF do titular</Label>
        <Input
          id="cartao-cpf"
          value={cpf}
          onChange={(e) => setCpf(mascararCpf(e.target.value))}
          placeholder="000.000.000-00"
          required
          readOnly={!cpfEditavel}
          autoComplete="off"
        />
        {!cpfEditavel ? (
          <button type="button" className="text-xs text-primary underline" onClick={() => setCpfEditavel(true)}>
            alterar
          </button>
        ) : (
          <button type="button" className="text-xs text-primary underline" onClick={() => { setCpf(cpfInicial); setCpfEditavel(false); }}>
            usar meu CPF
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cartao-telefone">Telefone com DDD</Label>
        <Input
          id="cartao-telefone"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          placeholder="(00) 00000-0000"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Parcelas</Label>
        <Select value={parcelas} onValueChange={setParcelas}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(parcelasOpcoes.length
              ? parcelasOpcoes
              : [{ installments: 1, installment_amount: null, installment_rate: 0, total_amount: null }]
            ).map((opcao) => (
              <SelectItem key={opcao.installments} value={String(opcao.installments)}>
                {formatarOpcaoParcelamento(opcao)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {carregandoParcelas && <p className="text-xs text-muted-foreground">Carregando opções do Mercado Pago…</p>}
        {avisoParcelas && <p className="text-xs text-amber-700">{avisoParcelas}</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full h-11" disabled={loading || !aceiteTermos || !podePagar}>
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Pagar
      </Button>
    </form>
  );
}