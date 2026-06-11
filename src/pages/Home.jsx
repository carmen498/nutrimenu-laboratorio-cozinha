import { Link } from "react-router-dom";
import { BookOpen, Plus, ShoppingCart, Apple, ChefHat, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";

export default function Home() {
  const { data: receitas = [] } = useQuery({
    queryKey: ["receitas-recentes"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 6),
  });

  const formatCurrency = (v) =>
    v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "—";

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      {/* Hero */}
      <div className="text-center pt-6 pb-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <ChefHat className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Receita na Medida
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">por Carmen Reinstein</p>
        <p className="text-lg text-muted-foreground mt-4 font-medium">
          O que vamos cozinhar hoje?
        </p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/receitas">
          <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/30 group">
            <BookOpen className="w-7 h-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Minhas Receitas</span>
          </Card>
        </Link>
        <Link to="/receitas?nova=manual">
          <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/30 group bg-primary text-primary-foreground">
            <Plus className="w-7 h-7 mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Nova Receita</span>
          </Card>
        </Link>
        <Link to="/lista-compras">
          <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/30 group">
            <ShoppingCart className="w-7 h-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Lista de Compras</span>
          </Card>
        </Link>
        <Link to="/ingredientes">
          <Card className="p-5 hover:shadow-md transition-all cursor-pointer border-2 hover:border-primary/30 group">
            <Apple className="w-7 h-7 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-sm">Ingredientes e Preços</span>
          </Card>
        </Link>
      </div>

      {/* Recent recipes */}
      {receitas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold">Últimas Receitas</h2>
            <Link to="/receitas" className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {receitas.map((r) => (
              <Link key={r.id} to={`/receita/${r.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-all group cursor-pointer">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {r.foto_url ? (
                      <img
                        src={r.foto_url}
                        alt={r.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <ChefHat className="w-10 h-10 text-primary/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-sm truncate">{r.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.categoria}</p>
                    {r.custo_por_porcao != null && (
                      <p className="text-xs font-bold text-primary mt-1">
                        {formatCurrency(r.custo_por_porcao)} /porção
                      </p>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}