import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { normalizarNome } from "@/lib/normalizarNome";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calculator, CalendarDays, ChevronLeft, ChevronRight, FileText, History, MoreHorizontal, Plus, RefreshCw, Search, TrendingUp, WalletCards, X } from "lucide-react";

const money = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v) => `${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const dataCurta = (v) => v ? new Date(v).toLocaleDateString("pt-BR") : "—";
const numero = (v, max = 2) => Number(v || 0).toLocaleString("pt-BR", { maximumFractionDigits: max });

const inicioDoDia = (iso) => iso ? new Date(`${iso}T00:00:00`) : null;
const fimDoDia = (iso) => iso ? new Date(`${iso}T23:59:59.999`) : null;

export default function CustosHistorico() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [pagina, setPagina] = useState(1);
  const porPagina = 10;

  const { data: calculos = [], isLoading } = useQuery({
    queryKey: ["custos-historico", user?.id],
    queryFn: () => base44.entities.CalculoCusto.filter({ user_id: user.id, tipo_origem: "receita" }, "-data_calculo", 500),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const categorias = useMemo(() => [...new Set(calculos.map((c) => c.categoria_snapshot).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")), [calculos]);

  const indicadores = useMemo(() => {
    const agora = new Date();
    const mes = agora.getMonth();
    const ano = agora.getFullYear();
    const desteMes = calculos.filter((c) => {
      const d = new Date(c.data_calculo || c.created_date);
      return d.getMonth() === mes && d.getFullYear() === ano;
    }).length;
    const mediaCusto = calculos.length ? calculos.reduce((s, c) => s + Number(c.custo_unitario || 0), 0) / calculos.length : 0;
    const comPreco = calculos.filter((c) => Number(c.preco_venda_informado || 0) > 0);
    const mediaMargem = comPreco.length ? comPreco.reduce((s, c) => s + Number(c.margem_estimada || 0), 0) / comPreco.length : 0;
    return { total: calculos.length, desteMes, mediaCusto, mediaMargem, temMargem: comPreco.length > 0 };
  }, [calculos]);

  const filtrados = useMemo(() => {
    const termo = normalizarNome(busca);
    const ini = inicioDoDia(dataInicial);
    const fim = fimDoDia(dataFinal);
    return calculos.filter((c) => {
      if (termo && !normalizarNome(c.origem_nome_snapshot).includes(termo)) return false;
      if (categoria && c.categoria_snapshot !== categoria) return false;
      const d = new Date(c.data_calculo || c.created_date);
      if (ini && d < ini) return false;
      if (fim && d > fim) return false;
      return true;
    });
  }, [calculos, busca, categoria, dataInicial, dataFinal]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const exibidos = filtrados.slice((paginaSegura - 1) * porPagina, paginaSegura * porPagina);
  const filtrosAtivos = !!(busca || categoria || dataInicial || dataFinal);

  const limparFiltros = () => {
    setBusca("");
    setCategoria("");
    setDataInicial("");
    setDataFinal("");
    setPagina(1);
  };

  const mudarFiltro = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  return (
    <div className="space-y-5 pb-24 md:pb-8 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Histórico de Cálculos</h1>
          <p className="text-sm text-muted-foreground mt-1">Consulte as fichas já calculadas sem alterar os valores históricos.</p>
        </div>
        <Button onClick={() => navigate("/custos/calcular")}><Plus className="w-4 h-4 mr-2" /> Novo cálculo</Button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Fichas salvas</p><p className="text-2xl font-bold mt-1">{indicadores.total}</p></div><FileText className="w-5 h-5 text-primary" /></div></Card>
        <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Cálculos neste mês</p><p className="text-2xl font-bold mt-1">{indicadores.desteMes}</p></div><CalendarDays className="w-5 h-5 text-primary" /></div></Card>
        <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Custo médio por receita</p><p className="text-2xl font-bold mt-1">{indicadores.total ? money(indicadores.mediaCusto) : "—"}</p></div><WalletCards className="w-5 h-5 text-primary" /></div></Card>
        <Card className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">Margem média</p><p className="text-2xl font-bold mt-1">{indicadores.temMargem ? pct(indicadores.mediaMargem) : "—"}</p></div><TrendingUp className="w-5 h-5 text-primary" /></div></Card>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid lg:grid-cols-[1fr_220px_170px_170px_auto] gap-2 items-end">
          <div>
            <label className="text-xs font-medium">Buscar receita</label>
            <div className="relative mt-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome da receita..." value={busca} onChange={(e) => mudarFiltro(setBusca)(e.target.value)} /></div>
          </div>
          <div>
            <label className="text-xs font-medium">Categoria</label>
            <select className="mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm" value={categoria} onChange={(e) => mudarFiltro(setCategoria)(e.target.value)}><option value="">Todas as categorias</option>{categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>
          </div>
          <div><label className="text-xs font-medium">De</label><Input className="mt-1" type="date" value={dataInicial} onChange={(e) => mudarFiltro(setDataInicial)(e.target.value)} /></div>
          <div><label className="text-xs font-medium">Até</label><Input className="mt-1" type="date" value={dataFinal} onChange={(e) => mudarFiltro(setDataFinal)(e.target.value)} /></div>
          <Button variant="outline" onClick={limparFiltros} disabled={!filtrosAtivos}><X className="w-4 h-4 mr-2" /> Limpar</Button>
        </div>
        <p className="text-xs text-muted-foreground">{filtrados.length} cálculo{filtrados.length === 1 ? "" : "s"} encontrado{filtrados.length === 1 ? "" : "s"}.</p>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando histórico...</div>
        ) : exibidos.length === 0 ? (
          <div className="py-12 px-6 text-center"><History className="w-10 h-10 mx-auto text-muted-foreground/50" /><h2 className="font-semibold mt-3">Nenhum cálculo encontrado</h2><p className="text-sm text-muted-foreground mt-1">{filtrosAtivos ? "Tente ajustar os filtros." : "Quando você gerar uma Ficha de Custo, ela aparecerá aqui."}</p>{!filtrosAtivos && <Button className="mt-4" onClick={() => navigate("/custos/calcular")}><Calculator className="w-4 h-4 mr-2" /> Calcular custo</Button>}</div>
        ) : (
          <>
            <div className="md:hidden divide-y">
              {exibidos.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><Link to={`/custos/ficha/${c.id}`} className="font-semibold hover:text-primary block truncate">{c.origem_nome_snapshot}</Link><p className="text-xs text-muted-foreground mt-1">{c.categoria_snapshot || "Sem categoria"} · {dataCurta(c.data_calculo || c.created_date)}</p></div>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/custos/ficha/${c.id}`)}><FileText className="w-4 h-4 mr-2" /> Abrir ficha</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/custos/calcular?receita=${encodeURIComponent(c.origem_id)}&recalcular=${encodeURIComponent(c.id)}`)}><RefreshCw className="w-4 h-4 mr-2" /> Recalcular como nova versão</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{Number(c.versao_calculo || 1) > 1 && <Badge variant="secondary" className="text-[10px]">v{c.versao_calculo}</Badge>}{c.formacao_preco_metodo === "margem" && <Badge variant="outline" className="text-[10px]">Preço assistido</Badge>}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">Produção</p><strong className="block mt-0.5">{numero(c.quantidade_produzida)} {c.unidade_producao || "lotes"}</strong></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">Custo por receita</p><strong className="block mt-0.5">{money(c.custo_unitario)}</strong></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">Preço de venda</p><strong className="block mt-0.5">{Number(c.preco_venda_informado || 0) > 0 ? money(c.preco_venda_informado) : "—"}</strong></div><div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">Margem</p><strong className="block mt-0.5">{Number(c.preco_venda_informado || 0) > 0 ? pct(c.margem_estimada) : "—"}</strong></div></div>
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/custos/ficha/${c.id}`)}>Abrir Ficha de Custo</Button>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left"><tr><th className="px-4 py-3 font-medium">Receita</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium whitespace-nowrap">Data do cálculo</th><th className="px-4 py-3 font-medium">Produção</th><th className="px-4 py-3 font-medium whitespace-nowrap text-right">Custo por receita</th><th className="px-4 py-3 font-medium whitespace-nowrap text-right">Preço de venda</th><th className="px-4 py-3 font-medium text-right">Margem</th><th className="px-4 py-3 font-medium text-right">Ações</th></tr></thead>
              <tbody className="divide-y">
                {exibidos.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/25">
                    <td className="px-4 py-3"><Link to={`/custos/ficha/${c.id}`} className="font-medium hover:text-primary">{c.origem_nome_snapshot}</Link>{Number(c.versao_calculo || 1) > 1 && <Badge variant="secondary" className="ml-2 text-[10px]">v{c.versao_calculo}</Badge>}{c.formacao_preco_metodo === "margem" && <Badge variant="outline" className="ml-2 text-[10px]">Preço assistido</Badge>}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.categoria_snapshot || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{dataCurta(c.data_calculo || c.created_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{numero(c.quantidade_produzida)} {c.unidade_producao || "lotes"}</td>
                    <td className="px-4 py-3 text-right font-medium">{money(c.custo_unitario)}</td>
                    <td className="px-4 py-3 text-right">{Number(c.preco_venda_informado || 0) > 0 ? money(c.preco_venda_informado) : "—"}</td>
                    <td className="px-4 py-3 text-right">{Number(c.preco_venda_informado || 0) > 0 ? pct(c.margem_estimada) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate(`/custos/ficha/${c.id}`)}><FileText className="w-4 h-4 mr-2" /> Abrir ficha</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/custos/calcular?receita=${encodeURIComponent(c.origem_id)}&recalcular=${encodeURIComponent(c.id)}`)}><RefreshCw className="w-4 h-4 mr-2" /> Recalcular como nova versão</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        {!isLoading && filtrados.length > porPagina && (
          <div className="border-t px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">Página {paginaSegura} de {totalPaginas}</p>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={paginaSegura <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button><Button variant="outline" size="sm" disabled={paginaSegura >= totalPaginas} onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}>Próxima <ChevronRight className="w-4 h-4 ml-1" /></Button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
