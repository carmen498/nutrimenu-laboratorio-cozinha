import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, MoreVertical, Pencil, Trash2, Star } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import FotoCarmenUpload from "@/components/dicascarmen/FotoCarmenUpload";
import EditarDicaCarmenDialog from "@/components/dicascarmen/EditarDicaCarmenDialog";

const TEMAS = ["Fritura", "Congelamento", "Per Capita", "Precificação", "Ingredientes", "Rendimento", "Geral"];

export default function DicasCarmen() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [temaAtivo, setTemaAtivo] = useState("Todas");
  const [editandoDica, setEditandoDica] = useState(null);
  const [excluindoDica, setExcluindoDica] = useState(null);

  const { data: dicas = [], isLoading } = useQuery({
    queryKey: ["dicas-carmen"],
    queryFn: () => base44.entities.DicaCarmen.filter({}, "-data_publicacao", 500),
  });

  const dicasVisiveis = isAdmin ? dicas : dicas.filter((d) => d.status === "publicado");
  const dicasFiltradas = temaAtivo === "Todas" ? dicasVisiveis : dicasVisiveis.filter((d) => d.tema === temaAtivo);

  const toggleDestaqueMut = useMutation({
    mutationFn: ({ id, destaque }) => base44.entities.DicaCarmen.update(id, { destaque }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dicas-carmen"] }),
  });

  const excluirMut = useMutation({
    mutationFn: (id) => base44.entities.DicaCarmen.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dicas-carmen"] });
      setExcluindoDica(null);
    },
  });

  return (
    <div className="pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-2xl font-bold" style={{ color: "#2A4E3D" }}>
            Dicas da Carmen
          </h1>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/dicas-carmen/nova")} style={{ background: "#2A4E3D" }}>
            <Plus className="w-4 h-4 mr-1" /> Nova dica
          </Button>
        )}
      </div>

      {isAdmin && <div className="mb-6"><FotoCarmenUpload /></div>}

      {/* Filtro por tema */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["Todas", ...TEMAS].map((t) => (
          <button
            key={t}
            onClick={() => setTemaAtivo(t)}
            className="px-3 py-1.5 rounded-full text-sm font-medium border transition-colors"
            style={
              temaAtivo === t
                ? { background: "#2A4E3D", color: "#fff", borderColor: "#2A4E3D" }
                : { background: "#fff", color: "#2A4E3D", borderColor: "#E8E0D5" }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando dicas...</p>
      ) : dicasFiltradas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma dica encontrada.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dicasFiltradas.map((dica) => (
            <div
              key={dica.id}
              className="relative flex flex-col rounded-lg overflow-hidden border bg-white hover:shadow-md transition-shadow group"
              style={{ borderColor: "#E8E0D5" }}
            >
              {isAdmin && (
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 rounded-full bg-white/90 hover:bg-white shadow" onClick={(e) => e.preventDefault()}>
                        <MoreVertical className="w-4 h-4" style={{ color: "#2A4E3D" }} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditandoDica(dica)}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleDestaqueMut.mutate({ id: dica.id, destaque: !dica.destaque })}>
                        <Star className="w-4 h-4 mr-2" /> {dica.destaque ? "Remover destaque" : "Marcar como destaque"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setExcluindoDica(dica)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <Link to={`/dicas-carmen/${dica.id}`} className="flex flex-col flex-1">
                <div className="aspect-[16/9] w-full overflow-hidden" style={{ background: "#EFE9DC" }}>
                  {dica.imagem_capa ? (
                    <img
                      src={dica.imagem_capa}
                      alt={dica.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-2xl font-bold" style={{ color: "#C9A24B" }}>LC</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: "#E7F0EA", color: "#2A4E3D" }}
                    >
                      {dica.tema}
                    </span>
                    {dica.destaque && (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FFF3CD", color: "#B8860B" }}>
                        Destaque
                      </span>
                    )}
                    {isAdmin && dica.status === "rascunho" && (
                      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#ECEFF1", color: "#455A64" }}>
                        Rascunho
                      </span>
                    )}
                  </div>
                  <p className="font-semibold" style={{ color: "#2A4E3D" }}>{dica.titulo}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {editandoDica && (
        <EditarDicaCarmenDialog
          open={true}
          dica={editandoDica}
          onClose={() => setEditandoDica(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["dicas-carmen"] }); setEditandoDica(null); }}
        />
      )}

      <AlertDialog open={!!excluindoDica} onOpenChange={(v) => !v && setExcluindoDica(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{excluindoDica?.titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A dica será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluirMut.mutate(excluindoDica.id)}
              disabled={excluirMut.isPending}
            >
              {excluirMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}