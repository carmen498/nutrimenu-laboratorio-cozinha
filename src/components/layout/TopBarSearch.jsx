import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, BookOpen, Apple, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const LIMITE_POR_TIPO = 5;

export default function TopBarSearch() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [termo, setTermo] = useState("");
  const [termoBuscado, setTermoBuscado] = useState("");
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setTermoBuscado(termo.trim()), 300);
    return () => clearTimeout(handle);
  }, [termo]);

  useEffect(() => {
    function handleClickFora(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const buscaAtiva = termoBuscado.length > 0;

  const { data: receitas = [], isLoading: carregandoReceitas } = useQuery({
    queryKey: ["busca-receitas"],
    queryFn: () => base44.entities.Receita.list("-updated_date", 5000),
    enabled: buscaAtiva,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ingredientes = [], isLoading: carregandoIngredientes } = useQuery({
    queryKey: ["busca-ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-updated_date", 5000),
    enabled: buscaAtiva,
    staleTime: 5 * 60 * 1000,
  });

  const { data: cardapios = [], isLoading: carregandoCardapios } = useQuery({
    queryKey: ["busca-cardapios"],
    queryFn: () => base44.entities.Cardapio.list("-updated_date", 5000),
    enabled: buscaAtiva,
    staleTime: 5 * 60 * 1000,
  });

  const carregando = carregandoReceitas || carregandoIngredientes || carregandoCardapios;

  const termoLower = termoBuscado.toLowerCase();
  const receitasEncontradas = buscaAtiva
    ? receitas.filter((r) => r.nome?.toLowerCase().includes(termoLower)).slice(0, LIMITE_POR_TIPO)
    : [];
  const ingredientesEncontrados = buscaAtiva
    ? ingredientes.filter((i) => i.nome?.toLowerCase().includes(termoLower)).slice(0, LIMITE_POR_TIPO)
    : [];
  const cardapiosEncontrados = buscaAtiva
    ? cardapios.filter((c) => c.nome?.toLowerCase().includes(termoLower)).slice(0, LIMITE_POR_TIPO)
    : [];

  const totalEncontrados = receitasEncontradas.length + ingredientesEncontrados.length + cardapiosEncontrados.length;

  const irPara = (path) => {
    navigate(path);
    setTermo("");
    setTermoBuscado("");
    setAberto(false);
  };

  return (
    <div ref={containerRef} className="flex-1 max-w-md hidden sm:flex items-center relative">
      <Search className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        placeholder="Pesquisar receita, ingrediente, cardápio..."
        className="w-full h-9 pl-9 pr-3 rounded-md border border-transparent bg-white text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
      />

      {aberto && buscaAtiva && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border shadow-lg max-h-96 overflow-y-auto z-50" style={{ borderColor: "#E8E0D5" }}>
          {carregando ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Buscando...</p>
          ) : totalEncontrados === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nenhum resultado encontrado para "{termoBuscado}"
            </p>
          ) : (
            <>
              {receitasEncontradas.length > 0 && (
                <div className="py-1">
                  <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Receitas</p>
                  {receitasEncontradas.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => irPara(`/receita/${r.id}`)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-muted transition-colors"
                    >
                      <BookOpen className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{r.nome}</span>
                    </button>
                  ))}
                </div>
              )}
              {ingredientesEncontrados.length > 0 && (
                <div className="py-1 border-t" style={{ borderColor: "#E8E0D5" }}>
                  <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ingredientes</p>
                  {ingredientesEncontrados.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => irPara(`/ingrediente/${i.id}`)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-muted transition-colors"
                    >
                      <Apple className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{i.nome}</span>
                    </button>
                  ))}
                </div>
              )}
              {cardapiosEncontrados.length > 0 && (
                <div className="py-1 border-t" style={{ borderColor: "#E8E0D5" }}>
                  <p className="px-4 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Cardápios</p>
                  {cardapiosEncontrados.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => irPara(`/cardapio/${c.id}`)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left hover:bg-muted transition-colors"
                    >
                      <CalendarDays className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{c.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}