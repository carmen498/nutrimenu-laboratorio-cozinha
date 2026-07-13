import { useState, useRef, useEffect } from "react";
import CardapioSecaoLinha from "@/components/cardapio/CardapioSecaoLinha";
import CardapioPratoLinha from "@/components/cardapio/CardapioPratoLinha";

function fmtKg(v) { return (v || 0).toFixed(2).replace(".", ",") + " kg"; }
function fmtRs(v) { return "R$ " + (v || 0).toFixed(2).replace(".", ","); }

// Reutiliza CardapioSecaoLinha + CardapioPratoLinha (mesma tabela da Parte 1),
// mas com % de seção editável (gravado em grupo.percentual) e sem filtro de dia
// (o Evento não tem dimensão de dia por item).
export default function EtapaCardapioTabela({
  gruposCalc, totalPessoas, custoTotal,
  onUpdateItem, onRemoveItem, onMoveItem, onOpenAddReceita,
  onChangePct, onChangeNomeSecao, onRemoveSecao,
}) {
  const [filtroSecao, setFiltroSecao] = useState("todas");
  const [selectedKey, setSelectedKey] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setSelectedKey(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleSelect = (id) => setSelectedKey(prev => prev === id ? null : id);

  const secoesVisiveis = gruposCalc.filter(g => filtroSecao === "todas" || g.nome === filtroSecao);
  const totalKgGeral = gruposCalc.reduce((s, g) => s + g.actualKg, 0);
  const custoPorPessoa = totalPessoas > 0 ? custoTotal / totalPessoas : 0;

  return (
    <div ref={rootRef}>
      {/* Chips de seção */}
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
        <div className="w-20 text-center">PC (g)</div>
        <div className="w-20 text-right">kg</div>
        <div className="w-20 text-right">R$</div>
        <div className="w-14 text-right">%</div>
      </div>

      {secoesVisiveis.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma seção encontrada.</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {secoesVisiveis.map((g) => {
            const grupoIdx = gruposCalc.indexOf(g);
            return (
              <div key={g.nome + grupoIdx}>
                <CardapioSecaoLinha
                  nome={g.nome}
                  kg={g.actualKg}
                  pct={g.percentual}
                  editablePct
                  onChangePct={(v) => onChangePct(grupoIdx, v)}
                  onChangeNome={(v) => onChangeNomeSecao(grupoIdx, v)}
                  onRemoveSection={() => onRemoveSecao(grupoIdx)}
                  onAddItem={() => onOpenAddReceita(grupoIdx)}
                />
                {g.itens.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum item nesta seção.</p>
                ) : (
                  g.itens.map((item, ii) => {
                    const key = `${grupoIdx}-${ii}`;
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
                        canMoveDown={ii < g.itens.length - 1}
                        temDias={false}
                      />
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between px-3 py-3 mt-2 bg-secondary/40 rounded-lg text-sm">
        <span className="font-semibold">Total · {totalPessoas} pessoas</span>
        <span className="font-semibold text-right">
          {fmtKg(totalKgGeral)} · {fmtRs(custoTotal)} ({fmtRs(custoPorPessoa)}/pessoa)
        </span>
      </div>
    </div>
  );
}