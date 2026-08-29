import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { avaliarAcessoAssinatura, hojeSaoPauloISO } from "@/lib/acessoAssinatura";
import { avaliarElegibilidadeRenovacao } from "@/lib/regraRenovacao";
import { toast } from "@/components/ui/use-toast";
import PlanoCard from "@/components/planos/PlanoCard";
import IncluidoTodosPlanos from "@/components/planos/IncluidoTodosPlanos";
import { BannerVencido, BannerTrialExpirando } from "@/components/planos/AvisoAssinaturaBanner";
import CheckoutDialog from "@/components/planos/CheckoutDialog";

const formatarData = (dataStr) => {
  if (!dataStr) return null;
  const data = new Date(`${dataStr}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR");
};

const diasEntreHoje = (dataStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr || "")) return null;
  const hojeISO = hojeSaoPauloISO();
  const [anoAlvo, mesAlvo, diaAlvo] = dataStr.split("-").map(Number);
  const [anoHoje, mesHoje, diaHoje] = hojeISO.split("-").map(Number);
  return Math.round((Date.UTC(anoAlvo, mesAlvo - 1, diaAlvo) - Date.UTC(anoHoje, mesHoje - 1, diaHoje)) / 86400000);
};

const formatarPreco = (plano) => {
  const valor = (plano.preco_exibido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sufixo = plano.periodo_exibido === "mes" ? "/mês" : plano.periodo_exibido === "ano" ? "/ano" : "";
  return `R$ ${valor}${sufixo}`;
};

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [loadingTrialCustos, setLoadingTrialCustos] = useState(false);
  const [checkoutPlano, setCheckoutPlano] = useState(null);
  const [addonSelecionado, setAddonSelecionado] = useState({ trial: false, mensal: false, anual: false, renovacao: false });

  const { data: configPlanos = [], isLoading: carregandoPlanos } = useQuery({
    queryKey: ["configuracao-planos-publico"],
    queryFn: () => base44.entities.ConfiguracaoPlano.list("ordem"),
  });
  const configPlanosCozinha = configPlanos.filter((p) => !p.produto || p.produto === "laboratorio_cozinha");
  const configPlanosCustos = configPlanos.filter((p) => p.produto === "laboratorio_custos");
  const configPorId = Object.fromEntries(configPlanosCozinha.map((p) => [p.plano_id, p]));
  const custosPorId = Object.fromEntries(configPlanosCustos.map((p) => [p.plano_id, p]));

  const { data: configsCustos = [] } = useQuery({
    queryKey: ["planos-cozinha-config-custos"],
    queryFn: () => base44.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }, "-updated_date", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });
  const configCustos = configsCustos[0] || null;

  const { data: acessosCustos = [] } = useQuery({
    queryKey: ["planos-cozinha-acesso-custos", user?.id],
    queryFn: () => base44.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: "laboratorio_custos" }, "-updated_date", 20),
    enabled: !!user?.id && user?.role !== "admin",
    staleTime: 0,
  });
  const acessoCustosAtual = acessosCustos.find((a) => a.status === "ativo" && (!a.fim_em || new Date(a.fim_em) >= new Date())) || null;
  const trialCustosUsado = acessosCustos.some((a) => a.modalidade === "trial" || a.origem === "trial" || a.trial_ativado_em);

  const { data: preflightTrialCustos = null } = useQuery({
    queryKey: ["planos-cozinha-preflight-trial-custos", user?.id],
    queryFn: async () => (await base44.functions.invoke("preflightTrialLaboratorioCustos", {})).data,
    enabled: !!user?.id && user?.role !== "admin" && !acessoCustosAtual && !trialCustosUsado,
    staleTime: 0,
    retry: false,
  });

  const planoAtual = user?.plano_atual;
  const statusAssinatura = user?.status_assinatura;
  const elegibilidadeRenovacao = avaliarElegibilidadeRenovacao(user);
  const jaPossuiHistoricoPlano = user?.role !== "admin" && Boolean(user?.plano_atual || user?.status_assinatura || user?.data_inicio || user?.data_expiracao || Number(user?.ciclo_renovacao || 0) > 0);
  const acessoAssinatura = avaliarAcessoAssinatura(user);
  const assinaturaVencida = user?.role !== "admin" && !acessoAssinatura.temAcesso && ["expirado", "vencido", "cancelado", "sem_data_expiracao"].includes(acessoAssinatura.motivo);
  const diasRestantesTrial = statusAssinatura === "trial" && user?.data_expiracao ? diasEntreHoje(user.data_expiracao) : null;

  const scrollToPlano = (planoId) => document.getElementById(`plano-${planoId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  const handleTestarGratis = async () => {
    setLoadingTrial(true);
    try {
      await base44.functions.invoke("inicializarTrialUsuario", {});
      toast({ title: "Trial ativado!", description: "Você tem 7 dias de acesso completo." });
      navigate("/");
    } catch (err) {
      toast({ title: "Não foi possível ativar o trial", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoadingTrial(false);
    }
  };

  const toggleAddon = (planoId) => setAddonSelecionado((atual) => ({ ...atual, [planoId]: !atual[planoId] }));

  const addonParaPlano = (planoId) => {
    if (planoId === "mensal") {
      const p = custosPorId.custos_mensal;
      return p ? { id: "custos_mensal", nome: "30 dias", valor: Number(p.preco_exibido || 8.9) } : null;
    }
    if (["anual", "renovacao"].includes(planoId)) {
      const p = custosPorId.custos_anual;
      return p ? { id: "custos_anual", nome: "Anual", valor: Number(p.preco_exibido || 87) } : null;
    }
    if (planoId === "trial") {
      const p = custosPorId.custos_trial;
      return p ? { id: "custos_trial", nome: "7 dias grátis", valor: 0 } : null;
    }
    return null;
  };

  const complementoCard = (planoId) => {
    const addon = addonParaPlano(planoId);
    if (!addon) return null;
    const trial = addon.id === "custos_trial";
    const trialDisponivel = !!preflightTrialCustos?.elegivel;
    const desabilitado = !!acessoCustosAtual || (trial && !trialDisponivel);
    const ativo = !!acessoCustosAtual;

    return (
      <label className={`flex items-start gap-2 text-left ${desabilitado ? "opacity-60" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={ativo || !!addonSelecionado[planoId]}
          disabled={desabilitado}
          onChange={() => toggleAddon(planoId)}
        />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">
            {ativo ? "Laboratório de Custos ativo" : trial ? "Experimentar Laboratório de Custos" : "Adicionar Laboratório de Custos"}
          </span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">
            {ativo
              ? "Complemento já ativo nesta conta"
              : trial
                ? (trialDisponivel ? "7 dias grátis" : trialCustosUsado ? "Trial já utilizado" : "Trial ainda não liberado para esta conta")
                : `+ R$ ${addon.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${addon.id === "custos_anual" ? "ano" : "30 dias"}`}
          </span>
        </span>
      </label>
    );
  };

  const handleTrialCustos = async () => {
    if (!preflightTrialCustos?.elegivel || loadingTrialCustos) return;
    setLoadingTrialCustos(true);
    try {
      await base44.functions.invoke("inicializarTrialLaboratorioCustos", {});
      toast({ title: "Laboratório de Custos ativado", description: "Seu teste de 7 dias começou." });
      navigate("/custos");
    } catch (err) {
      toast({ title: "Não foi possível ativar o Laboratório de Custos", description: err?.response?.data?.error || err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoadingTrialCustos(false);
    }
  };

  const handleAssinar = (planoId, planoNome) => {
    const addon = addonSelecionado[planoId] ? addonParaPlano(planoId) : null;
    setCheckoutPlano({ id: planoId, nome: planoNome, addon, somenteAddon: false });
  };

  const handleAdicionarCustosPlanoAtual = (planoId) => {
    if (preflightTrialCustos?.elegivel && !trialCustosUsado) {
      handleTrialCustos();
      return;
    }
    const addon = addonParaPlano(planoId);
    if (!addon) return;
    setCheckoutPlano({ id: planoId, nome: configPorId[planoId]?.nome || planoId, addon, somenteAddon: true });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Voltar</Link>

      {assinaturaVencida && <BannerVencido dataVencimento={formatarData(user?.data_expiracao) || "—"} onRenovar={() => scrollToPlano(planoAtual || "mensal")} />}

      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-2">Escolha o plano ideal para o seu Laboratório de Cozinha e, se quiser, adicione o Laboratório de Custos.</p>
      </div>

      {carregandoPlanos ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {configPorId.trial && (
            <PlanoCard
              planoId="trial"
              nome={configPorId.trial.nome}
              subtitulo={configPorId.trial.subtitulo}
              preco={formatarPreco(configPorId.trial)}
              precoDetalhe={configPorId.trial.preco_detalhe}
              beneficios={configPorId.trial.beneficios}
              botaoLabel="Testar grátis"
              destaque={configPorId.trial.mais_popular}
              loading={loadingTrial}
              onClick={handleTestarGratis}
              isCurrentPlan={planoAtual === "trial"}
              validadeLabel="Válido até"
              validadeData={formatarData(user?.data_expiracao)}
              diasRestantes={planoAtual === "trial" ? diasRestantesTrial : null}
              bloqueado={planoAtual !== "trial" && jaPossuiHistoricoPlano}
              mensagemBloqueio="Teste grátis disponível apenas para novas contas"
              complemento={complementoCard("trial")}
              complementoActionLabel={planoAtual === "trial" && !acessoCustosAtual && preflightTrialCustos?.elegivel ? "Ativar trial do Custos" : ""}
              onComplementoAction={handleTrialCustos}
              complementoActionDisabled={loadingTrialCustos}
            />
          )}

          {configPorId.mensal && (
            <PlanoCard
              planoId="mensal"
              nome={configPorId.mensal.nome}
              subtitulo={configPorId.mensal.subtitulo}
              preco={formatarPreco(configPorId.mensal)}
              precoDetalhe={configPorId.mensal.preco_detalhe}
              beneficios={configPorId.mensal.beneficios}
              botaoLabel="Assinar mensal"
              destaque={configPorId.mensal.mais_popular}
              onClick={() => handleAssinar("mensal", configPorId.mensal.nome)}
              isCurrentPlan={planoAtual === "mensal"}
              validadeLabel="Válido até"
              validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
              complemento={complementoCard("mensal")}
              complementoActionLabel={planoAtual === "mensal" && !acessoCustosAtual ? (preflightTrialCustos?.elegivel ? "Ativar trial do Custos" : "Adicionar Lab. de Custos") : ""}
              onComplementoAction={() => handleAdicionarCustosPlanoAtual("mensal")}
              complementoActionDisabled={loadingTrialCustos}
            />
          )}

          {configPorId.anual && (
            <PlanoCard
              planoId="anual"
              nome={configPorId.anual.nome}
              subtitulo={configPorId.anual.subtitulo}
              preco={formatarPreco(configPorId.anual)}
              precoDetalhe={configPorId.anual.preco_detalhe}
              beneficios={configPorId.anual.beneficios}
              botaoLabel="Assinar anual"
              destaque={configPorId.anual.mais_popular}
              onClick={() => handleAssinar("anual", configPorId.anual.nome)}
              isCurrentPlan={planoAtual === "anual"}
              validadeLabel="Válido até"
              validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
              complemento={complementoCard("anual")}
              complementoActionLabel={planoAtual === "anual" && !acessoCustosAtual ? (preflightTrialCustos?.elegivel ? "Ativar trial do Custos" : "Adicionar Lab. de Custos") : ""}
              onComplementoAction={() => handleAdicionarCustosPlanoAtual("anual")}
              complementoActionDisabled={loadingTrialCustos}
            />
          )}

          {configPorId.renovacao && (
            <PlanoCard
              planoId="renovacao"
              nome={configPorId.renovacao.nome}
              subtitulo={configPorId.renovacao.subtitulo}
              preco={formatarPreco(configPorId.renovacao)}
              precoDetalhe={configPorId.renovacao.preco_detalhe}
              beneficios={configPorId.renovacao.beneficios}
              botaoLabel="Renovar"
              destaque={configPorId.renovacao.mais_popular}
              onClick={() => handleAssinar("renovacao", configPorId.renovacao.nome)}
              isCurrentPlan={false}
              validadeLabel="Válido até"
              validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
              bloqueado={!elegibilidadeRenovacao.elegivel}
              mensagemBloqueio={elegibilidadeRenovacao.motivo === "ciclo_insuficiente" ? "Disponível a partir do 2º ano" : elegibilidadeRenovacao.motivo === "fora_janela" ? "Disponível nos 30 dias anteriores ao vencimento" : "Renovação indisponível neste momento"}
              complemento={complementoCard("renovacao")}
            />
          )}
        </div>
      )}

      <IncluidoTodosPlanos />

      {statusAssinatura === "trial" && acessoAssinatura.temAcesso && diasRestantesTrial != null && diasRestantesTrial <= 3 && (
        <BannerTrialExpirando diasRestantes={Math.max(diasRestantesTrial, 0)} onAssinar={() => scrollToPlano("anual")} />
      )}

      <CheckoutDialog
        open={!!checkoutPlano}
        onOpenChange={(v) => !v && setCheckoutPlano(null)}
        plano={checkoutPlano?.id}
        planoNome={checkoutPlano?.nome}
        planoValor={Number(configPorId[checkoutPlano?.id]?.valor_cobranca || 0)}
        email={user?.email}
        addon={checkoutPlano?.addon}
        somenteAddon={!!checkoutPlano?.somenteAddon}
        addonCheckoutBloqueado={!!checkoutPlano?.addon && !configCustos?.venda_habilitada}
      />
    </div>
  );
}
