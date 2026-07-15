import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import IngredienteFichaHeader from "@/components/ingrediente/ficha/IngredienteFichaHeader";
import CompraCustoCard from "@/components/ingrediente/ficha/CompraCustoCard";
import MedidaSinonimosCard from "@/components/ingrediente/ficha/MedidaSinonimosCard";
import HistoricoPrecosCard from "@/components/ingrediente/ficha/HistoricoPrecosCard";
import UsoReceitasCard from "@/components/ingrediente/ficha/UsoReceitasCard";
import IngredienteFormDialog from "@/components/ingrediente/IngredienteFormDialog";
import { useSalvarIngrediente } from "@/lib/useSalvarIngrediente";

export default function IngredienteAberto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: ingrediente, isLoading } = useQuery({
    queryKey: ["ingrediente", id],
    queryFn: async () => {
      const r = await base44.entities.Ingrediente.filter({ id });
      return r[0] || null;
    },
  });

  const { data: todosIngredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const fornecedorSuggestions = [...new Set(
    todosIngredientes.map((i) => i.fornecedor?.trim()).filter(Boolean)
  )].sort();

  const favoritarMut = useMutation({
    mutationFn: () => base44.entities.Ingrediente.update(id, { favorito: !ingrediente.favorito }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingrediente", id] }),
  });

  const saveMut = useSalvarIngrediente(() => setShowForm(false));

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!ingrediente) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">Ingrediente não encontrado</p>
        <button className="text-primary underline mt-2" onClick={() => navigate("/ingredientes")}>Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <IngredienteFichaHeader
        ingrediente={ingrediente}
        onEditar={() => setShowForm(true)}
        onToggleFavorito={() => favoritarMut.mutate()}
        favoritando={favoritarMut.isPending}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CompraCustoCard ingrediente={ingrediente} />
        <MedidaSinonimosCard ingrediente={ingrediente} />
      </div>

      <HistoricoPrecosCard ingrediente={ingrediente} />
      <UsoReceitasCard ingrediente={ingrediente} />

      <IngredienteFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        item={ingrediente}
        onSave={(data) => saveMut.mutate(data)}
        saving={saveMut.isPending}
        fornecedorSuggestions={fornecedorSuggestions}
      />
    </div>
  );
}