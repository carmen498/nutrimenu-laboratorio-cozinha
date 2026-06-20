import { Link } from "react-router-dom";
import { BookOpen, Plus, ShoppingCart, Apple, CalendarDays, Gauge, ArrowRight, AlertTriangle, Clock } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CORES = {
  verdeEscuro: "#1B4332",
  dourado: "#B8860B",
  verdeMedio: "#40916C",
  laranjaSuave: "#F4A261",
  azulSuave: "#457B9D",
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

  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas-recentes-home"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 3),
  });

  const { data: cardapios = [] } = useQuery({
    queryKey: ["cardapios-recentes-home"],
    queryFn: () => base44.entities.Cardapio.list("-created_date", 2),
  });

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

  const formatCurrency = (v) =>
    v != null ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "—";

  return (
    <div className="space-y-8 pb-24 md:pb-8" style={{ background: "linear-gradient(180deg, #F9F6F0 0%, #FFFFFF 40%)", margin: "-1.5rem -1rem 0", padding: "1.5rem 1rem 0" }}>
      {/* Hero */}
      <div className="text-center pt-8 pb-4">
        <div className="inline-flex items-center justify-center mb-5">
          <img
            src="https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/a5c36b28a_IMAGEMlABORATORIODECOZINHA.png"
            alt="Laboratório de Cozinha"
            className="w-[160px] h-[160px] rounded-full object-cover shadow-lg"
          />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight"
          style={{ color: CORES.verdeEscuro }}>
          Laboratório de Cozinha
        </h1>
        <p className="mt-1 text-base font-semibold" style={{ color: CORES.dourado }}>Cozinha que se Multiplica</p>
        <p className="mt-2 text-sm font-medium italic"
          style={{ color: CORES.dourado }}>
          Gastronomia Planejada · por Carmen Reinstein
        </p>
        <p className="text-lg text-muted-foreground mt-4 font-medium">
          O que vamos cozinhar hoje?
        </p>
      </div>

      {/* Grid 3×2 de módulos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Receitas — dark green */}
        <Link to="/receitas">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 group text-white h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#1B4332", minHeight: 130 }}>
            <BookOpen className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-base text-center">Receitas</span>
          </Card>
        </Link>

        {/* Cardápios — medium green */}
        <Link to="/cardapios">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 group text-white h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#40916C", minHeight: 130 }}>
            <CalendarDays className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-base text-center">Cardápios</span>
          </Card>
        </Link>

        {/* Lista de Compras — light gray */}
        <Link to="/lista-compras">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border group h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#F5F5F5", borderColor: "#E0E0E0", minHeight: 130 }}>
            <ShoppingCart className="w-10 h-10 group-hover:scale-110 transition-transform"
              style={{ color: "#333333" }} />
            <span className="font-bold text-base text-center" style={{ color: "#333333" }}>Lista de Compras</span>
          </Card>
        </Link>

        {/* Ingredientes — orange */}
        <Link to="/ingredientes">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 group text-white h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#F4A261", minHeight: 130 }}>
            <Apple className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-base text-center">Ingredientes</span>
          </Card>
        </Link>

        {/* Per Capita — blue */}
        <Link to="/percapita">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 group text-white h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#457B9D", minHeight: 130 }}>
            <Gauge className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-base text-center">Per Capita</span>
          </Card>
        </Link>

        {/* Nova Receita — wine #8B3A52 */}
        <Link to="/receitas?nova=manual">
          <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-0 group text-white h-full flex flex-col items-center justify-center gap-4"
            style={{ background: "#8B3A52", minHeight: 130 }}>
            <Plus className="w-10 h-10 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-base text-center">Nova Receita</span>
          </Card>
        </Link>
      </div>

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

          {/* Últimas receitas */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Últimas receitas acessadas
            </h3>
            {receitas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma receita ainda.</p>
            ) : (
              <div className="space-y-2">
                {receitas.map(r => (
                  <Link key={r.id} to={`/receita/${r.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.nome?.toUpperCase?.() || r.nome}</p>
                      <p className="text-xs text-muted-foreground">{r.categoria || ""}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Últimos cardápios */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Últimos cardápios
            </h3>
            {cardapios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum cardápio ainda.</p>
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
            <Link to="/ingredientes" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Badge className="text-sm px-3 py-1.5" variant={aRevisar.length > 0 ? "destructive" : "secondary"}>
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                {aRevisar.length} {aRevisar.length === 1 ? "item" : "itens"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {aRevisar.length > 0 ? "Precisam de atenção" : "Tudo em dia ✓"}
              </span>
            </Link>
          </Card>

          {/* Próxima atualização de preços */}
          <Card className="p-4 bg-white border" style={{ borderColor: "#E8E0D5" }}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Atualização de preços
            </h3>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" style={{ color: CORES.verdeEscuro }} />
              <div>
                <p className="text-sm font-medium" style={{ color: CORES.verdeEscuro }}>
                  {formatarProximaAtualizacao()}
                </p>
                <p className="text-xs text-muted-foreground">Automática · IA web</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Rodapé */}
      <div className="text-center pt-6 pb-4 border-t" style={{ borderColor: "#E8E0D5" }}>
        <p className="text-xs text-muted-foreground italic">
          Laboratório de Cozinha · Gastronomia Planejada · por Carmen Reinstein · 2026
        </p>
      </div>
    </div>
  );
}