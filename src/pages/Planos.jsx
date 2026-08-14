import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import PlanoCard from "@/components/planos/PlanoCard";
import IncluidoTodosPlanos from "@/components/planos/IncluidoTodosPlanos";

export default function Planos() {
  const navigate = useNavigate();
  const [loadingTrial, setLoadingTrial] = useState(false);

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

      <div className="text-center mb-10">
        <h1 className="font-heading text-3xl font-bold text-foreground">Planos</h1>
        <p className="text-muted-foreground mt-2">
          Escolha o plano ideal para o seu Laboratório de Cozinha
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        <PlanoCard
          nome="Teste Grátis"
          subtitulo="7 dias de uso"
          preco="R$ 0"
          botaoLabel="Testar grátis"
          loading={loadingTrial}
          onClick={handleTestarGratis}
        />
        <PlanoCard
          nome="Mensal"
          subtitulo="Sem compromisso"
          preco="R$ 29,90/mês"
          botaoLabel="Assinar mensal"
          onClick={handleEmBreve}
        />
        <PlanoCard
          nome="Anual"
          subtitulo="Sempre ativo"
          preco="R$ 16,50/mês"
          precoDetalhe="R$ 198/ano"
          botaoLabel="Assinar anual"
          destaque
          onClick={handleEmBreve}
        />
        <PlanoCard
          nome="Renovação"
          subtitulo="50% de desconto"
          preco="R$ 99/ano"
          precoDetalhe="ou 6x de R$ 16,50"
          botaoLabel="Renovar"
          onClick={handleEmBreve}
        />
      </div>

      <IncluidoTodosPlanos />
    </div>
  );
}