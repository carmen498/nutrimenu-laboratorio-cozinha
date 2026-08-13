import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { downloadCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SCROLL_KEY = "poucosIngredientesScrollY";

// Cache simples em memória (fora do componente, sobrevive a remontagens da
// página enquanto o app estiver aberto) para evitar reprocessar as ~2.200
// receitas a cada vez que a aba é reaberta. Validade curta — dados que
// mudaram fora deste relatório aparecem após expirar.
const CACHE_TTL_MS = 5 * 60 * 1000;
let reportCache = { data: null, timestamp: 0 };

// Relatório somente leitura: receitas com 3 ingredientes reais ou menos
// (ignora sub-títulos/grupos). Não altera nenhum dado das receitas — apenas
// permite marcar como "resolvida" (registro próprio), removendo-a da lista.
export default function RelatorioPoucosIngredientes() {
  const cacheValido = reportCache.data && (Date.now() - reportCache.timestamp) < CACHE_TTL_MS;
  const [loading, setLoading] = useState(!cacheValido);
  const [linhas, setLinhas] = useState(cacheValido ? reportCache.data : []);

  useEffect(() => {
    if (cacheValido) return;
    (async () => {
      const [receitas, itensAll, resolvidos] = await Promise.all([
        fetchAllPages(base44.entities.Receita, "-nome"),
        fetchAllPages(base44.entities.IngredienteReceita, "-created_date"),
        fetchAllPages(base44.entities.PoucosIngredientesResolvido, "-created_date"),
      ]);

      const resolvidoIds = new Set(resolvidos.map((r) => r.receita_id));

      const itensByReceita = {};
      itensAll.forEach((i) => {
        if (!itensByReceita[i.receita_id]) itensByReceita[i.receita_id] = [];
        itensByReceita[i.receita_id].push(i);
      });

      const resultado = [];
      receitas.forEach((r) => {
        if (resolvidoIds.has(r.id)) return;
        const itens = (itensByReceita[r.id] || []).filter((i) => i.tipo !== "grupo");
        if (itens.length <= 3) {
          const categoria = r.categorias?.length > 0 ? r.categorias.join(", ") : (r.categoria || "(sem categoria)");
          const nomes = itens.map((i) =>
            i.tipo === "subreceita" ? (i.subreceita_nome || "(sub-receita sem nome)") : (i.ingrediente_nome || "(sem nome)")
          );
          resultado.push({ id: r.id, nome: r.nome, categoria, qtd: itens.length, ingredientes: nomes.join("; ") });
        }
      });

      resultado.sort((a, b) => a.categoria.localeCompare(b.categoria, "pt-BR") || a.nome.localeCompare(b.nome, "pt-BR"));
      reportCache = { data: resultado, timestamp: Date.now() };
      setLinhas(resultado);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restaura a posição de rolagem salva ao sair pelo nome da receita, uma vez
  // que os dados terminem de carregar (a tabela precisa existir no DOM).
  useEffect(() => {
    if (loading) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved != null) {
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10) || 0));
    }
  }, [loading]);

  const handleMarcarResolvido = async (linha) => {
    try {
      await base44.entities.PoucosIngredientesResolvido.create({ receita_id: linha.id, receita_nome: linha.nome });
      setLinhas((prev) => {
        const next = prev.filter((l) => l.id !== linha.id);
        reportCache = { data: next, timestamp: reportCache.timestamp };
        return next;
      });
      toast.success("Receita marcada como resolvida");
    } catch (err) {
      toast.error("Erro ao marcar como resolvida: " + (err.message || ""));
    }
  };

  const handleAbrirReceita = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

  const totalPorQtd = useMemo(() => {
    const map = { 0: 0, 1: 0, 2: 0, 3: 0 };
    linhas.forEach((l) => { map[l.qtd] = (map[l.qtd] || 0) + 1; });
    return map;
  }, [linhas]);

  const handleExport = () => {
    downloadCsv(
      "receitas_poucos_ingredientes.csv",
      ["Categoria", "Receita", "Qtd Ingredientes", "Ingredientes"],
      linhas.map((l) => [l.categoria, l.nome, l.qtd, l.ingredientes])
    );
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <Card className="p-4 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm space-x-4">
              <span className="font-bold">{linhas.length} receitas encontradas</span>
              <span className="text-muted-foreground">0 ing: {totalPorQtd[0]}</span>
              <span className="text-muted-foreground">1 ing: {totalPorQtd[1]}</span>
              <span className="text-muted-foreground">2 ing: {totalPorQtd[2]}</span>
              <span className="text-muted-foreground">3 ing: {totalPorQtd[3]}</span>
            </div>
            <Button size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" /> Exportar CSV
            </Button>
          </Card>

          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">Categoria</th>
                  <th className="text-left p-2 font-medium">Receita</th>
                  <th className="text-center p-2 font-medium">Qtd</th>
                  <th className="text-left p-2 font-medium">Ingredientes</th>
                  <th className="text-center p-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2 text-muted-foreground">{l.categoria}</td>
                    <td className="p-2 font-medium">
                      <Link to={`/receita/${l.id}`} onClick={handleAbrirReceita} className="text-primary hover:underline">
                        {l.nome}
                      </Link>
                    </td>
                    <td className="p-2 text-center">{l.qtd}</td>
                    <td className="p-2 text-muted-foreground">{l.ingredientes || "—"}</td>
                    <td className="p-2 text-center">
                      <Button size="sm" variant="outline" onClick={() => handleMarcarResolvido(l)}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Marcar como resolvido
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}