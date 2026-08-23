import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, PackageSearch, User, ArrowLeft, Store } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { buscarPreferenciasIngredientes, aplicarPreferenciasIngredientes } from "@/lib/preferenciaIngredienteUsuario";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados } from "@/lib/precoIngredienteCliente";
import { normalizarNome } from "@/lib/normalizarNome";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const formatCurrency = (v) => Number(v) > 0 ? `R$ ${Number(v).toFixed(2).replace(".", ",")}` : "—";

export default function MeusIngredientes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");

  const { data: ingredientesRaw = [], isLoading: loadingIngredientes } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => fetchAllPages(base44.entities.Ingrediente, "-nome"),
  });

  const { data: preferencias = {}, isLoading: loadingPreferencias } = useQuery({
    queryKey: ["preferencias-ingredientes", user?.id],
    queryFn: () => buscarPreferenciasIngredientes(user.id),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: precosPersonalizados = {} } = useQuery({
    queryKey: ["precos-personalizados", user?.id],
    queryFn: () => buscarPrecosPersonalizados(user.id),
    enabled: !!user?.id,
  });

  const meusIngredientes = useMemo(() => {
    const comPrecoLegado = aplicarPrecosPersonalizados(ingredientesRaw, precosPersonalizados);
    const aplicados = aplicarPreferenciasIngredientes(comPrecoLegado, preferencias);
    return aplicados.filter((i) => i._dados_comerciais_pessoais === true);
  }, [ingredientesRaw, precosPersonalizados, preferencias]);

  const filtrados = useMemo(() => {
    const termo = normalizarNome(busca);
    if (!termo) return meusIngredientes;
    return meusIngredientes.filter((i) =>
      [i.nome, i.fornecedor, i.categoria, i.unidade_compra]
        .filter(Boolean)
        .some((v) => normalizarNome(String(v)).includes(termo))
    );
  }, [meusIngredientes, busca]);

  const loading = loadingIngredientes || loadingPreferencias;

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">
            Meus Ingredientes <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{meusIngredientes.length}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ingredientes do catálogo do Laboratório com seus dados pessoais de compra, preço ou fornecedor.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar em meus ingredientes..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <PackageSearch className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhum ingrediente personalizado ainda</p>
          <p className="text-sm mt-1">
            Ao informar seu preço, embalagem ou fornecedor em um ingrediente, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtrados.sort((a, b) => a.nome?.localeCompare(b.nome)).map((i) => (
            <Link key={i.id} to={`/ingrediente/${i.id}`}>
              <Card className="pl-3 pr-3 py-3 flex items-center gap-3 hover:bg-accent/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{i.nome}</p>
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0 gap-1">
                      <User className="w-2.5 h-2.5" /> Personalizado
                    </Badge>
                    {i.categoria && <span className="text-[11px] text-muted-foreground">{i.categoria}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    {i.unidade_compra && <span>Compra: {i.unidade_compra}</span>}
                    {Number(i.peso_embalagem_g) > 0 && <span>Embalagem: {Number(i.peso_embalagem_g).toLocaleString("pt-BR")} g/ml</span>}
                    {i.fornecedor && (
                      <span className="inline-flex items-center gap-1"><Store className="w-3 h-3" /> {i.fornecedor}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-primary">{formatCurrency(i.preco_embalagem_rs)}</p>
                  {Number(i.preco_por_g_rs) > 0 && (
                    <p className="text-[11px] text-muted-foreground">{formatCurrency(Number(i.preco_por_g_rs) * 1000)}/kg ou L</p>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
