import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Plus, Search, Star, MoreHorizontal, Package, Scale, Calendar, PartyPopper, GlassWater, Sun, Sparkles, MapPin } from "lucide-react";

const TIPOS = [
  { key: "diario", label: "Diário", icon: Sun, emoji: "🏠", cor: "bg-amber-100 text-amber-700 border-amber-200" },
  { key: "semanal", label: "Semanal", icon: Calendar, emoji: "📅", cor: "bg-green-100 text-green-700 border-green-200" },
  { key: "fim_de_semana", label: "Fim de semana", icon: MapPin, emoji: "🌅", cor: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "especial", label: "Especial", icon: Sparkles, emoji: "⭐", cor: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "comemoracao", label: "Comemoração", icon: PartyPopper, emoji: "🎉", cor: "bg-pink-100 text-pink-700 border-pink-200" },
  { key: "marmitas", label: "Marmitas", icon: Package, emoji: "📦", cor: "bg-orange-100 text-orange-700 border-orange-200" },
  { key: "buffet", label: "Buffet", icon: Scale, emoji: "⚖️", cor: "bg-blue-100 text-blue-700 border-blue-200" },
  { key: "happy_hour", label: "Happy Hour", icon: GlassWater, emoji: "🍹", cor: "bg-rose-100 text-rose-700 border-rose-200" },
];

const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.key, t]));

const LABEL_UNIDADE = {
  diario: "pessoas", semanal: "pessoas", fim_de_semana: "pessoas",
  especial: "pessoas", comemoracao: "convidados", marmitas: "marmitas",
  buffet: "kg", happy_hour: "pessoas",
};

export default function Cardapios() {
  const navigate = useNavigate();
  const [cardapios, setCardapios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos"); // todos | favoritos | tipo_key
  const [showNovo, setShowNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", tipo: "", data: "", observacoes: "" });
  const [salvando, setSalvando] = useState(false);
  const [favPending, setFavPending] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Cardapio.list("-created_date", 100);
      setCardapios(lista || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getNum = (c) => c.num_unidades || c.num_pessoas_ou_unidades || 1;

  const filtrados = useMemo(() => {
    let lista = cardapios;
    if (filtroTipo === "favoritos") lista = lista.filter(c => c.favorito);
    else if (filtroTipo !== "todos") lista = lista.filter(c => c.tipo === filtroTipo);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter(c => (c.nome || "").toLowerCase().includes(q));
    }
    return lista;
  }, [cardapios, busca, filtroTipo]);

  const handleNovo = async () => {
    if (!form.nome.trim() || !form.tipo) return;
    setSalvando(true);
    try {
      const c = await base44.entities.Cardapio.create({
        nome: form.nome.trim(),
        tipo: form.tipo,
        data: form.data || null,
        observacoes: form.observacoes.trim(),
        num_unidades: 1,
        favorito: false,
      });
      setForm({ nome: "", tipo: "", data: "", observacoes: "" });
      setShowNovo(false);
      load();
      navigate(`/cardapio/${c.id}`);
    } catch (e) { console.error(e); }
    setSalvando(false);
  };

  const toggleFavorito = async (c, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (favPending[c.id]) return;
    setFavPending(p => ({ ...p, [c.id]: true }));
    try {
      await base44.entities.Cardapio.update(c.id, { favorito: !c.favorito });
      setCardapios(prev => prev.map(x => x.id === c.id ? { ...x, favorito: !c.favorito } : x));
    } catch (e) { console.error(e); }
    setFavPending(p => ({ ...p, [c.id]: false }));
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este cardápio?")) return;
    await base44.entities.Cardapio.delete(id);
    load();
  };

  const handleDuplicate = async (c) => {
    try {
      const novo = await base44.entities.Cardapio.create({
        nome: `${c.nome} — cópia`,
        tipo: c.tipo,
        data: null,
        observacoes: c.observacoes,
        num_unidades: getNum(c),
        favorito: false,
      });
      // Duplicate receitas
      const recs = await base44.entities.CardapioReceita.filter({ cardapio_id: c.id }, "ordem", 100);
      for (const r of (recs || [])) {
        await base44.entities.CardapioReceita.create({
          cardapio_id: novo.id,
          receita_id: r.receita_id,
          receita_nome: r.receita_nome,
          receita_categoria: r.receita_categoria,
          per_capita_g: r.per_capita_g,
          quantidade_total_g: r.quantidade_total_g,
          custo_total: r.custo_total,
          ordem: r.ordem,
          dia_semana: r.dia_semana,
          refeicao: r.refeicao,
        });
      }
      // Duplicate insumos
      const ins = await base44.entities.CardapioInsumo.filter({ cardapio_id: c.id }, "created_date", 100);
      for (const i of (ins || [])) {
        await base44.entities.CardapioInsumo.create({
          cardapio_id: novo.id,
          insumo_id: i.insumo_id,
          nome: i.nome,
          quantidade: i.quantidade,
          unidade: i.unidade,
          custo_unitario: i.custo_unitario,
          custo_total: i.custo_total,
        });
      }
      load();
      navigate(`/cardapio/${novo.id}`);
    } catch (e) { console.error(e); }
  };

  const formatarData = (d) => {
    if (!d) return null;
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Cardápios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {cardapios.length} cardápio{cardapios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowNovo(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Cardápio
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          variant={filtroTipo === "todos" ? "default" : "outline"}
          size="sm"
          onClick={() => setFiltroTipo("todos")}
        >
          Todos
        </Button>
        <Button
          variant={filtroTipo === "favoritos" ? "default" : "outline"}
          size="sm"
          className="gap-1"
          onClick={() => setFiltroTipo("favoritos")}
        >
          <Star className="w-3.5 h-3.5" /> Favoritos
        </Button>
        {TIPOS.map(t => (
          <Button
            key={t.key}
            variant={filtroTipo === t.key ? "default" : "outline"}
            size="sm"
            className="gap-1"
            onClick={() => setFiltroTipo(filtroTipo === t.key ? "todos" : t.key)}
          >
            {t.emoji}
          </Button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cardápio..."
          className="pl-10"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {busca || filtroTipo !== "todos" ? "Nenhum cardápio encontrado." : "Nenhum cardápio criado ainda."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(c => {
            const cfg = TIPO_MAP[c.tipo] || TIPO_MAP.diario;
            const Icon = cfg.icon;
            const num = getNum(c);
            const custoPorUnid = num > 0 && c.custo_total > 0 ? c.custo_total / num : 0;
            return (
              <Link
                key={c.id}
                to={`/cardapio/${c.id}`}
                className="block bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center p-4 gap-3">
                  <button
                    className="flex-shrink-0 p-1 rounded-full hover:bg-secondary transition-colors"
                    onClick={(e) => toggleFavorito(c, e)}
                    disabled={favPending[c.id]}
                  >
                    <Star
                      className={`w-5 h-5 ${c.favorito ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {c.nome?.toUpperCase?.() || c.nome}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Badge variant="outline" className={`text-xs ${cfg.cor}`}>
                        {cfg.emoji} {cfg.label}
                      </Badge>
                      {c.data && <span>{formatarData(c.data)}</span>}
                      <span>{num} {LABEL_UNIDADE[c.tipo] || "unidades"}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      {c.custo_total > 0 && (
                        <p className="font-semibold text-foreground text-sm">
                          R$ {Number(c.custo_total).toFixed(2)}
                        </p>
                      )}
                      {custoPorUnid > 0 && (
                        <p className="text-xs text-muted-foreground">
                          R$ {custoPorUnid.toFixed(2)}/{LABEL_UNIDADE[c.tipo] === "kg" ? "kg" : "un"}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.preventDefault()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.preventDefault(); handleDuplicate(c); }}>
                          📋 Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={e => { e.preventDefault(); handleDelete(c.id); }}
                        >
                          🗑 Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dialog Novo Cardápio */}
      <Dialog open={showNovo} onOpenChange={setShowNovo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cardápio</DialogTitle>
            <DialogDescription>Organize receitas por tipo de evento ou planejamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="ex: Almoço de domingo"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                autoFocus
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => (
                    <SelectItem key={t.key} value={t.key}>{t.emoji} {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="data">Data (opcional)</Label>
              <Input
                id="data"
                type="date"
                value={form.data}
                onChange={e => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                placeholder="Notas sobre o cardápio..."
                rows={2}
                value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNovo(false)}>Cancelar</Button>
            <Button onClick={handleNovo} disabled={salvando || !form.nome.trim() || !form.tipo}>
              {salvando ? "Criando..." : "Criar Cardápio"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}