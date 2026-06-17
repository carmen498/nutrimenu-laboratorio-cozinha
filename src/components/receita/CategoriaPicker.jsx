import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, ChevronDown } from "lucide-react";

export const CATEGORIAS = [
  // ACOMPANHAMENTOS
  "Acompanhamentos, Arroz e Risotos",
  "Acompanhamentos, Legumes e Hortaliças",
  "Acompanhamentos, Grãos e Leguminosas",
  "Acompanhamentos, Complementos",
  "Acompanhamentos, Molhos",
  // CARNES
  "Carnes, Aves",
  "Carnes, Bacalhau",
  "Carnes, Bovina",
  "Carnes, Frutos do mar",
  "Carnes, Peixes",
  "Carnes, Suína",
  // MASSAS
  "Massas, Macarrão",
  "Massas, Panquecas e Crepes",
  "Massas, Pastelão e Quiches",
  // ENTRADAS
  "Entradas, Mousses, Terrines e Patês",
  "Entradas, Quentes",
  "Entradas, Saladas",
  "Entradas, Sopas, Cremes e Caldos",
  "Entradas, Aperitivos e Petiscos",
  // LANCHES
  "Lanches, Sanduíches",
  "Lanches, Pastel",
  "Lanches, Pizza",
  "Lanches, Lanche",
  // PANIFICAÇÃO
  "Panificação, Bolos e Cakes",
  "Panificação, Pães e Panificação",
  "Panificação, Salgados e Salgadinhos",
  // CONFEITARIA
  "Confeitaria, Chocolates e Trufas",
  "Confeitaria, Doces e Docinhos",
  "Confeitaria, Geléias, Conservas e Compotas",
  "Confeitaria, Sobremesas",
  "Confeitaria, Tortas",
  // ESPECIALIDADES
  "Especialidades, Funcionais",
  "Especialidades, Integrais",
  "Especialidades, Low Carb",
  "Especialidades, Proteicas",
  "Especialidades, Vegetarianas",
  "Especialidades, Fitness",
  "Especialidades, Internacionais",
  "Especialidades, Pastosa",
  "Especialidades, Regionais",
  "Especialidades, Veganas",
  // CATEGORIAS ÚNICAS
  "Sorvetes e Gelados",
  "Bebidas, Sucos e Drinks",
  // CATEGORIAS ESPECIAIS
  "Receitas Básicas",
  "A Revisar",
];

export const GRUPOS = [
  {
    nome: "Acompanhamentos", icone: "🥗",
    corHeader: "#E8F5E9", corTexto: "#2E7D32",
    corPill: "#C8E6C9", corPillTexto: "#1B5E20",
    corSub: "#F1FBF2",
    subcats: ["Arroz e Risotos","Legumes e Hortaliças","Grãos e Leguminosas","Complementos","Molhos"]
  },
  {
    nome: "Carnes", icone: "🥩",
    corHeader: "#FFEBEE", corTexto: "#C62828",
    corPill: "#FFCDD2", corPillTexto: "#B71C1C",
    corSub: "#FFF5F5",
    subcats: ["Aves","Bovina","Suína","Frutos do mar","Peixes","Bacalhau"]
  },
  {
    nome: "Massas", icone: "🍝",
    corHeader: "#E2DCDC", corTexto: "#5D4037",
    corPill: "#CFC7C7", corPillTexto: "#5D4037",
    corSub: "#F7F5F5",
    subcats: ["Macarrão","Panquecas e Crepes","Pastelão e Quiches"]
  },
  {
    nome: "Entradas", icone: "🥣",
    corHeader: "#FFF3E0", corTexto: "#E65100",
    corPill: "#FFD180", corPillTexto: "#BF360C",
    corSub: "#FFFAF5",
    subcats: ["Saladas","Sopas, Cremes e Caldos","Aperitivos e Petiscos","Quentes","Mousses, Terrines e Patês"]
  },
  {
    nome: "Lanches", icone: "🥪",
    corHeader: "#FFFDE7", corTexto: "#F9A825",
    corPill: "#FFF176", corPillTexto: "#F57F17",
    corSub: "#FFFFF0",
    subcats: ["Sanduíches","Pizza","Pastel","Lanche"]
  },
  {
    nome: "Panificação", icone: "🍞",
    corHeader: "#EFEBE9", corTexto: "#4E342E",
    corPill: "#D7CCC8", corPillTexto: "#3E2723",
    corSub: "#F5F0EE",
    subcats: ["Bolos e Cakes","Pães e Panificação","Salgados e Salgadinhos"]
  },
  {
    nome: "Confeitaria", icone: "🍰",
    corHeader: "#FCE4EC", corTexto: "#880E4F",
    corPill: "#F8BBD0", corPillTexto: "#880E4F",
    corSub: "#FFF0F5",
    subcats: ["Sobremesas","Tortas","Doces e Docinhos","Chocolates e Trufas","Geléias, Conservas e Compotas"]
  },
  {
    nome: "Especialidades", icone: "⭐",
    corHeader: "#F3E5F5", corTexto: "#6A1B9A",
    corPill: "#E1BEE7", corPillTexto: "#4A148C",
    corSub: "#FAF5FF",
    subcats: ["Funcionais","Vegetarianas","Veganas","Low Carb","Proteicas","Integrais","Fitness","Internacionais","Regionais","Pastosa"]
  },
  {
    nome: "Sorvetes e Gelados", icone: "🍦",
    corHeader: "#E3F2FD", corTexto: "#1565C0",
    corPill: "#BBDEFB", corPillTexto: "#0D47A1",
    corSub: "#F0F8FF",
    subcats: ["Sorvetes e Gelados"]
  },
  {
    nome: "Bebidas", icone: "🥤",
    corHeader: "#C0F2C8", corTexto: "#1B5E20",
    corPill: "#A5E8AE", corPillTexto: "#1B5E20",
    corSub: "#F0FFF0",
    subcats: ["Sucos e Drinks"]
  },
  {
    nome: "Receitas Básicas", icone: "🍳",
    corHeader: "#F1F8E9", corTexto: "#558B2F",
    corPill: "#DCEDC8", corPillTexto: "#33691E",
    corSub: "#F8FFF0",
    subcats: ["Receitas Básicas"]
  },
  {
    nome: "A Revisar", icone: "⚠️",
    corHeader: "#FFF8E1", corTexto: "#F57F17",
    corPill: "#FFE082", corPillTexto: "#E65100",
    corSub: "#FFFFF0",
    subcats: ["A Revisar"]
  },
];

/** Extrai o nome do grupo a partir de uma categoria (ex: "Carnes, Aves" → "Carnes") */
export function getGrupoFromCategoria(cat) {
  if (!cat) return "A Revisar";
  const parts = cat.split(", ");
  if (parts.length >= 2) return parts[0];
  // Categorias únicas (Sorvetes e Gelados, Bebidas, etc) — retorna o próprio nome
  if (cat === "Bebidas, Sucos e Drinks") return "Bebidas";
  return cat; // "Sorvetes e Gelados", "Receitas Básicas", "A Revisar"
}

/** Retorna { cor, corTexto, icone } para uma categoria */
export function getGrupoStyle(cat) {
  const grupoNome = getGrupoFromCategoria(cat);
  const grupo = GRUPOS.find(g => g.nome === grupoNome);
  return grupo ? { cor: grupo.corHeader, corTexto: grupo.corTexto, icone: grupo.icone } : { cor: "#F5F5F5", corTexto: "#616161", icone: "📋" };
}

export default function CategoriaPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  // Group categories for display
  const groupedCategories = useMemo(() => {
    const map = {};
    CATEGORIAS.forEach((cat) => {
      const grupoNome = getGrupoFromCategoria(cat);
      if (!map[grupoNome]) map[grupoNome] = [];
      map[grupoNome].push(cat);
    });
    return map;
  }, []);

  const filtered = busca
    ? CATEGORIAS.filter((c) => c.toLowerCase().includes(busca.toLowerCase()))
    : null;

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBusca(""); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">&lt;selecionar&gt;</span>}
          <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar categoria..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="border-0 focus-visible:ring-0 h-9"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {filtered ? (
            // Search mode: flat list with group colors
            filtered.length > 0 ? filtered.map((c) => {
              const style = getGrupoStyle(c);
              return (
                <button
                  key={c}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2"
                  onClick={() => { onChange(c); setOpen(false); setBusca(""); }}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: style.corTexto }}
                  />
                  <span className="text-xs mr-1">{style.icone}</span>
                  {c}
                </button>
              );
            }) : (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhuma categoria encontrada</p>
            )
          ) : (
            // Grouped mode
            Object.entries(groupedCategories).map(([grupoNome, cats]) => {
              const style = GRUPOS.find(g => g.nome === grupoNome) || { icone: "📋", corHeader: "#F5F5F5", corTexto: "#616161" };
              return (
                <div key={grupoNome}>
                  <div
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide flex items-center gap-2 sticky top-0 z-10"
                    style={{ backgroundColor: style.corHeader, color: style.corTexto }}
                  >
                    <span>{style.icone}</span> {grupoNome}
                  </div>
                  {cats.map((c) => (
                    <button
                      key={c}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => { onChange(c); setOpen(false); setBusca(""); }}
                    >
                      {c.split(", ").length >= 2 ? c.split(", ")[1] : c}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}