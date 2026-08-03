import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Trash2, Star } from "lucide-react";
import ExcluirIngredienteDialog from "@/components/ingrediente/ExcluirIngredienteDialog";

const GRUPOS_INGREDIENTES = [
  { nome: "Carnes e Ovos",            icone: "🥩", cor: "#FFEBEE", corTexto: "#C62828", corPill: "#FFCDD2", corPillTexto: "#B71C1C", match: ["Carnes e Ovos"] },
  { nome: "Peixes e Frutos do Mar",   icone: "🐟", cor: "#E3F2FD", corTexto: "#1565C0", corPill: "#BBDEFB", corPillTexto: "#0D47A1", match: ["Peixes e Frutos do Mar"] },
  { nome: "Laticínios",               icone: "🥛", cor: "#F3E5F5", corTexto: "#6A1B9A", corPill: "#E1BEE7", corPillTexto: "#4A148C", match: ["Laticínios"] },
  { nome: "Panificação e Cereais",    icone: "🌾", cor: "#EFEBE9", corTexto: "#4E342E", corPill: "#D7CCC8", corPillTexto: "#3E2723", match: ["Panificação e Cereais"] },
  { nome: "Verduras e Hortaliças",    icone: "🥦", cor: "#F1F8E9", corTexto: "#558B2F", corPill: "#DCEDC8", corPillTexto: "#33691E", match: ["Verduras e Hortaliças"] },
  { nome: "Açúcares e Doces",         icone: "🍬", cor: "#FCE4EC", corTexto: "#AD1457", corPill: "#F8BBD0", corPillTexto: "#880E4F", match: ["Açúcares e Doces"] },
  { nome: "Óleos e Gorduras",         icone: "🫒", cor: "#FFFDE7", corTexto: "#F9A825", corPill: "#FFF176", corPillTexto: "#F57F17", match: ["Óleos e Gorduras"] },
  { nome: "Temperos",                 icone: "🌶️", cor: "#FBE9E7", corTexto: "#BF360C", corPill: "#FFCCBC", corPillTexto: "#A3150B", match: ["Temperos"] },
  { nome: "Frutas",                   icone: "🍎", cor: "#FCE4EC", corTexto: "#880E4F", corPill: "#F8BBD0", corPillTexto: "#880E4F", match: ["Frutas"] },
  { nome: "Conservas e Enlatados",    icone: "🥫", cor: "#FFF9C4", corTexto: "#F57F17", corPill: "#FFF176", corPillTexto: "#E65100", match: ["Conservas e Enlatados"] },
  { nome: "Diversos",                 icone: "📦", cor: "#F5F5F5", corTexto: "#424242", corPill: "#E0E0E0", corPillTexto: "#212121", match: ["Diversos"] },
  { nome: "A Revisar",                icone: "⚠️", cor: "#FFF8E1", corTexto: "#F57F17", corPill: "#FFE082", corPillTexto: "#E65100", match: ["A Revisar"] },
];

const getGrupoFromCategoria = (cat) => {
  if (!cat) return "A Revisar";
  for (const g of GRUPOS_INGREDIENTES) {
    if (g.match.includes(cat)) return g.nome;
  }
  return "Diversos";
};

export default function ListaIngredientes({
  ingredientes,
  accordionAberto,
  buscaInterna,
  setBuscaInterna,
  diasDesdeAtualizacao,
  formatIngredientPrice,
  favoritarMut,
  onDeleteComplete,
  setEditItem,
  setShowForm,
}) {
  const [excluirIng, setExcluirIng] = useState(null);
  const [editarAlertIng, setEditarAlertIng] = useState(null);
  const [limit, setLimit] = useState(150);
  const grupoAtivo = GRUPOS_INGREDIENTES.find((g) => g.nome === accordionAberto);

  useEffect(() => {
    setLimit(150);
  }, [accordionAberto, buscaInterna, ingredientes]);

  const itemsDoGrupo = useMemo(() => {
    if (!accordionAberto || !grupoAtivo) return [];
    return ingredientes
      .filter((i) => {
        if (!buscaInterna) return true;
        return i.nome?.toLowerCase().includes(buscaInterna.toLowerCase());
      })
      .sort((a, b) => a.nome?.localeCompare(b.nome));
  }, [accordionAberto, ingredientes, buscaInterna, grupoAtivo]);

  const todosAgrupados = useMemo(() => {
    const map = {};
    ingredientes.forEach((i) => {
      const g = getGrupoFromCategoria(i.categoria);
      if (!map[g]) map[g] = [];
      map[g].push(i);
    });
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.nome?.localeCompare(b.nome));
    }
    return map;
  }, [ingredientes]);

  const isTodasCategorias = !accordionAberto;

  const renderLinha = (ing) => {
    const dias = diasDesdeAtualizacao(ing);
    let statusEl;
    if (ing.preco_atualizado_em && dias !== null && dias <= 30) {
      statusEl = (
        <span className="text-green-600 text-xs whitespace-nowrap">
          🟢 {new Date(ing.preco_atualizado_em).toLocaleDateString("pt-BR")}
        </span>
      );
    } else if (ing.preco_atualizado_em && dias !== null && dias <= 90) {
      statusEl = (
        <span className="text-amber-600 text-xs whitespace-nowrap">
          🟡 {new Date(ing.preco_atualizado_em).toLocaleDateString("pt-BR")}
        </span>
      );
    } else {
      statusEl = (
        <span className="text-red-600 text-xs font-medium whitespace-nowrap">
          🔴 Desatualizado
        </span>
      );
    }

    return (
      <div
        key={ing.id}
        className="flex items-center gap-2 px-3 border-b border-border/50 hover:bg-muted/30 transition-colors"
        style={{ minHeight: "44px" }}
      >
        <div className="flex-1 min-w-0" style={{ flexBasis: "40%" }}>
          <Link to={`/ingrediente/${ing.id}`} className="text-sm font-medium truncate hover:underline hover:text-primary block">
            {ing.nome}
            {(ing.fator_correcao && ing.fator_correcao !== 1.0) && (
              <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                FC {String(ing.fator_correcao).replace(".", ",")}
              </span>
            )}
          </Link>
        </div>
        <div className="text-xs text-muted-foreground whitespace-nowrap" style={{ flexBasis: "25%" }}>
          {formatIngredientPrice(ing)}
        </div>
        <div className="text-xs whitespace-nowrap" style={{ flexBasis: "20%" }}>
          {statusEl}
        </div>
        <div className="flex items-center gap-0.5 shrink-0" style={{ flexBasis: "15%", justifyContent: "flex-end" }}>
          <button
            className={`p-1 rounded-full hover:bg-muted ${favoritarMut.isPending ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => favoritarMut.mutate({ id: ing.id, favorito: !ing.favorito })}
            disabled={favoritarMut.isPending}
            title={ing.favorito ? "Remover dos favoritos" : "Marcar como favorito"}
          >
            <Star className={`w-3.5 h-3.5 ${ing.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditarAlertIng(ing)}>
            <Pencil className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setExcluirIng(ing)}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  if (accordionAberto && grupoAtivo) {
    return (
      <>
        <div className="rounded-xl border border-border overflow-hidden">
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ backgroundColor: grupoAtivo.cor }}
          >
            <span className="text-lg">{grupoAtivo.icone}</span>
            <span className="font-semibold text-sm flex-1" style={{ color: grupoAtivo.corTexto }}>
              {grupoAtivo.nome} — {itemsDoGrupo.length} ingredientes
            </span>
            <div className="relative w-56">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder={`Buscar dentro de ${grupoAtivo.nome}...`}
                value={buscaInterna}
                onChange={(e) => setBuscaInterna(e.target.value)}
                className="h-8 pl-7 text-xs bg-white/70 border-0 focus-visible:ring-1"
              />
            </div>
          </div>
          {itemsDoGrupo.length > 0 ? (
            <div className="bg-card">
              {itemsDoGrupo.slice(0, limit).map(renderLinha)}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground bg-card">
              {buscaInterna ? "Nenhum ingrediente encontrado nesta busca." : "Nenhum ingrediente nesta categoria."}
            </div>
          )}
        </div>
        {itemsDoGrupo.length > limit && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 150)}>
              Carregar mais ({itemsDoGrupo.length - limit} restantes)
            </Button>
          </div>
        )}
        <ExcluirIngredienteDialog
          open={!!excluirIng}
          onClose={() => setExcluirIng(null)}
          ingrediente={excluirIng}
          mode="delete"
          onConfirm={() => { setExcluirIng(null); onDeleteComplete(); }}
        />
        <ExcluirIngredienteDialog
          open={!!editarAlertIng}
          onClose={() => setEditarAlertIng(null)}
          ingrediente={editarAlertIng}
          mode="edit"
          onConfirm={() => { const ing = editarAlertIng; setEditarAlertIng(null); setEditItem(ing); setShowForm(true); }}
        />
      </>
    );
  }

  if (isTodasCategorias) {
    const grupos = Object.keys(todosAgrupados);
    if (grupos.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum ingrediente encontrado</p>
          <p className="text-sm mt-1">Importe um CSV ou cadastre manualmente.</p>
        </div>
      );
    }

    const gruposComItens = GRUPOS_INGREDIENTES.filter((g) => todosAgrupados[g.nome]?.length > 0);
    const totalGeral = gruposComItens.reduce((s, g) => s + (todosAgrupados[g.nome]?.length || 0), 0);
    let restante = limit;

    return (
      <>
        <div className="space-y-6">
          {gruposComItens.map((g) => {
            const items = todosAgrupados[g.nome] || [];
            const visiveis = restante > 0 ? items.slice(0, restante) : [];
            restante -= visiveis.length;
            if (visiveis.length === 0) return null;
            return (
              <div key={g.nome} className="rounded-xl border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ backgroundColor: g.cor }}
                >
                  <span className="text-lg">{g.icone}</span>
                  <span className="font-semibold text-sm" style={{ color: g.corTexto }}>
                    {g.nome} — {items.length} ingredientes
                  </span>
                </div>
                <div className="bg-card">
                  {visiveis.map(renderLinha)}
                </div>
              </div>
            );
          })}
        </div>
        {totalGeral > limit && (
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={() => setLimit((l) => l + 150)}>
              Carregar mais ({totalGeral - limit} restantes)
            </Button>
          </div>
        )}
        <ExcluirIngredienteDialog
          open={!!excluirIng}
          onClose={() => setExcluirIng(null)}
          ingrediente={excluirIng}
          mode="delete"
          onConfirm={() => { setExcluirIng(null); onDeleteComplete(); }}
        />
        <ExcluirIngredienteDialog
          open={!!editarAlertIng}
          onClose={() => setEditarAlertIng(null)}
          ingrediente={editarAlertIng}
          mode="edit"
          onConfirm={() => { const ing = editarAlertIng; setEditarAlertIng(null); setEditItem(ing); setShowForm(true); }}
        />
      </>
    );
  }

  return null;
}