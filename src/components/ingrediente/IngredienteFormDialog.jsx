import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import CalculadoraCusto from "@/components/CalculadoraCusto";
import SinonimosSection from "@/components/ingrediente/SinonimosSection";
import { toSentenceCaseName } from "@/lib/textCase";

// Fase 3:
// - nome, categoria e fator de correção pertencem ao catálogo mestre;
// - unidade de compra, embalagem, preço e fornecedor são dados comerciais pessoais.
export default function IngredienteFormDialog({ open, onClose, item, onSave, saving, fornecedorSuggestions = [], isAdmin = true }) {
  const [form, setForm] = useState(/** @type {any} */ ({}));
  const [erroQuantidade, setErroQuantidade] = useState(null);
  const [novosSinonimos, setNovosSinonimos] = useState([]);

  const resetForm = () => {
    setErroQuantidade(null);
    setNovosSinonimos([]);
    if (item) {
      setForm({ ...item, _preco_anterior: item.preco_embalagem_rs, _peso_anterior: item.peso_embalagem_g });
    } else {
      setForm({ categoria: "A Revisar", nome: "", unidade_compra: "KG", peso_embalagem_g: 1000, preco_embalagem_rs: 0, fator_correcao: 1.0, fornecedor: "" });
    }
  };

  const avisoPreco = (form.peso_embalagem_g > 0 && !(form.preco_embalagem_rs > 0))
    ? "Sem preço informado — o custo deste ingrediente ficará zerado nas receitas"
    : null;

  const handleSave = () => {
    if (!item && !isAdmin) {
      toast.error("Somente administradores podem cadastrar novos ingredientes");
      return;
    }
    if (!form.nome?.trim()) { toast.error("Informe o nome do ingrediente"); return; }
    const precoPreenchido = (form.preco_embalagem_rs || 0) > 0;
    const quantidadePreenchida = (form.peso_embalagem_g || 0) > 0;
    if (precoPreenchido && !quantidadePreenchida) {
      setErroQuantidade("Informe a quantidade (g/ml) para calcular o R$/kg");
      return;
    }
    setErroQuantidade(null);
    onSave({ ...form, nome: toSentenceCaseName(form.nome), _novos_sinonimos: novosSinonimos });
  };

  const formatCurrency = (v) => v != null ? "R$ " + v.toFixed(2).replace(".", ",") : "—";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); else resetForm(); }}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0" onOpenAutoFocus={(e) => { e.preventDefault(); resetForm(); }}>
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="font-display">
            {!isAdmin && item ? "Editar meus dados de compra" : item ? "Editar Ingrediente" : "Novo Ingrediente"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 space-y-3">
          <div>
            <Label>Nome</Label>
            <Input
              value={form.nome || ""}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select
              value={form.categoria || "A Revisar"}
              onValueChange={(v) => setForm({ ...form, categoria: v })}
              disabled={!isAdmin}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Carnes e Ovos", "Verduras e Hortaliças", "Temperos", "Laticínios", "Panificação e Cereais", "Açúcares e Doces", "Diversos", "A Revisar", "Peixes e Frutos do Mar", "Frutas", "Óleos e Gorduras"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fator de correção</Label>
            <Input
              type="number"
              step="0.01"
              value={form.fator_correcao ?? 1.0}
              onChange={(e) => setForm({ ...form, fator_correcao: parseFloat(e.target.value) || 1.0 })}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">Padrão: 1.0. Ajuste para ingredientes com perda (cascas, ossos, etc.)</p>
          </div>

          {!isAdmin && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
              Nome, categoria e fator de correção pertencem ao cadastro técnico compartilhado. Os dados de compra abaixo são somente seus e não afetam outros usuários.
            </p>
          )}

          <div>
            <Label>Unidade de compra</Label>
            <Input
              value={form.unidade_compra || ""}
              onChange={(e) => setForm({ ...form, unidade_compra: e.target.value.toUpperCase() })}
              placeholder="KG, LT, UN, CX, POTE..."
            />
          </div>

          <CalculadoraCusto
            initialQuantidade={form.peso_embalagem_g || ""}
            initialPrecoTotal={form.preco_embalagem_rs || ""}
            erroQuantidade={erroQuantidade}
            avisoPreco={avisoPreco}
            onChange={({ peso_embalagem_g, preco_embalagem_rs }) => {
              setForm({ ...form, peso_embalagem_g, preco_embalagem_rs });
              if (peso_embalagem_g > 0) setErroQuantidade(null);
            }}
          />

          <div>
            <Label>Fornecedor</Label>
            <Input
              value={form.fornecedor || ""}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              placeholder="Nome do fornecedor"
              list="fornecedores-sugestoes"
            />
            <datalist id="fornecedores-sugestoes">
              {fornecedorSuggestions.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>

          {isAdmin && item && (item.historico_precos || []).length > 0 && (
            <div>
              <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Histórico de preços</Label>
              <div className="mt-2 space-y-1.5">
                {(item.historico_precos || []).slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded p-1.5">
                    <span className="text-muted-foreground">{new Date(h.data).toLocaleDateString("pt-BR")}</span>
                    <span className="font-medium">{formatCurrency(h.preco_por_kg)}/kg</span>
                    <span className={h.variacao_percentual > 0 ? "text-red-600" : h.variacao_percentual < 0 ? "text-green-600" : "text-gray-400"}>
                      {h.variacao_percentual > 0 ? "+" : ""}{h.variacao_percentual}%
                    </span>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">{h.fonte}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAdmin && (
            item?.id ? (
              <SinonimosSection ingredienteId={item.id} />
            ) : (
              <SinonimosSection localSinonimos={novosSinonimos} onLocalChange={setNovosSinonimos} />
            )
          )}
        </div>
        <div className="flex gap-2 justify-end px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
