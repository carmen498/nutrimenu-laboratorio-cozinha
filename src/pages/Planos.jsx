import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
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
  if (!dataStr) return null;
  const data = new Date(`${dataStr}T00:00:00`);
  if (isNaN(data.getTime())) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.round((data.getTime() - hoje.getTime()) / 86400000);
};

export default function Planos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loadingTrial, setLoadingTrial] = useState(false);
  const [checkoutPlano, setCheckoutPlano] = useState(null);

  const planoAtual = user?.plano_atual;
  const statusAssinatura = user?.status_assinatura;
  const cicloRenovacao = user?.ciclo_renovacao || 0;

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

      {statusAssinatura === "vencido" && (
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <PlanoCard
          planoId="trial"
          nome="Teste Grátis"
          subtitulo="7 dias de uso"
          preco="R$ 0"
          botaoLabel="Testar grátis"
          loading={loadingTrial}
          onClick={handleTestarGratis}
          isCurrentPlan={planoAtual === "trial"}
          validadeLabel="Válido até"
          validadeData={formatarData(user?.data_expiracao)}
          diasRestantes={planoAtual === "trial" ? diasRestantesTrial : null}
        />
        <PlanoCard
          planoId="mensal"
          nome="Mensal"
          subtitulo="Sem compromisso"
          preco="R$ 29,90/mês"
          botaoLabel="Assinar mensal"
          onClick={() => handleAssinar("mensal", "Mensal")}
          isCurrentPlan={planoAtual === "mensal"}
          validadeLabel="Próxima cobrança em"
          validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
        />
        <PlanoCard
          planoId="anual"
          nome="Anual"
          subtitulo="Sempre ativo"
          preco="R$ 16,50/mês"
          precoDetalhe="R$ 198/ano"
          botaoLabel="Assinar anual"
          destaque
          onClick={() => handleAssinar("anual", "Anual")}
          isCurrentPlan={planoAtual === "anual"}
          validadeLabel="Próxima cobrança em"
          validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
        />
        <PlanoCard
          planoId="renovacao"
          nome="Renovação"
          subtitulo="50% de desconto"
          preco="R$ 99/ano"
          precoDetalhe="ou 6x de R$ 16,50"
          botaoLabel="Renovar"
          onClick={handleEmBreve}
          isCurrentPlan={planoAtual === "renovacao"}
          validadeLabel="Próxima cobrança em"
          validadeData={formatarData(user?.data_proxima_cobranca || user?.data_expiracao)}
          bloqueado={planoAtual !== "renovacao" && cicloRenovacao < 1}
          mensagemBloqueio="Disponível a partir do 2º ano"
        />
      </div>

      <IncluidoTodosPlanos />

      {statusAssinatura === "trial" && diasRestantesTrial != null && diasRestantesTrial <= 3 && (
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