import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import IngredienteFichaHeader from "@/components/ingrediente/ficha/IngredienteFichaHeader";
import CompraCustoCard from "@/components/ingrediente/ficha/CompraCustoCard";
import MedidaSinonimosCard from "@/components/ingrediente/ficha/MedidaSinonimosCard";
import HistoricoPrecosCard from "@/components/ingrediente/ficha/HistoricoPrecosCard";
import UsoReceitasCard from "@/components/ingrediente/ficha/UsoReceitasCard";
import IngredienteFormDialog from "@/components/ingrediente/IngredienteFormDialog";
import FundirIngredienteDialog from "@/components/ingrediente/FundirIngredienteDialog";
import { useSalvarIngrediente } from "@/lib/useSalvarIngrediente";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { useAuth } from "@/lib/AuthContext";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados } from "@/lib/precoIngredienteCliente";
import {
  buscarPreferenciasIngredientes,
  aplicarPreferenciasIngredientes,
  salvarFavoritoIngrediente,
} from "@/lib/preferenciaIngredienteUsuario";

export default function IngredienteAberto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [showFundir, setShowFundir] = useState(false);

  useEffect(() => {
    if (searchParams.get("editar") === "1") setShowForm(true);
  }, [searchParams]);

  const { data: ingredienteRaw, isLoading } = useQuery({
    queryKey: ["ingrediente", id],
    queryFn: async () => {
      const r = await base44.entities.Ingrediente.filter({ id });
      return r[0] || null;
    },
  });

  const { data: precosPersonalizados = {} } = useQuery({
    queryKey: ["precos-personalizados", user?.id],
    queryFn: () => buscarPrecosPersonalizados(user.id),
    enabled: !isAdmin && !!user?.id,
  });

  const { data: preferenciasIngredientes = {} } = useQuery({
    queryKey: ["preferencias-ingredientes", user?.id],
    queryFn: () => buscarPreferenciasIngredientes(user.id),
    enabled: !!user?.id,
  });

  const ingrediente = useMemo(() => {
    if (!ingredienteRaw) return null;

    // Compatibilidade: preço legado primeiro; IngredienteUsuario por último,
    // pois é a fonte principal dos dados comerciais pessoais na Fase 3.
    const comPrecoLegado = isAdmin
      ? ingredienteRaw
      : aplicarPrecosPersonalizados([ingredienteRaw], precosPersonalizados)[0];

    return aplicarPreferenciasIngredientes(
      [comPrecoLegado],
      preferenciasIngredientes,
      { usarFavoritoLegado: isAdmin }
    )[0];
  }, [ingredienteRaw, isAdmin, precosPersonalizados, preferenciasIngredientes]);

  const { data: todosIngredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const fornecedorSuggestions = useMemo(() => {
    const valores = isAdmin
      ? todosIngredientes.map((i) => i.fornecedor?.trim())
      : Object.values(preferenciasIngredientes).map((i) => i.fornecedor?.trim());
    return [...new Set(valores.filter(Boolean))].sort();
  }, [isAdmin, todosIngredientes, preferenciasIngredientes]);

  const favoritarMut = useMutation({
    mutationFn: ({ favorito }) => salvarFavoritoIngrediente({
      ingredienteId: id,
      userId: user?.id,
      favorito,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferencias-ingredientes", user?.id] });
    },
  });

  const saveMut = useSalvarIngrediente(() => setShowForm(false), { isAdmin, userId: user?.id });

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
        isAdmin={isAdmin}
        onEditar={() => setShowForm(true)}
        onToggleFavorito={() => favoritarMut.mutate({ favorito: !ingrediente.favorito })}
        favoritando={favoritarMut.isPending}
        onFundir={() => isAdmin && setShowFundir(true)}
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
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <FundirIngredienteDialog
          open={showFundir}
          ingrediente={ingrediente}
          onClose={(fundido) => {
            setShowFundir(false);
            if (fundido) navigate("/ingredientes");
          }}
        />
      )}
    </div>
  );
}
