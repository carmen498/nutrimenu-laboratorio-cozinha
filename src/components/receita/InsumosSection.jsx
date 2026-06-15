import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Package, Search, Check, X } from "lucide-react";
import { toast } from "sonner";

const INSUMOS_PREDEFINIDOS = [
  // Materiais
  { nome: "Papel manteiga", categoria: "material", unidade: "cm" },
  { nome: "Papel alumínio", categoria: "material", unidade: "cm" },
  { nome: "Papel filme", categoria: "material", unidade: "cm" },
  { nome: "Saco plástico pequeno", categoria: "material", unidade: "unidade" },
  { nome: "Saco plástico grande", categoria: "material", unidade: "unidade" },
  { nome: "Luvas descartáveis", categoria: "material", unidade: "par" },
  { nome: "Palito/espeto", categoria: "material", unidade: "unidade" },
  // Embalagens
  { nome: "Caixa", categoria: "embalagem", unidade: "unidade" },
  { nome: "Bandeja", categoria: "embalagem", unidade: "unidade" },
  { nome: "Pote com tampa", categoria: "embalagem", unidade: "unidade" },
  { nome: "Saquinho com logo", categoria: "embalagem", unidade: "unidade" },
  { nome: "Marmita descartável", categoria: "embalagem", unidade: "unidade" },
];

export default function InsumosSection({ receitaId }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [customNome, setCustomNome] = useState("");
  const [customCat, setCustomCat] = useState("material");
  const [customUnidade, setCustomUnidade] = useState("unidade");
  const [editingId, setEditingId] = useState(null);
  const [editingCusto, setEditingCusto] = useState("");

  const { data: insumosReceita = [] } = useQuery({
    queryKey: ["insumos-receita", receitaId],
    queryFn: () => base44.entities.InsumoReceita.filter({ receita_id: receitaId }),
  });

  const { data: insumosDB = [] } = useQuery({
    queryKey: ["insumos-db"],
    queryFn: () => base44.entities.Insumo.list("-nome", 500),
  });

  const filtered = useMemo(() => {
    if (!busca.trim()) return [];
    const term = busca.toLowerCase();
    return INSUMOS_PREDEFINIDOS.filter(i =>
      i.nome.toLowerCase().includes(term) &&
      !insumosReceita.some(ir => ir.insumo_nome?.toLowerCase() === i.nome.toLowerCase())
    );
  }, [busca, insumosReceita]);

  const addMut = useMutation({
    mutationFn: async (insumo) => {
      // Find or create in DB
      let insumoDB = insumosDB.find(i => i.nome?.toLowerCase() === insumo.nome.toLowerCase());
      if (!insumoDB) {
        insumoDB = await base44.entities.Insumo.create({
          nome: insumo.nome,
          categoria: insumo.categoria,
          unidade: insumo.unidade,
          preco_unitario: 0,
        });
      }
      await base44.entities.InsumoReceita.create({
        receita_id: receitaId,
        insumo_id: insumoDB.id,
        insumo_nome: insumoDB.nome,
        categoria: insumoDB.categoria,
        quantidade: 1,
        unidade: insumoDB.unidade,
        custo_unitario: insumoDB.preco_unitario || 0,
        custo_total: insumoDB.preco_unitario || 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["insumos-db"] });
      setPopoverOpen(false);
      setBusca("");
      toast.success("Insumo adicionado");
    },
  });

  const addCustomMut = useMutation({
    mutationFn: async () => {
      if (!customNome.trim()) return;
      const insumoDB = await base44.entities.Insumo.create({
        nome: customNome.trim(),
        categoria: customCat,
        unidade: customUnidade,
        preco_unitario: 0,
      });
      await base44.entities.InsumoReceita.create({
        receita_id: receitaId,
        insumo_id: insumoDB.id,
        insumo_nome: insumoDB.nome,
        categoria: insumoDB.categoria,
        quantidade: 1,
        unidade: insumoDB.unidade,
        custo_unitario: 0,
        custo_total: 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["insumos-db"] });
      setCustomNome("");
      toast.success("Insumo adicionado");
    },
  });

  const updateCustoMut = useMutation({
    mutationFn: async ({ itemId, custo_unitario }) => {
      const item = insumosReceita.find(i => i.id === itemId);
      const qtd = item?.quantidade || 1;
      await base44.entities.InsumoReceita.update(itemId, {
        custo_unitario,
        custo_total: parseFloat((custo_unitario * qtd).toFixed(2)),
      });
      // Also update the master Insumo record
      if (item?.insumo_id) {
        await base44.entities.Insumo.update(item.insumo_id, { preco_unitario: custo_unitario });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["insumos-db"] });
      setEditingId(null);
    },
  });

  const updateQtdMut = useMutation({
    mutationFn: async ({ itemId, quantidade }) => {
      const item = insumosReceita.find(i => i.id === itemId);
      const cu = item?.custo_unitario || 0;
      await base44.entities.InsumoReceita.update(itemId, {
        quantidade,
        custo_total: parseFloat((cu * quantidade).toFixed(2)),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] }),
  });

  const deleteMut = useMutation({
    mutationFn: (itemId) => base44.entities.InsumoReceita.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      toast.success("Insumo removido");
    },
  });

  const custoTotalInsumos = insumosReceita.reduce((s, i) => s + (i.custo_total || 0), 0);

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "R$ 0,00";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Package className="w-5 h-5" /> Insumos e Embalagens
        </h2>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end">
            <div className="p-2">
              <Input
                placeholder="Buscar insumo..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto border-t">
              {filtered.map((ins, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex justify-between items-center"
                  onClick={() => addMut.mutate(ins)}
                >
                  <span>{ins.nome}</span>
                  <span className="text-xs text-muted-foreground capitalize">{ins.categoria} · {ins.unidade}</span>
                </button>
              ))}
              {busca.trim() && filtered.length === 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-2">Nenhum encontrado. Cadastrar novo:</p>
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Nome do insumo"
                      value={customNome}
                      onChange={(e) => setCustomNome(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-1.5">
                      <Select value={customCat} onValueChange={setCustomCat}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="material">Material</SelectItem>
                          <SelectItem value="embalagem">Embalagem</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={customUnidade} onValueChange={setCustomUnidade}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unidade">unidade</SelectItem>
                          <SelectItem value="cm">cm</SelectItem>
                          <SelectItem value="folha">folha</SelectItem>
                          <SelectItem value="par">par</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => addCustomMut.mutate()} disabled={!customNome.trim()}>
                      <Plus className="w-3 h-3 mr-1" /> Cadastrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {insumosReceita.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Nenhum insumo ou embalagem adicionado</p>
          <p className="text-xs mt-1">Adicione papel manteiga, caixas, sacos, etc.</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {insumosReceita.map((item) => (
            <Card key={item.id} className="p-2.5">
              <div className="grid grid-cols-12 gap-2 items-center text-sm">
                <div className="col-span-5 min-w-0">
                  <p className="font-medium truncate text-sm">{item.insumo_nome}</p>
                  <span className="text-[10px] text-muted-foreground capitalize">{item.categoria}</span>
                </div>
                <div className="col-span-2 text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      className="h-7 w-14 text-xs text-center"
                      min={0}
                      step={1}
                      value={item.quantidade || 1}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        updateQtdMut.mutate({ itemId: item.id, quantidade: val });
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.unidade}</span>
                  </div>
                </div>
                <div className="col-span-3 text-center">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="number"
                        className="h-7 w-20 text-xs text-center"
                        value={editingCusto}
                        onChange={(e) => setEditingCusto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            updateCustoMut.mutate({ itemId: item.id, custo_unitario: parseFloat(editingCusto) || 0 });
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        step={0.01}
                        min={0}
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCustoMut.mutate({ itemId: item.id, custo_unitario: parseFloat(editingCusto) || 0 })}>
                        <Check className="w-3 h-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="hover:underline hover:text-primary font-semibold text-primary text-xs"
                      onClick={() => { setEditingId(item.id); setEditingCusto(String(item.custo_unitario || 0)); }}
                    >
                      {formatCurrency(item.custo_unitario || 0)}
                    </button>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <span className="text-xs font-semibold text-primary">
                      {formatCurrency(item.custo_total || 0)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMut.mutate(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-end pt-1 pr-2">
            <span className="text-sm font-semibold text-primary">
              Total insumos: {formatCurrency(custoTotalInsumos)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}