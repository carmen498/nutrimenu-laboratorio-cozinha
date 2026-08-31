import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Apple, BookOpen, Loader2, Search, Utensils } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ORIGENS = [
  { value: "refeicao", label: "Refeições", singular: "Refeição", icon: Utensils, entity: "Cardapio" },
  { value: "receita", label: "Receitas", singular: "Receita", icon: BookOpen, entity: "Receita" },
  { value: "ingrediente", label: "Ingredientes", singular: "Ingrediente", icon: Apple, entity: "Ingrediente" },
];

const CLASSIFICACOES = [
  { value: "", label: "Sem classificação" },
  { value: "entrada", label: "Entrada" },
  { value: "salada", label: "Salada" },
  { value: "prato_principal", label: "Prato principal" },
  { value: "segundo_prato", label: "Segundo prato" },
  { value: "acompanhamento", label: "Acompanhamento" },
  { value: "guarnicao", label: "Guarnição" },
  { value: "sobremesa", label: "Sobremesa" },
  { value: "bebida", label: "Bebida" },
  { value: "outro", label: "Outro" },
];

function normalizar(texto = "") {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function AdicionarItemCardapioDialog({
  open,
  onClose,
  onAdicionar,
  adicionando = false,
  diaNome,
  dataFormatada,
  itensDoDia = [],
}) {
  const [tipo, setTipo] = useState("refeicao");
  const [busca, setBusca] = useState("");
  const [classificacao, setClassificacao] = useState("");
  const origem = ORIGENS.find((item) => item.value === tipo);

  const { data: opcoes = [], isLoading, error } = useQuery({
    queryKey: ["cardapio-origens", tipo],
    queryFn: () => fetchAllPages(base44.entities[origem.entity], "nome"),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const idsAdicionados = useMemo(
    () => new Set(itensDoDia.filter((item) => item.tipo_origem === tipo).map((item) => item.origem_id)),
    [itensDoDia, tipo],
  );

  const filtradas = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean);
    return opcoes
      .filter((item) => {
        const nome = normalizar(item.nome);
        return termos.every((termo) => nome.includes(termo));
      })
      .slice(0, 100);
  }, [opcoes, busca]);

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setBusca("");
  }

  function fechar() {
    if (adicionando) return;
    setBusca("");
    setClassificacao("");
    onClose();
  }

  function selecionar(item) {
    if (adicionando || idsAdicionados.has(item.id)) return;
    onAdicionar({
      tipo_origem: tipo,
      origem_id: item.id,
      classificacao: classificacao || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(valor) => !valor && fechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar em {diaNome}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dataFormatada}</p>
        </DialogHeader>

        <div className="flex flex-col min-h-0 gap-4">
          <div className="grid grid-cols-3 gap-2">
            {ORIGENS.map((item) => {
              const Icon = item.icon;
              const ativo = tipo === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => trocarTipo(item.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    ativo ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.singular}</span>
                </button>
              );
            })}
          </div>

          <label className="space-y-1.5">
            <span className="text-sm font-medium">Classificação <span className="font-normal text-muted-foreground">(opcional)</span></span>
            <select
              value={classificacao}
              onChange={(evento) => setClassificacao(evento.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {CLASSIFICACOES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Vale somente para este item neste Cardápio.</p>
          </label>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder={`Buscar ${origem.label.toLowerCase()} por nome...`}
              className="w-full h-10 rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>

          <div className="flex-1 min-h-44 overflow-y-auto rounded-lg border border-border p-1">
            {isLoading ? (
              <div className="h-40 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando {origem.label.toLowerCase()}...
              </div>
            ) : error ? (
              <p className="p-5 text-center text-sm text-destructive">Não foi possível carregar as opções.</p>
            ) : filtradas.length === 0 ? (
              <p className="p-5 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
            ) : (
              filtradas.map((item) => {
                const jaAdicionado = idsAdicionados.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={jaAdicionado || adicionando}
                    onClick={() => selecionar(item)}
                    className="w-full px-3 py-2.5 rounded-md text-left flex items-center justify-between gap-3 hover:bg-muted disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm font-medium">{item.nome}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {jaAdicionado ? "Já adicionado" : "Adicionar"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
