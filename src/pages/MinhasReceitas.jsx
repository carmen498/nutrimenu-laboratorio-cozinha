import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ChefHat, LayoutGrid, User, ArrowLeft } from "lucide-react";
import { CATEGORIAS as CATEGORIAS_RECEITA, ICONE_CATEGORIA } from "@/components/receita/CategoriaPicker";
import { getCategorias, hasCategoria } from "@/lib/categoriasHelper";
import { normalizarNome } from "@/lib/normalizarNome";
import { getCorHex } from "@/lib/coresReceita";

export default function MinhasReceitas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["minhas-receitas", user?.id],
    queryFn: () => base44.entities.Receita.filter({ usuario_dono_id: user.id }, "-data_personalizacao", 500),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const totalReceitas = receitas.length;

  const filtered = receitas.filter((r) => {
    const matchBusca = !busca || normalizarNome(r.nome).includes(normalizarNome(busca));
    const matchCat = !categoriaSelecionada || hasCategoria(r, categoriaSelecionada);
    return matchBusca && matchCat;
  });

  const formatCurrency = (v) => (v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "");
  const formatData = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">
            Minhas Receitas <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{totalReceitas}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suas cópias pessoais de receitas do Laboratório, criadas automaticamente ao editar uma receita original.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar em minhas receitas..."
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setCategoriaSelecionada(null); }}
          className="pl-9"
        />
      </div>

      {/* Category filter */}
      <button
        onClick={() => { setCategoriaSelecionada(null); setBusca(""); }}
        className={`w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border-2 ${
          !categoriaSelecionada
            ? "border-primary bg-primary/10 text-primary"
            : "border-transparent bg-muted hover:bg-accent text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
        Todas as minhas receitas
        <Badge className="text-[10px] bg-primary/20 text-primary">{totalReceitas}</Badge>
      </button>

      {totalReceitas > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
          {CATEGORIAS_RECEITA.filter((cat) => receitas.filter((r) => hasCategoria(r, cat)).length > 0).map((cat) => {
            const count = receitas.filter((r) => hasCategoria(r, cat)).length;
            const selecionada = categoriaSelecionada === cat;
            const icone = ICONE_CATEGORIA[cat] || "📋";
            return (
              <button
                key={cat}
                onClick={() => { setBusca(""); setCategoriaSelecionada(selecionada ? null : cat); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  selecionada ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-muted hover:bg-accent"
                }`}
              >
                <span>{icone}</span>
                <span className="flex-1 text-left truncate">{cat}</span>
                <Badge className="text-[10px] bg-primary/20 text-primary">{count}</Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhuma receita personalizada ainda</p>
          <p className="text-sm mt-1">
            Ao editar uma receita do catálogo, sua cópia pessoal aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.sort((a, b) => a.nome?.localeCompare(b.nome)).map((r) => (
            <Link key={r.id} to={`/receita/${r.id}`}>
              <Card className="pl-3 pr-2 py-2.5 flex items-center gap-3 hover:bg-accent/40 transition-colors">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: r.cor_predominante ? getCorHex(r.cor_predominante) : "#BDBDBD" }}
                />
                <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="font-medium text-sm">{r.nome}</p>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0 gap-1">
                    <User className="w-2.5 h-2.5" /> Personalizada
                  </Badge>
                  {getCategorias(r).length > 0 && (
                    <span className="text-[11px] text-muted-foreground shrink-0">{getCategorias(r)[0]}</span>
                  )}
                  {r.data_personalizacao && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      personalizada em {formatData(r.data_personalizacao)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-primary whitespace-nowrap shrink-0">
                  {r.custo_por_porcao != null && r.custo_por_porcao > 0 ? `${formatCurrency(r.custo_por_porcao)} /porção` : "—"}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}