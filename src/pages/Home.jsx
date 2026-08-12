import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import IndicadoresHome from "@/components/home/IndicadoresHome";
import AcoesPrincipaisHome from "@/components/home/AcoesPrincipaisHome";
import IntegracoesReceitaHome from "@/components/home/IntegracoesReceitaHome";
import ReceitaDestaqueCard from "@/components/home/ReceitaDestaqueCard";
import DicasCarmenCarousel from "@/components/home/DicasCarmenCarousel";

const CORES = {
  verdeEscuro: "#2A4E3D",
  dourado: "#B8860B",
};

export default function Home() {
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

  const carregandoIndicadores = carregandoReceitas || carregandoCardapios || carregandoIngredientes;

  // Vitrine "Fichas Técnicas em Destaque": usa as marcadas manualmente (campo `destaque`),
  // as 3 últimas marcadas. Sem nenhuma marcada, cai no fallback: as 3 receitas mais
  // recentemente atualizadas que tenham foto cadastrada.
  const { data: receitasDestaqueRaw = [] } = useQuery({
    queryKey: ["receitas-destaque-home"],
    queryFn: () => base44.entities.Receita.filter({ destaque: true }, "-updated_date", 10),
  });
  const receitasComFoto = receitasTodas.filter((r) => r.foto_url).slice(0, 3);
  const receitasVitrine = receitasDestaqueRaw.length > 0 ? receitasDestaqueRaw.slice(0, 3) : receitasComFoto;

  const { data: receitasRevisar = [] } = useQuery({
    queryKey: ["receitas-revisar-home"],
    queryFn: () => base44.entities.Receita.filter({ revisar: true }, "-updated_date", 100),
    staleTime: 0,
    refetchOnMount: "always",
  });

  return (
    <div className="space-y-8 pb-24 md:pb-8" style={{ background: "linear-gradient(180deg, #F9F6F0 0%, #FFFFFF 40%)", margin: "-1.5rem -1rem 0", padding: "0.25rem 1rem 0" }}>
      {/* Hero */}
      <div className="pt-0 pb-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-1">
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
        <p className="text-lg text-muted-foreground -mt-5 font-medium text-center">
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

      {/* Receitas a revisar — destaque */}
      {receitasRevisar.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4" style={{ color: CORES.verdeEscuro }}>
            Acesso rápido
          </h2>
          <Card className="p-4 border-2" style={{ borderColor: "#E8A317", background: "linear-gradient(135deg, #FFFDF5 0%, #FFF8E1 100%)" }}>
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
        </div>
      )}

      {/* Fichas Técnicas em Destaque, Integrações da sua Receita e Atualização de Preços — agrupados e compactos */}
      <div className="space-y-4">
        {/* Fichas Técnicas em Destaque: curadoria manual (campo `destaque`) com fallback por foto */}
        <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Fichas Técnicas em Destaque
            </h3>
            <Link to="/receitas" className="text-xs font-semibold" style={{ color: CORES.verdeEscuro }}>
              Ver todas
            </Link>
          </div>
          {receitasVitrine.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não possui receitas em destaque.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {receitasVitrine.map((r) => (
                <ReceitaDestaqueCard key={r.id} receita={r} />
              ))}
            </div>
          )}
        </Card>

        {/* Dicas da Carmen — carrossel dinâmico das dicas publicadas em destaque */}
        <DicasCarmenCarousel />

        {/* Integrações da sua Receita — vitrine institucional, sem integração funcional real */}
        <IntegracoesReceitaHome />
      </div>

      {/* Rodapé */}
      <div className="pt-6 pb-4 border-t flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2" style={{ borderColor: "#E8E0D5" }}>
        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Laboratório de Cozinha é parte da Plataforma ZR · Todos os direitos reservados
        </p>
        <p className="text-sm font-script italic" style={{ color: "#B8860B" }}>
          Boas receitas, sempre! ♥
        </p>
      </div>
    </div>
  );
}