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
  { nome: "Acompanhamentos", icone: "🥗", cor: "#E8F5E9", corTexto: "#2E7D32" },
  { nome: "Carnes",          icone: "🥩", cor: "#FFEBEE", corTexto: "#C62828" },
  { nome: "Massas",          icone: "🍝", cor: "#FFF8E1", corTexto: "#F57F17" },
  { nome: "Entradas",        icone: "🥣", cor: "#FFF3E0", corTexto: "#E65100" },
  { nome: "Lanches",         icone: "🥪", cor: "#FFFDE7", corTexto: "#F9A825" },
  { nome: "Panificação",     icone: "🍞", cor: "#EFEBE9", corTexto: "#4E342E" },
  { nome: "Confeitaria",     icone: "🍰", cor: "#FCE4EC", corTexto: "#880E4F" },
  { nome: "Especialidades",  icone: "⭐", cor: "#F3E5F5", corTexto: "#6A1B9A" },
  { nome: "Sorvetes e Gelados", icone: "🍦", cor: "#E3F2FD", corTexto: "#1565C0" },
  { nome: "Bebidas",         icone: "🥤", cor: "#E0F7FA", corTexto: "#006064" },
  { nome: "Receitas Básicas",icone: "🍳", cor: "#F1F8E9", corTexto: "#558B2F" },
  { nome: "A Revisar",       icone: "⚠️", cor: "#FFF8E1", corTexto: "#F57F17" },
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
  return grupo || { cor: "#F5F5F5", corTexto: "#616161", icone: "📋" };
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
              const style = GRUPOS.find(g => g.nome === grupoNome) || { icone: "📋", cor: "#F5F5F5", corTexto: "#616161" };
              return (
                <div key={grupoNome}>
                  <div
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide flex items-center gap-2 sticky top-0 z-10"
                    style={{ backgroundColor: style.cor, color: style.corTexto }}
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