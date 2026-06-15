import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, CalendarDays, Users, Package, Scale, Calendar, ChevronRight } from "lucide-react";

const tipoConfig = {
  evento: { label: "Evento", icon: Users, color: "bg-purple-100 text-purple-700 border-purple-200" },
  marmitas: { label: "Marmitas", icon: Package, color: "bg-orange-100 text-orange-700 border-orange-200" },
  buffet: { label: "Buffet", icon: Scale, color: "bg-blue-100 text-blue-700 border-blue-200" },
  semanal: { label: "Semanal", icon: Calendar, color: "bg-green-100 text-green-700 border-green-200" },
};

export default function Cardapios() {
  const [cardapios, setCardapios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showNovo, setShowNovo] = useState(false);

  const [form, setForm] = useState({ nome: "", tipo: "", data: "", observacoes: "" });
  const [salvando, setSalvando] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Cardapio.list("-created_date", 50);
      setCardapios(lista || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return cardapios;
    const q = busca.toLowerCase();
    return cardapios.filter(c => (c.nome || "").toLowerCase().includes(q));
  }, [cardapios, busca]);

  const handleNovo = async () => {
    if (!form.nome.trim() || !form.tipo) return;
    setSalvando(true);
    try {
      await base44.entities.Cardapio.create({
        nome: form.nome.trim(),
        tipo: form.tipo,
        data: form.data || null,
        observacoes: form.observacoes.trim(),
        num_pessoas_ou_unidades: 1,
      });
      setForm({ nome: "", tipo: "", data: "", observacoes: "" });
      setShowNovo(false);
      load();
    } catch (e) {
      console.error(e);
    }
    setSalvando(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este cardápio?")) return;
    await base44.entities.Cardapio.delete(id);
    load();
  };

  const formatarData = (d) => {
    if (!d) return "—";
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
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

      {/* Busca */}
      <div className="relative mb-6">
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
          {busca ? "Nenhum cardápio encontrado." : "Nenhum cardápio criado ainda."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(c => {
            const cfg = tipoConfig[c.tipo] || tipoConfig.evento;
            const Icon = cfg.icon;
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <Link to={`/cardapio/${c.id}`} className="block">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate hover:text-primary transition-colors">
                          {c.nome?.toUpperCase?.() || c.nome}
                        </h3>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                        {c.data && <span>{formatarData(c.data)}</span>}
                        {c.num_pessoas_ou_unidades > 0 && (
                          <span>
                            {c.tipo === "evento" ? `${c.num_pessoas_ou_unidades} pessoas` :
                             c.tipo === "marmitas" ? `${c.num_pessoas_ou_unidades} marmitas` :
                             c.tipo === "buffet" ? `${c.num_pessoas_ou_unidades} kg` :
                             `${c.num_pessoas_ou_unidades} unidades`}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {c.custo_total > 0 && (
                      <p className="font-semibold text-foreground">
                        R$ {Number(c.custo_total).toFixed(2)}
                      </p>
                    )}
                    <button
                      className="text-xs text-muted-foreground hover:text-destructive mt-1"
                      onClick={(e) => { e.preventDefault(); handleDelete(c.id); }}
                    >
                      excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog Novo Cardápio */}
      <Dialog open={showNovo} onOpenChange={setShowNovo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cardápio</DialogTitle>
            <DialogDescription>Crie um cardápio para evento, marmitas, buffet ou cardápio semanal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="ex: Jantar corporativo 15/06"
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="evento">🍽️ Evento</SelectItem>
                  <SelectItem value="marmitas">📦 Marmitas</SelectItem>
                  <SelectItem value="buffet">⚖️ Buffet</SelectItem>
                  <SelectItem value="semanal">📅 Semanal</SelectItem>
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
                rows={3}
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