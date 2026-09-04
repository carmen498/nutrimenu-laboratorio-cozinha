import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Users, Scale, ShoppingCart, FileText, Copy } from "lucide-react";
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
import RelatoriosPlanejamentoDialog from "./RelatoriosPlanejamentoDialog";
import { lerRascunhoEvento } from "@/lib/eventoRascunho";
import { consoleErrorSeguro } from "@/lib/securityHardening";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { toUpperName } from "@/lib/textCase";

export default function ListaPlanejamentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [planejamentos, setPlanejamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  // Retoma automaticamente o Assistente do Evento se houver um rascunho pendente
  // (ex: o usuário abriu uma receita a partir de um prato do evento e voltou).
  const rascunhoPendente = lerRascunhoEvento();
  const [showDialog, setShowDialog] = useState(!!rascunhoPendente);
  const [edicao, setEdicao] = useState(() =>
    rascunhoPendente?.planejamentoId ? { id: rascunhoPendente.planejamentoId } : null
  );
  const [excluirItem, setExcluirItem] = useState(null);
  const [relatorioItem, setRelatorioItem] = useState(null);
  const [importandoModelo, setImportandoModelo] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [lista, respostaModelo] = await Promise.all([
        base44.entities.Planejamento.list("-created_date", 200),
        base44.functions.invoke("obterEventoModelo", {}).catch(() => ({ data: { modelo: null } })),
      ]);
      const modelo = respostaModelo?.data?.modelo;
      const porId = new Map((lista || []).map(item => [item.id, item]));
      if (modelo?.id) porId.set(modelo.id, modelo);
      setPlanejamentos(
        Array.from(porId.values()).sort((a, b) =>
          new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
        )
      );
    } catch (e) { consoleErrorSeguro("Erro em planejamento", e); }
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
    } catch (e) { consoleErrorSeguro("Erro em planejamento", e); }
  };

  const handleUsarModelo = async (modelo) => {
    if (importandoModelo) return;
    setImportandoModelo(true);
    try {
      const {
        id, created_date, updated_date, created_by_id, created_by,
        is_modelo, modelo_origem_id, ...dadosModelo
      } = modelo;
      const copia = await base44.entities.Planejamento.create({
        ...dadosModelo,
        nome: toUpperName("NOVO EVENTO — CÓPIA DO MODELO"),
        is_modelo: false,
        modelo_origem_id: id,
      });
      await load();
      setEdicao(copia);
      setShowDialog(true);
      toast.success("Evento Modelo importado para sua conta.");
    } catch (e) {
      consoleErrorSeguro("Erro ao importar Evento Modelo", e);
      toast.error("Não foi possível importar o Evento Modelo.");
    } finally {
      setImportandoModelo(false);
    }
  };

  const handleEdit = (p) => {
    if (p.is_modelo && !isAdmin) {
      handleUsarModelo(p);
      return;
    }
    setEdicao(p);
    setShowDialog(true);
  };

  const handleAbrirCard = (p) => {
    if (p.is_modelo && !isAdmin) {
      handleUsarModelo(p);
      return;
    }
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
          <Input placeholder="Buscar evento..." className="pl-10" value={busca}
            onChange={e => setBusca(e.target.value)} />
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {busca ? "Nenhum evento encontrado." : "Nenhum evento criado ainda."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => (
            <div key={p.id}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAbrirCard(p)}>
              <div className="flex-1 min-w-0">
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
                  {p.is_modelo && (
                    <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">Modelo do sistema</Badge>
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
                  {p.is_modelo && !isAdmin ? (
                    <DropdownMenuItem onClick={() => handleUsarModelo(p)} disabled={importandoModelo}>
                      <Copy className="w-3.5 h-3.5 mr-2" /> Importar Evento Modelo
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleEdit(p)}>
                      <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                    </DropdownMenuItem>
                  )}
                  {!p.is_modelo && p.cardapio_config && (
                    <>
                      <DropdownMenuItem onClick={() => navigate(`/lista-compras?planejamento=${p.id}`)}>
                        <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Lista de Compras
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRelatorioItem(p)}>
                        <FileText className="w-3.5 h-3.5 mr-2" /> Relatórios
                      </DropdownMenuItem>
                    </>
                  )}
                  {(!p.is_modelo || isAdmin) && (
                    <DropdownMenuItem className="text-destructive" onClick={() => setExcluirItem(p)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                    </DropdownMenuItem>
                  )}
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

      <RelatoriosPlanejamentoDialog
        open={!!relatorioItem}
        onClose={() => setRelatorioItem(null)}
        planejamento={relatorioItem}
      />

      <AlertDialog open={!!excluirItem} onOpenChange={(v) => !v && setExcluirItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
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
