import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, Scale, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from "@/components/ui/alert-dialog";
import NovoPlanejamentoDialog from "./NovoPlanejamentoDialog";

export default function ListaPlanejamentos() {
  const navigate = useNavigate();
  const [planejamentos, setPlanejamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [excluirItem, setExcluirItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const lista = await base44.entities.Planejamento.list("-created_date", 200);
      setPlanejamentos(lista || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtrados = useMemo(() => {
    if (!busca.trim()) return planejamentos;
    const q = busca.toLowerCase();
    return planejamentos.filter(p => (p.nome || "").toLowerCase().includes(q));
  }, [planejamentos, busca]);

  const handleExcluir = async () => {
    if (!excluirItem) return;
    try {
      await base44.entities.Planejamento.delete(excluirItem.id);
      setExcluirItem(null);
      load();
    } catch (e) { console.error(e); }
  };

  const handleEdit = (p) => {
    setEdicao(p);
    setShowDialog(true);
  };

  const handleAbrirCard = (p) => {
    setEdicao(p);
    setShowDialog(true);
  };

  const handleNovo = () => {
    setEdicao(null);
    setShowDialog(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar planejamento..." className="pl-10" value={busca}
            onChange={e => setBusca(e.target.value)} />
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Planejamento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {busca ? "Nenhum planejamento encontrado." : "Nenhum planejamento criado ainda."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => (
            <div key={p.id}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAbrirCard(p)}>
              <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                <h3 className="font-semibold text-foreground truncate">{p.nome}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {p.tipo_planejamento && (
                    <Badge variant="secondary" className="text-xs">{p.tipo_planejamento}</Badge>
                  )}
                  {p.tipo_servico && (
                    <Badge variant="outline" className="text-xs">{p.tipo_servico}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3" /> {p.total_pessoas || (p.qtd_homens || 0) + (p.qtd_mulheres || 0) + (p.qtd_criancas || 0)} pessoas
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="w-3 h-3" /> {p.total_com_margem_kg?.toFixed(1).replace(".", ",") || "0,0"} kg
                  </span>
                  {p.cardapio_config && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">Cardápio</Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => handleEdit(p)}>
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                  </DropdownMenuItem>
                  {p.cardapio_config && (
                    <DropdownMenuItem onClick={() => navigate(`/lista-compras?planejamento=${p.id}`)}>
                      <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Lista de Compras
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive" onClick={() => setExcluirItem(p)}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <NovoPlanejamentoDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onSaved={load}
        planejamentoEdicao={edicao}
      />

      <AlertDialog open={!!excluirItem} onOpenChange={(v) => !v && setExcluirItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir planejamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{excluirItem?.nome}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}