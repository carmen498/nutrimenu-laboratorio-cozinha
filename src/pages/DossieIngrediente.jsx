import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Share2, AlertTriangle } from "lucide-react";
import { montarTextoCompartilhamentoDossie } from "@/lib/dossieIngredienteShare";
import { useAuth } from "@/lib/AuthContext";
import { buscarPrecosPersonalizados, aplicarPrecosPersonalizados } from "@/lib/precoIngredienteCliente";
import { abrirUrlHttpsSegura } from "@/lib/securityHardening";
import {
  buscarPreferenciasIngredientes,
  aplicarPreferenciasIngredientes,
} from "@/lib/preferenciaIngredienteUsuario";

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

function diasDesde(dataIso) {
  if (!dataIso) return null;
  return Math.floor((new Date() - new Date(dataIso)) / (1000 * 60 * 60 * 24));
}

export default function DossieIngrediente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

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
    const comPrecoLegado = isAdmin
      ? ingredienteRaw
      : aplicarPrecosPersonalizados([ingredienteRaw], precosPersonalizados)[0];
    return aplicarPreferenciasIngredientes(
      [comPrecoLegado],
      preferenciasIngredientes,
      { usarFavoritoLegado: isAdmin }
    )[0];
  }, [ingredienteRaw, isAdmin, precosPersonalizados, preferenciasIngredientes]);

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

  const historico = (ingrediente.historico_precos || [])
    .slice()
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const dias = diasDesde(ingrediente.preco_atualizado_em);
  const precoDesatualizado = dias === null || dias > 90;
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  const handleShare = () => {
    const text = montarTextoCompartilhamentoDossie({ ingrediente });
    if (navigator.share) {
      navigator.share({ text });
    } else {
      abrirUrlHttpsSegura(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  const linhasCompra = [
    ["Unidade de compra", ingrediente.unidade_compra || "—"],
    ["Peso da embalagem", ingrediente.peso_embalagem_g != null ? `${ingrediente.peso_embalagem_g} g` : "—"],
    ["Preço da embalagem", ingrediente.preco_embalagem_rs != null ? formatCurrency(ingrediente.preco_embalagem_rs) : "—"],
    ["Preço por g/ml", `R$ ${(ingrediente.preco_por_g_rs || 0).toFixed(4).replace(".", ",")}`],
    ["Fornecedor", ingrediente.fornecedor || "—"],
    ["Fator de Correção (FC)", ingrediente.fator_correcao != null ? String(ingrediente.fator_correcao).replace(".", ",") : "1,0"],
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2 no-print">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/ingrediente/${id}`)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold flex-1">Dossiê do Ingrediente</h1>
        <div className="flex gap-2">
          <Button onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> ↓ Exportar PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-1" /> Compartilhar
          </Button>
        </div>
      </div>

      <style>{`
        @media print {
          @page { margin: 16mm 12mm; }
        }
      `}</style>

      <div className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
          <p className="font-display text-sm text-right">DOSSIÊ DO INGREDIENTE · emitido em {dataEmissao}</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold">{ingrediente.nome}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <Badge variant="secondary" className="text-xs">{ingrediente.categoria || "Sem categoria"}</Badge>
              {!isAdmin && ingrediente._dados_comerciais_pessoais && (
                <Badge variant="outline" className="text-xs">Dados de compra do usuário</Badge>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-display text-base font-bold mb-2">Compra e Custo</h3>
            <table className="w-full text-sm">
              <tbody>
                {linhasCompra.map(([label, valor]) => (
                  <tr key={label} className="border-b border-border/40">
                    <td className="py-1.5 text-muted-foreground">{label}</td>
                    <td className="py-1.5 text-right font-medium">{valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {historico.length > 0 && (
            <div style={{ breakInside: "avoid" }}>
              <h3 className="font-display text-base font-bold mb-2">Histórico de Preços ({historico.length})</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2">Data</th>
                    <th className="py-2 px-2 text-right">Preço/kg</th>
                    <th className="py-2 px-2 text-center">Variação</th>
                    <th className="py-2 px-2">Fornecedor</th>
                    <th className="py-2 pl-2">Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1.5 pr-2 whitespace-nowrap">{new Date(h.data).toLocaleDateString("pt-BR")}</td>
                      <td className="py-1.5 px-2 text-right font-medium whitespace-nowrap">
                        R$ {(h.preco_por_kg || 0).toFixed(2).replace(".", ",")}
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <span className={h.variacao_percentual > 0 ? "text-red-600" : h.variacao_percentual < 0 ? "text-green-600" : "text-gray-400"}>
                          {h.variacao_percentual > 0 ? "+" : ""}{h.variacao_percentual ?? 0}%
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground">{h.fornecedor || "—"}</td>
                      <td className="py-1.5 pl-2"><Badge variant="secondary" className="text-[10px]">{h.fonte}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            {precoDesatualizado && <AlertTriangle className="w-4 h-4 text-red-600" />}
            <span className={precoDesatualizado ? "text-red-600 font-medium" : "text-muted-foreground"}>
              Última atualização de preço: {ingrediente.preco_atualizado_em
                ? new Date(ingrediente.preco_atualizado_em).toLocaleDateString("pt-BR")
                : "nunca atualizado"}
              {dias !== null && ` (${dias} dia${dias === 1 ? "" : "s"})`}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
            Laboratório de Cozinha · Gastronomia Planejada · dados na data de emissão · {dataEmissao}
          </p>
        </div>
      </div>
    </div>
  );
}
