import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, Clock } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AtualizarPrecosDialog from "@/components/ingrediente/AtualizarPrecosDialog";
import IndicadoresHome from "@/components/home/IndicadoresHome";
import AcoesPrincipaisHome from "@/components/home/AcoesPrincipaisHome";
import IntegracoesReceitaHome from "@/components/home/IntegracoesReceitaHome";
import ReceitaDestaqueCard from "@/components/home/ReceitaDestaqueCard";

const CORES = {
  verdeEscuro: "#2A4E3D",
  dourado: "#B8860B",
};

function getProximaSegunda3h() {
  const now = new Date();
  const diasAteSegunda = (8 - now.getDay()) % 7 || 7; // 0=dom, 1=seg...
  const proxima = new Date(now);
  proxima.setDate(now.getDate() + diasAteSegunda);
  proxima.setHours(3, 0, 0, 0);
  // Se já passou dessa segunda 3h, pega a próxima
  if (proxima <= now) proxima.setDate(proxima.getDate() + 7);
  return proxima;
}

function formatarProximaAtualizacao() {
  const data = getProximaSegunda3h();
  const hoje = new Date();
  const diffDias = Math.round((data - hoje) / (1000 * 60 * 60 * 24));
  if (diffDias === 0) return "Hoje às 3h";
  if (diffDias === 1) return "Amanhã às 3h";
  const dias = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  return `${dias[data.getDay()]} às 3h`;
}

export default function Home() {
  const [showAtualizarPrecos, setShowAtualizarPrecos] = useState(false);

  // Todas as receitas, ordenadas por data real de atualização (updated_date).
  // Usada para: contagem total, contagem de "atualizadas nos últimos 30 dias"
  // e a lista de receitas atualizadas recentemente.
  const { data: receitasTodas = [], isLoading: carregandoReceitas } = useQuery({
    queryKey: ["receitas-todas-home"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 5000),
  });

  // Todos os cardápios, ordenados por data real de atualização (updated_date).
  const { data: cardapiosTodos = [], isLoading: carregandoCardapios } = useQuery({
    queryKey: ["cardapios-todos-home"],
    queryFn: () => base44.entities.Cardapio.list("-updated_date", 5000),
  });

  // Todos os ingredientes — usado apenas para a contagem total real.
  const { data: ingredientesTodos = [], isLoading: carregandoIngredientes } = useQuery({
    queryKey: ["ingredientes-todos-home"],
    queryFn: () => base44.entities.Ingrediente.list("-updated_date", 5000),
  });

  const ha30Dias = new Date();
  ha30Dias.setDate(ha30Dias.getDate() - 30);

  const receitasAtualizadas30d = receitasTodas.filter(
    (r) => r.updated_date && new Date(r.updated_date) >= ha30Dias
  );

  const receitasRecentes = receitasAtualizadas30d.slice(0, 6);
  const cardapios = cardapiosTodos.slice(0, 5);
  const carregandoIndicadores = carregandoReceitas || carregandoCardapios || carregandoIngredientes;

  // Vitrine de receitas: usa as marcadas manualmente como "destaque" se houver 3+,
  // senão mantém o comportamento atual (mais recentemente atualizadas)
  const { data: receitasDestaqueRaw = [] } = useQuery({
    queryKey: ["receitas-destaque-home"],
    queryFn: () => base44.entities.Receita.filter({ destaque: true }, "-updated_date", 10),
  });
  const receitasVitrine = receitasDestaqueRaw.length >= 3 ? receitasDestaqueRaw.slice(0, 6) : receitasRecentes;

  const { data: aRevisar = [] } = useQuery({
    queryKey: ["ingredientes-revisar-home"],
    queryFn: () => base44.entities.Ingrediente.filter({ revisar: true }, "-updated_date", 50),
  });

  const { data: receitasRevisar = [] } = useQuery({
    queryKey: ["receitas-revisar-home"],
    queryFn: () => base44.entities.Receita.filter({ revisar: true }, "-updated_date", 100),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: ultimoLog } = useQuery({
    queryKey: ["ultimo-log-precos"],
    queryFn: async () => {
      const logs = await base44.entities.LogAtualizacaoPrecos.filter({ tipo: "automático" }, "-data_execucao", 1);
      return logs[0] || null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: autoUpdateStatus } = useQuery({
    queryKey: ["auto-update-status"],
    queryFn: async () => {
      const res = await base44.functions.invoke("gerenciarAtualizacaoAutomatica", { acao: "status" });
      return res.data;
    },
  });

  const { data: ingredientesParaDialogo = [] } = useQuery({
    queryKey: ["ingredientes-para-dialogo-precos"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
    enabled: showAtualizarPrecos,
  });

  const autoUpdateAtiva = autoUpdateStatus?.ativa || false;

  const formatarUltimaExecucao = () => {
    if (!ultimoLog?.data_execucao) return null;
    return new Date(ultimoLog.data_execucao).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-8 pb-24 md:pb-8" style={{ background: "linear-gradient(180deg, #F9F6F0 0%, #FFFFFF 40%)", margin: "-1.5rem -1rem 0", padding: "1.5rem 1rem 0" }}>
      {/* Hero */}
      <div className="pt-8 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="text-left flex flex-col justify-center">
            <div className="flex items-center gap-5">
              <img
                src="https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/a5c36b28a_IMAGEMlABORATORIODECOZINHA.png"
                alt="Laboratório de Cozinha"
                className="w-[160px] h-[160px] rounded-full object-cover shadow-lg shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight whitespace-nowrap"
                  style={{ color: CORES.verdeEscuro }}>
                  Laboratório de Cozinha
                </h1>
                <p className="mt-1 text-2xl md:text-3xl font-script whitespace-nowrap" style={{ color: CORES.dourado }}>Receitas que se Multiplicam</p>
                <p className="mt-2 text-sm font-medium italic"
                  style={{ color: CORES.dourado }}>
                  Gastronomia Planejada · por Carmen Reinstein
                </p>
              </div>
            </div>
          </div>
          <div className="h-[280px] md:h-auto flex items-center justify-center">
            <img
              src="https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/21e2a78bb_12ImagenscapaInico.png"
              alt="Farinha, ovos e batedor sobre pano de linho"
              width="600"
              height="360"
              className="w-[82%] h-[82%] object-contain mx-auto"
            />
          </div>
        </div>
        <p className="text-lg text-muted-foreground mt-4 font-medium text-center">
          O que vamos cozinhar hoje?
        </p>
      </div>

      {/* Ações principais */}
      <AcoesPrincipaisHome />

      {/* Indicadores reais */}
      <IndicadoresHome
        receitas={receitasTodas.length}
        ingredientes={ingredientesTodos.length}
        cardapios={cardapiosTodos.length}
        receitasAtualizadas={receitasAtualizadas30d.length}
        loading={carregandoIndicadores}
      />

      {/* Acesso rápido */}
      <div>
        <h2 className="font-display text-xl font-bold mb-4" style={{ color: CORES.verdeEscuro }}>
          Acesso rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Receitas a revisar — destaque */}
          {receitasRevisar.length > 0 && (
            <Card className="p-4 border-2 md:col-span-2" style={{ borderColor: "#E8A317", background: "linear-gradient(135deg, #FFFDF5 0%, #FFF8E1 100%)" }}>
              <Link to="/receitas?revisar=true" className="flex items-center justify-between gap-4 hover:opacity-90 transition-opacity">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FFF3CD" }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: "#B8860B" }} />
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: "#7A5D00" }}>
                      {receitasRevisar.length} {receitasRevisar.length === 1 ? "receita" : "receitas"} aguardando revisão
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Receitas importadas por IA que precisam da sua conferência
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: "#B8860B" }} />
              </Link>
            </Card>
          )}

          {/* Receitas atualizadas recentemente / vitrine de destaques manuais */}
          <Card className="p-4 bg-white border md:col-span-2" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Receitas atualizadas recentemente
            </h3>
            {receitasVitrine.length === 0 ? (
              <p className="text-sm text-muted-foreground">Você ainda não possui receitas recentes.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {receitasVitrine.map((r) => (
                  <ReceitaDestaqueCard key={r.id} receita={r} />
                ))}
              </div>
            )}
          </Card>

          {/* Cardápios recentes — ordenados por data real de atualização */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Cardápios recentes
            </h3>
            {cardapios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cardápio encontrado.</p>
            ) : (
              <div className="space-y-2">
                {cardapios.map(c => (
                  <Link key={c.id} to={`/cardapio/${c.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.nome?.toUpperCase?.() || c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.tipo || ""}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Ingredientes a revisar */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Ingredientes a revisar
            </h3>
            <Link to="/ingredientes?revisar=true" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Badge className="text-sm px-3 py-1.5 border-0 text-white bg-amber-500 hover:bg-amber-500">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {aRevisar.length} {aRevisar.length === 1 ? "item" : "itens"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {aRevisar.length > 0 ? "Precisam de atenção" : "Tudo em dia ✓"}
              </span>
            </Link>
          </Card>

          {/* Atualização de preços — estado real */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Atualização de preços
            </h3>
            <button
              onClick={() => setShowAtualizarPrecos(true)}
              className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
            >
              <Clock className="w-5 h-5" style={{ color: CORES.verdeEscuro }} />
              <div>
                {autoUpdateAtiva ? (
                  <>
                    <p className="text-sm font-medium" style={{ color: CORES.verdeEscuro }}>
                      {formatarProximaAtualizacao()}
                    </p>
                    <p className="text-xs text-muted-foreground">Automática · IA web</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium" style={{ color: CORES.verdeEscuro }}>
                      Pausada{formatarUltimaExecucao() ? ` · última execução ${formatarUltimaExecucao()}` : " · nunca executada"}
                    </p>
                    <p className="text-xs text-muted-foreground">Toque para atualizar preços manualmente</p>
                  </>
                )}
              </div>
            </button>
          </Card>
        </div>
      </div>

      {/* Integrações da sua Receita — vitrine institucional, sem integração funcional real */}
      <IntegracoesReceitaHome />

      <AtualizarPrecosDialog
        open={showAtualizarPrecos}
        onClose={() => setShowAtualizarPrecos(false)}
        ingredientes={ingredientesParaDialogo}
      />

      {/* Rodapé */}
      <div className="text-center pt-6 pb-4 border-t" style={{ borderColor: "#E8E0D5" }}>
        <p className="text-xs text-muted-foreground italic">
          Laboratório de Cozinha · Gastronomia Planejada · por Carmen Reinstein · 2026
        </p>
      </div>
    </div>
  );
}