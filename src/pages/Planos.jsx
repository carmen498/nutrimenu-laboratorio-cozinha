import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { avaliarAcessoAssinatura, hojeSaoPauloISO } from "@/lib/acessoAssinatura";
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
  const alvoUTC = Date.UTC(anoAlvo, mesAlvo - 1, diaAlvo);
  const hojeUTC = Date.UTC(anoHoje, mesHoje - 1, diaHoje);
  return Math.round((alvoUTC - hojeUTC) / 86400000);
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
  const [checkoutPlano, setCheckoutPlano] = useState(null);

  const { data: configPlanos = [], isLoading: carregandoPlanos } = useQuery({
    queryKey: ["configuracao-planos-publico"],
    queryFn: () => base44.entities.ConfiguracaoPlano.list("ordem"),
  });
  const configPorId = Object.fromEntries(configPlanos.map((p) => [p.plano_id, p]));

  const planoAtual = user?.plano_atual;
  const statusAssinatura = user?.status_assinatura;
  const cicloRenovacao = user?.ciclo_renovacao || 0;
  const jaPossuiHistoricoPlano = user?.role !== "admin" && Boolean(
    user?.plano_atual ||
    user?.status_assinatura ||
    user?.data_inicio ||
    user?.data_expiracao ||
    Number(user?.ciclo_renovacao || 0) > 0
  );
  const acessoAssinatura = avaliarAcessoAssinatura(user);
  const assinaturaVencida =
    user?.role !== "admin" &&
    !acessoAssinatura.temAcesso &&
    ["expirado", "vencido", "cancelado", "sem_data_expiracao"].includes(acessoAssinatura.motivo);

  const diasRestantesTrial =
    statusAssinatura === "trial" && user?.data_expiracao
      ? diasEntreHoje(user.data_expiracao)
      : null;

  const scrollToPlano = (planoId) => {
    document.getElementById(`plano-${planoId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleTestarGratis = async () => {
    setLoadingTrial(true);
    try {
      await base44.functions.invoke("inicializarTrialUsuario", {});
      toast({ title: "Trial ativado!", description: "Você tem 7 dias de acesso completo." });
      navigate("/");
    } catch (err) {
      toast({
        title: "Não foi possível ativar o trial",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoadingTrial(false);
    }
  };

  const handleAssinar = (planoId, planoNome) => {
    setCheckoutPlano({ id: planoId, nome: planoNome });
  };

  const handleEmBreve = () => {
    toast({
      title: "Em breve",
      description: "O pagamento via Mercado Pago será integrado em breve.",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      {assinaturaVencida && (
        <BannerVencido
          dataVencimento={formatarData(user?.data_expiracao) || "—"}
          onRenovar={() => scrollToPlano(planoAtual || "mensal")}
        />
      )}

      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-2">
          Escolha o plano ideal para o seu Laboratório de Cozinha
        </p>
      </div>

      {carregandoPlanos ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
              onClick={handleEmBreve}
              isCurrentPlan={planoAtual === "renovacao"}
              validadeLabel="Válido até"
              validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
              bloqueado={planoAtual !== "renovacao" && cicloRenovacao < 1}
              mensagemBloqueio="Disponível a partir do 2º ano"
            />
          )}
        </div>
      )}

      <IncluidoTodosPlanos />

      {statusAssinatura === "trial" && acessoAssinatura.temAcesso && diasRestantesTrial != null && diasRestantesTrial <= 3 && (
        <BannerTrialExpirando
          diasRestantes={Math.max(diasRestantesTrial, 0)}
          onAssinar={() => scrollToPlano("anual")}
        />
      )}

      <CheckoutDialog
        open={!!checkoutPlano}
        onOpenChange={(v) => !v && setCheckoutPlano(null)}
        plano={checkoutPlano?.id}
        planoNome={checkoutPlano?.nome}
        email={user?.email}
      />
    </div>
  );
}
