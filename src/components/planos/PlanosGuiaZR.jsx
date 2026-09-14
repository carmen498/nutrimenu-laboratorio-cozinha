import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PlanoCard from "./PlanoCard";
import AvisoDesistencia from "./AvisoDesistencia";
import { FAIXAS_ZR, textoPrecoPromocional } from "@/lib/guiaZRPlanos";

const formatarPreco = (plano) => {
  const valor = Number(plano?.preco_exibido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sufixo = plano?.periodo_exibido === "mes" ? "/mês" : plano?.periodo_exibido === "ano" ? "/ano" : "";
  return `R$ ${valor}${sufixo}`;
};

const formatarData = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
};

// Faixas do Guia Técnico ZR — vendidas nesta mesma página, sem checkout separado.
// As faixas acumulam: ter uma nunca bloqueia comprar outra.
export default function PlanosGuiaZR({ onAssinar }) {
  const { data: ofertas = [] } = useQuery({
    queryKey: ["configuracao-planos-zr"],
    queryFn: () => base44.entities.ConfiguracaoPlano.filter({ produto: "guia_zr" }, "ordem"),
  });
  const { data: ofertasPublicas = [] } = useQuery({
    queryKey: ["ofertas-zr-condicoes-comerciais"],
    queryFn: async () => (await base44.functions.invoke("ofertasGuiaZR", {})).data?.ofertas || [],
  });
  const { data: direito } = useQuery({
    queryKey: ["direito-guia-zr"],
    queryFn: async () => (await base44.functions.invoke("direitoAcessoGuiaZR", {})).data,
    staleTime: 60 * 1000,
  });

  const porId = Object.fromEntries(ofertas.map((o) => [o.plano_id, o]));
  const condicoesPorId = Object.fromEntries(ofertasPublicas.map((o) => [o.plano_id, o]));
  const minhasFaixas = Object.fromEntries((direito?.faixas || []).map((f) => [f.faixa, f]));
  if (!ofertas.length) return null;

  return (
    <div className="mt-12 pt-8 border-t">
      <div className="text-center mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Guia Técnico ZR
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          99 capítulos e 18 anexos. Cada faixa vale 12 meses, com as atualizações do período — e as faixas somam entre si.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {FAIXAS_ZR.map(({ faixa, planoId, renovacaoId }) => {
          const oferta = porId[planoId];
          if (!oferta) return null;
          const minha = minhasFaixas[faixa];
          const renovacao = porId[renovacaoId];
          const usarRenovacao = !!minha && !minha.vitalicio && !!renovacao;
          const alvo = usarRenovacao ? renovacao : oferta;
          const vendaLiberada = !!alvo.venda_habilitada;
          const parcelasSemJuros = Number(condicoesPorId[alvo.plano_id]?.parcelas_sem_juros || 1);

          return (
            <PlanoCard
              key={planoId}
              planoId={alvo.plano_id}
              nome={oferta.nome}
              subtitulo={oferta.subtitulo}
              preco={formatarPreco(alvo)}
              precoDetalhe={usarRenovacao ? alvo.preco_detalhe : (textoPrecoPromocional(alvo) || alvo.preco_detalhe)}
              parcelamentoDetalhe={parcelasSemJuros > 1 ? `Até ${parcelasSemJuros}x sem juros` : ""}
              beneficios={alvo.beneficios}
              selo={minha ? (minha.vitalicio ? "Acesso vitalício" : `Ativo até ${formatarData(minha.vence_em)}`) : ""}
              destaque={!minha && !!oferta.mais_popular}
              botaoLabel={usarRenovacao ? "Renovar por 12 meses" : "Comprar acesso"}
              onClick={() => onAssinar(alvo.plano_id, alvo.nome, Number(alvo.valor_cobranca || 0))}
              bloqueado={!vendaLiberada || (!!minha && minha.vitalicio)}
              mensagemBloqueio={minha?.vitalicio ? "Você já tem acesso vitalício a esta faixa" : "Venda em preparação"}
              complemento={<AvisoDesistencia compacto />}
            />
          );
        })}
      </div>
    </div>
  );
}