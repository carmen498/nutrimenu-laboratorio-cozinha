import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, Trash2, ListX, Plus, FileDown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { printarElementoIsolado } from "@/lib/printIsolado";
import CarrinhoItemRow from "@/components/carrinho/CarrinhoItemRow";
import AdicionarIngredienteCarrinhoDialog from "@/components/carrinho/AdicionarIngredienteCarrinhoDialog";
import CarrinhoPDFPreview from "@/components/carrinho/CarrinhoPDFPreview";

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

export default function Carrinho() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [edits, setEdits] = useState({});
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [showAdicionar, setShowAdicionar] = useState(false);
  const [showPreviewPDF, setShowPreviewPDF] = useState(false);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["carrinho-itens"],
    queryFn: () => fetchAllPages(base44.entities.CarrinhoItem, "-created_date"),
  });

  const { data: ingredientesDB = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const ingMap = useMemo(() => {
    const map = {};
    ingredientesDB.forEach((i) => { map[i.id] = i; });
    return map;
  }, [ingredientesDB]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["carrinho-itens"] });

  const getQtd = (item) => {
    const edit = edits[item.id];
    if (edit != null) return parseFloat(edit.replace(",", ".")) || 0;
    return item.quantidade_embalagens || 0;
  };

  const handleChangeQtd = (item, value) => setEdits((prev) => ({ ...prev, [item.id]: value }));

  const handleBlurQtd = async (item) => {
    if (edits[item.id] == null) return;
    const novaQtd = getQtd(item);
    setEdits((prev) => { const p = { ...prev }; delete p[item.id]; return p; });
    if (novaQtd === (item.quantidade_embalagens || 0)) return;
    try {
      await base44.entities.CarrinhoItem.update(item.id, { quantidade_embalagens: novaQtd });
      invalidar();
    } catch (e) { toast.error("Erro ao atualizar quantidade"); }
  };

  const handleToggleComprado = async (item, comprado) => {
    try {
      await base44.entities.CarrinhoItem.update(item.id, { comprado });
      invalidar();
    } catch (e) { toast.error("Erro ao atualizar item"); }
  };

  const handleRemove = async (item) => {
    try {
      await base44.entities.CarrinhoItem.delete(item.id);
      invalidar();
      toast.success("Item removido do carrinho");
    } catch (e) { toast.error("Erro ao remover item"); }
  };

  const handleLimparCarrinho = async () => {
    setConfirmarLimpar(false);
    if (itens.length === 0) return;
    try {
      await base44.entities.CarrinhoItem.deleteMany({ id: { $in: itens.map((i) => i.id) } });
      invalidar();
      toast.success("Carrinho esvaziado");
    } catch (e) { toast.error("Erro ao limpar carrinho"); }
  };

  const handleLimparComprados = async () => {
    const comprados = itens.filter((i) => i.comprado);
    if (comprados.length === 0) return;
    try {
      await base44.entities.CarrinhoItem.deleteMany({ id: { $in: comprados.map((i) => i.id) } });
      invalidar();
      toast.success("Itens comprados removidos");
    } catch (e) { toast.error("Erro ao limpar itens comprados"); }
  };

  // Agrupamento leve por categoria do ingrediente
  const grupos = useMemo(() => {
    const map = {};
    itens.forEach((item) => {
      const ing = ingMap[item.ingrediente_id];
      const cat = ing?.categoria || "Diversos";
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });
    Object.values(map).forEach((lista) =>
      lista.sort((a, b) => (ingMap[a.ingrediente_id]?.nome || a.ingrediente_nome || "")
        .localeCompare(ingMap[b.ingrediente_id]?.nome || b.ingrediente_nome || "")));
    return Object.keys(map).sort().map((cat) => ({ categoria: cat, itens: map[cat] }));
  }, [itens, ingMap]);

  const total = useMemo(() => itens.reduce((sum, item) => {
    const ing = ingMap[item.ingrediente_id];
    return sum + getQtd(item) * (ing?.preco_embalagem_rs || 0);
  }, 0), [itens, ingMap, edits]);

  const temComprados = itens.some((i) => i.comprado);

  const handleAddIngrediente = async (ing) => {
    try {
      const existentes = await base44.entities.CarrinhoItem.filter({ ingrediente_id: ing.id });
      if (existentes[0]) {
        await base44.entities.CarrinhoItem.update(existentes[0].id, {
          quantidade_embalagens: (existentes[0].quantidade_embalagens || 0) + 1,
        });
      } else {
        await base44.entities.CarrinhoItem.create({
          ingrediente_id: ing.id,
          ingrediente_nome: ing.nome,
          quantidade_embalagens: 1,
          comprado: false,
        });
      }
      invalidar();
      toast.success(`${ing.nome} adicionado ao carrinho`);
    } catch (e) {
      toast.error("Erro ao adicionar ao carrinho");
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Carrinho
          </h1>
        </div>
        {itens.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPreviewPDF((v) => !v)}>
              <FileDown className="w-4 h-4" /> Exportar PDF
            </Button>
            <Button size="sm" className="gap-1" onClick={() => setShowAdicionar(true)}>
              <Plus className="w-4 h-4" /> Adicionar ingrediente
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Selecione os ingredientes na medida da necessidade. Este carrinho serve como uma lista de reposição para o estoque.
      </p>

      {showPreviewPDF && itens.length > 0 && (
        <div className="space-y-2">
          <CarrinhoPDFPreview grupos={grupos} ingMap={ingMap} getQtd={getQtd} total={total} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setShowPreviewPDF(false)}>
              Fechar pré-visualização
            </Button>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => printarElementoIsolado("carrinho-pdf-preview", "@page { margin: 16mm 12mm; }")}
            >
              <FileDown className="w-4 h-4" /> Baixar PDF
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : itens.length === 0 ? (
        <Card
          className="p-12 text-center text-muted-foreground cursor-pointer hover:bg-accent/40 transition-colors"
          onClick={() => setShowAdicionar(true)}
        >
          <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-base">Selecione os ingredientes para adicionar à sua lista.</p>
        </Card>
      ) : (
        <>
          {grupos.map((g) => (
            <div key={g.categoria}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {g.categoria}
              </p>
              <div className="space-y-1">
                {g.itens.map((item) => {
                  const ing = ingMap[item.ingrediente_id];
                  const qtd = getQtd(item);
                  const custo = qtd * (ing?.preco_embalagem_rs || 0);
                  const qtdInput = edits[item.id] ?? String(item.quantidade_embalagens || 0).replace(".", ",");
                  return (
                    <CarrinhoItemRow
                      key={item.id}
                      item={item}
                      ingrediente={ing}
                      qtdInput={qtdInput}
                      custo={custo}
                      onChangeQtd={(v) => handleChangeQtd(item, v)}
                      onBlurQtd={() => handleBlurQtd(item)}
                      onToggleComprado={(v) => handleToggleComprado(item, v)}
                      onRemove={() => handleRemove(item)}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <Card className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total da compra</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="gap-1" onClick={() => setConfirmarLimpar(true)}>
              <Trash2 className="w-4 h-4" /> Limpar carrinho
            </Button>
            {temComprados && (
              <Button variant="outline" className="gap-1" onClick={handleLimparComprados}>
                <ListX className="w-4 h-4" /> Limpar comprados
              </Button>
            )}
          </div>
        </>
      )}

      <AlertDialog open={confirmarLimpar} onOpenChange={setConfirmarLimpar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar carrinho?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os itens do carrinho serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLimparCarrinho} className="bg-destructive hover:bg-destructive/90">
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdicionarIngredienteCarrinhoDialog
        open={showAdicionar}
        onClose={() => setShowAdicionar(false)}
        onAdd={handleAddIngrediente}
      />
    </div>
  );
}