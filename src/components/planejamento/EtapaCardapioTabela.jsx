import { useState, useRef, useEffect } from "react";
import { Plus, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import CardapioPratoLinha from "@/components/cardapio/CardapioPratoLinha";

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }
function fmtPct(v) { return (v || 0).toFixed(1).replace(".", ",") + "%"; }
function fmtNomePrato(nome) {
  if (!nome) return "";
  return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
}

// Tabela de pratos do Evento (Etapa 3): apenas lista de pratos, sem faixas de seção
// nem % de distribuição — seções servem só como rótulo/filtro. Coluna "% custo"
// mostra a participação do prato no custo total do evento.
export default function EtapaCardapioTabela({
  gruposCalc, totalPessoas, custoTotal, margemEvento = 0, filtroDia = "todos",
  onUpdateItem, onRemoveItem, onMoveItem, onAddPrato, onNovaSecao,
}) {
  const [filtroSecao, setFiltroSecao] = useState("todas");
  const [selectedKey, setSelectedKey] = useState(null);
  const [avisoExpandido, setAvisoExpandido] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setSelectedKey(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSelect = (id) => setSelectedKey(prev => prev === id ? null : id);

  const totalKgGeral = gruposCalc.reduce((s, g) => s + g.actualKg, 0);

  const pratosSemCusto = gruposCalc.flatMap(g => g.itens).filter(i => i.sem_custo && i.receita_id);

  const secoesVisiveis = gruposCalc.filter(g => filtroSecao === "todas" || g.nome === filtroSecao);
  const linhas = [];
  secoesVisiveis.forEach(g => {
    const grupoIdx = gruposCalc.indexOf(g);
    g.itens.forEach((item, ii) => {
      if (filtroDia !== "todos" && item.dia_semana !== filtroDia) return;
      linhas.push({ item, grupoIdx, ii, key: `${grupoIdx}-${ii}` });
    });
  });

  const nomesSemCusto = pratosSemCusto.slice(0, 3).map(i => fmtNomePrato(i.receita_nome));
  const textoSemCusto = pratosSemCusto.length > 3
    ? `${nomesSemCusto.join(", ")} e mais ${pratosSemCusto.length - 3}`
    : nomesSemCusto.join(", ");

  return (
    <div ref={rootRef}>
      {/* Chips de seção (apenas filtro/organização, sem números) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={() => setFiltroSecao("todas")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            filtroSecao === "todas" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
          }`}
        >Todas</button>
        {gruposCalc.map((g, gi) => (
          <button
            key={g.nome + gi}
            onClick={() => setFiltroSecao(filtroSecao === g.nome ? "todas" : g.nome)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              filtroSecao === g.nome ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-accent"
            }`}
          >{g.nome}</button>
        ))}
      </div>

      {/* Cabeçalho de colunas */}
      <div className="hidden sm:flex items-center gap-3 px-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        <div className="flex-1">Prato</div>
        <div className="w-20 text-center">PC g/p</div>
        <div className="w-20 text-right">kg</div>
        <div className="w-20 text-right">R$</div>
        <div className="w-14 text-right">% custo</div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum prato adicionado ainda.</p>
        ) : (
          linhas.map(({ item, grupoIdx, ii, key }) => {
            const pct = custoTotal > 0 ? (item.custo / custoTotal) * 100 : 0;
            return (
              <CardapioPratoLinha
                key={key}
                rec={{
                  id: key,
                  receita_id: item.receita_id,
                  receita_nome: item.receita_nome,
                  per_capita_g: item.pc_g,
                  custo_total: item.custo,
                }}
                pcSuffix="g/pessoa"
                kg={item.qtd_kg}
                pct={pct}
                semCusto={item.sem_custo}
                selected={selectedKey === key}
                onSelect={handleSelect}
                onUpdatePC={(val) => onUpdateItem(grupoIdx, ii, { pc_g: val })}
                onRemove={() => onRemoveItem(grupoIdx, ii)}
                onMoveUp={() => onMoveItem(grupoIdx, ii, -1)}
                onMoveDown={() => onMoveItem(grupoIdx, ii, 1)}
                canMoveUp={ii > 0}
                canMoveDown={ii < (gruposCalc[grupoIdx]?.itens.length || 0) - 1}
                temDias={false}
              />
            );
          })
        )}
        {/* Linha de total: última linha da tabela */}
        <div className="flex items-center gap-3 px-3 py-3 border-t-2 border-border bg-secondary/50">
          <div className="flex-1 min-w-0 text-sm font-semibold">Total</div>
          <div className="w-20 shrink-0" />
          <div className="w-20 text-right shrink-0 text-sm font-semibold">{fmtKg(totalKgGeral)}</div>
          <div className="text-right shrink-0 text-sm font-semibold whitespace-nowrap">
            {fmtRs(custoTotal)}
          </div>
        </div>
      </div>

      {/* Botão único: Adicionar prato (pergunta a seção de destino) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-1 border-dashed mt-2">
            <Plus className="w-4 h-4" /> Adicionar prato
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {gruposCalc.map((g, gi) => (
            <DropdownMenuItem key={g.nome + gi} onClick={() => onAddPrato(gi)}>{g.nome}</DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={onNovaSecao}>➕ Nova seção...</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Aviso consolidado de custo */}
      {pratosSemCusto.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setAvisoExpandido(v => !v)}
            className="w-full flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left"
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span className="flex-1">
              ⚠ {pratosSemCusto.length} {pratosSemCusto.length === 1 ? "prato" : "pratos"} sem custo completo: {textoSemCusto}
            </span>
            {avisoExpandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {avisoExpandido && (
            <div className="px-3 py-2 text-xs text-amber-800 bg-amber-50/60 border-x border-b border-amber-200 rounded-b-lg space-y-0.5">
              {pratosSemCusto.map((i, idx) => (
                <div key={idx}>{i.receita_nome}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}