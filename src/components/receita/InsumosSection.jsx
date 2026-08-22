import { criarInsumoReceita } from '@/lib/secureChildEntities';
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
const useMutationAny = /** @type {any} */ (useMutation);
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Package, Check, X, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const INSUMOS_PREDEFINIDOS = [
  // Materiais
  { nome: "Papel manteiga", categoria: "material", unidade: "folha" },
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
  const [editingNomeId, setEditingNomeId] = useState(null);
  const [editingNome, setEditingNome] = useState("");
  const [savedCustoId, setSavedCustoId] = useState(null);

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
    const words = busca.toLowerCase().trim().split(/\s+/);
    const matchSearch = (nome) => {
      const n = nome.toLowerCase();
      return words.every(w => n.includes(w));
    };
    const existingNames = new Set(insumosReceita.map(ir => ir.insumo_nome?.toLowerCase()));
    const seenNames = new Set();
    const results = [];
    // Search DB insumos first
    insumosDB.forEach(i => {
      if (matchSearch(i.nome) && !existingNames.has(i.nome.toLowerCase()) && !seenNames.has(i.nome.toLowerCase())) {
        results.push({ nome: i.nome, categoria: i.categoria, unidade: i.unidade });
        seenNames.add(i.nome.toLowerCase());
      }
    });
    // Then predefinidos
    INSUMOS_PREDEFINIDOS.forEach(i => {
      if (matchSearch(i.nome) && !existingNames.has(i.nome.toLowerCase()) && !seenNames.has(i.nome.toLowerCase())) {
        results.push(i);
        seenNames.add(i.nome.toLowerCase());
      }
    });
    return results;
  }, [busca, insumosReceita, insumosDB]);

  const addMut = useMutationAny({
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
      await criarInsumoReceita({
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

  const addCustomMut = useMutationAny({
    mutationFn: async () => {
      if (!customNome.trim()) return;
      const insumoDB = await base44.entities.Insumo.create({
        nome: customNome.trim(),
        categoria: customCat,
        unidade: customUnidade,
        preco_unitario: 0,
      });
      await criarInsumoReceita({
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

  const updateCustoMut = useMutationAny({
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
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["insumos-db"] });
      setEditingId(null);
      setSavedCustoId(vars.itemId);
      setTimeout(() => setSavedCustoId(null), 1200);
      toast.success("Custo unitário salvo");
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const updateQtdMut = useMutationAny({
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

  const updateNomeMut = useMutationAny({
    mutationFn: async ({ itemId, nome }) => {
      await base44.entities.InsumoReceita.update(itemId, { insumo_nome: nome });
      const item = insumosReceita.find(i => i.id === itemId);
      if (item?.insumo_id) {
        await base44.entities.Insumo.update(item.insumo_id, { nome });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["insumos-db"] });
      setEditingNomeId(null);
      toast.success("Nome atualizado");
    },
  });

  const deleteMut = useMutationAny({
    mutationFn: (itemId) => base44.entities.InsumoReceita.delete(itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["insumos-receita", receitaId] });
      toast.success("Insumo removido");
    },
  });

  const confirmCusto = (itemId) => {
    const val = parseFloat(String(editingCusto).replace(",", "."));
    if (!isNaN(val) && val >= 0) {
      updateCustoMut.mutate({ itemId, custo_unitario: parseFloat(val.toFixed(2)) });
    } else {
      setEditingId(null);
    }
  };

  const custoTotalInsumos = insumosReceita.reduce((s, i) => s + (i.custo_total || 0), 0);

  const formatCurrency = (v) => v != null ? `R$ ${v.toFixed(2).replace(".", ",")}` : "R$ 0,00";
  const temPreco = (item) => (item.custo_unitario || 0) > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5" /> Insumos e Embalagens
          </h2>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground/60 hover:text-muted-foreground shrink-0"
                title="O que são Insumos e Embalagens?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-h-96 overflow-y-auto text-sm" align="start">
              <p className="font-semibold mb-2">O que são Insumos e Embalagens?</p>
              <p className="text-muted-foreground mb-3">
                São itens que não fazem parte da receita como alimento, mas têm custo de produção e devem ser considerados no preço final — embalagens, materiais de higiene e itens de acabamento para venda ou serviço.
              </p>
              <p className="text-foreground font-medium mb-1">Embalagens</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground mb-3">
                <li>Papel manteiga</li>
                <li>Papel alumínio</li>
                <li>Papel de fritura (papel siliconado)</li>
                <li>Sacos plásticos (variados tamanhos)</li>
                <li>Filme plástico (PVC)</li>
                <li>Potes e marmitas descartáveis</li>
                <li>Copos e potes com tampa</li>
                <li>Caixas de papelão/cartonadas</li>
                <li>Etiquetas e rótulos</li>
                <li>Fitas adesivas ou lacres</li>
              </ol>
              <p className="text-foreground font-medium mb-1">Higiene e proteção</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground mb-3" start={11}>
                <li>Luvas descartáveis</li>
                <li>Touca descartável</li>
                <li>Máscara descartável</li>
                <li>Papel toalha</li>
              </ol>
              <p className="text-foreground font-medium mb-1">Finalização e apresentação</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground" start={15}>
                <li>Palitos (para espetinhos, docinhos)</li>
                <li>Cordão ou fitilho</li>
                <li>Forminhas de papel (docinhos, cupcakes)</li>
                <li>Guardanapos personalizados</li>
              </ol>
            </PopoverContent>
          </Popover>
        </div>
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
                  {editingNomeId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editingNome}
                        onChange={(e) => setEditingNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingNome.trim()) updateNomeMut.mutate({ itemId: item.id, nome: editingNome.trim() });
                          if (e.key === "Escape") setEditingNomeId(null);
                        }}
                        autoFocus
                      />
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (editingNome.trim()) updateNomeMut.mutate({ itemId: item.id, nome: editingNome.trim() }); }}>
                        <Check className="w-3 h-3 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingNomeId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-1">
                        <p className="font-medium truncate text-sm">{item.insumo_nome}</p>
                        <button
                          className="text-muted-foreground hover:text-primary shrink-0"
                          onClick={() => { setEditingNomeId(item.id); setEditingNome(item.insumo_nome); }}
                          title="Editar nome"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                      </div>
                    </>

                  )}
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
                  <span className="block text-[10px] text-muted-foreground mb-0.5">Custo unit.</span>
                  {editingId === item.id ? (
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="h-7 w-20 text-xs text-center"
                        value={editingCusto}
                        onChange={(e) => setEditingCusto(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Tab") {
                            e.preventDefault();
                            confirmCusto(item.id);
                          }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => setTimeout(() => confirmCusto(item.id), 150)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      className={`hover:underline font-semibold text-xs ${temPreco(item) ? "text-primary hover:text-primary" : "text-muted-foreground"}`}
                      onClick={() => { setEditingId(item.id); setEditingCusto(String((item.custo_unitario || 0)).replace(".", ",")); }}
                    >
                      {temPreco(item) ? formatCurrency(item.custo_unitario) : "—"}
                    </button>
                  )}
                </div>
                <div className="col-span-2 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <span className={`text-xs font-semibold transition-colors duration-300 ${!temPreco(item) ? "text-muted-foreground" : savedCustoId === item.id ? "text-green-600" : "text-primary"}`}>
                      {temPreco(item) ? formatCurrency(item.custo_total || 0) : "—"}
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