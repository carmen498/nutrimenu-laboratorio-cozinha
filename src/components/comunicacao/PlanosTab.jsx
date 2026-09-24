import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Pencil, RefreshCw, Star } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ConfiguracaoPlanoDialog from "./ConfiguracaoPlanoDialog";
import CondicoesComerciaisZR from "./CondicoesComerciaisZR";

const formatarPreco = (plano) => {
  const valor = (plano.preco_exibido || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sufixo = plano.periodo_exibido === "mes" ? "/mês" : plano.periodo_exibido === "ano" ? "/ano" : "";
  return `R$ ${valor}${sufixo}`;
};

const PRODUTOS_CONHECIDOS = ["laboratorio_cozinha", "laboratorio_custos", "guia_zr"];

const GRUPOS_BASE = [
  {
    produto: "laboratorio_cozinha",
    titulo: "Laboratório de Cozinha",
    descricao: "Produto-base e ofertas já comercializadas.",
    badge: "Produto-base",
    badgeVariant: "outline",
    labelCobranca: "cobrado",
  },
  {
    produto: "laboratorio_custos",
    titulo: "Laboratório de Custos",
    descricao: "Complemento opcional em preparação. Checkout e venda permanecem desligados.",
    badge: "Homologação",
    badgeVariant: "secondary",
    labelCobranca: "futuro checkout",
    sempreDesligada: true,
  },
  {
    produto: "guia_zr",
    titulo: "Guia Técnico ZR",
    descricao: "Faixas do livro, vendidas na mesma página de Planos. As faixas acumulam; cada compra vale 12 meses. \"Acesso livre\" não é produto.",
    badge: null,
    badgeVariant: "secondary",
    labelCobranca: "cobrado",
  },
];

const GRUPO_SEM_PRODUTO = {
  produto: null,
  titulo: "Sem produto",
  descricao: "Planos sem produto preenchido — precisam ser classificados antes de entrar em produção.",
  badge: "Revisão",
  badgeVariant: "outline",
  labelCobranca: "cobrado",
};

function montarGrupos(planos) {
  const grupos = [...GRUPOS_BASE];
  const produtosEncontrados = new Set(
    planos
      .map((p) => p.produto)
      .filter((v) => v != null && v !== "" && !PRODUTOS_CONHECIDOS.includes(v))
  );
  for (const produto of produtosEncontrados) {
    grupos.push({
      produto,
      titulo: produto,
      descricao: "Produto novo — ainda não nomeado na tela. Classifique para exibir o título correto.",
      badge: "Novo produto",
      badgeVariant: "outline",
      labelCobranca: "cobrado",
    });
  }
  grupos.push(GRUPO_SEM_PRODUTO);
  return grupos;
}

function estiloLinha(grupo, plano) {
  if (grupo.produto === "guia_zr") {
    return plano.venda_habilitada ? "border p-4" : "border border-dashed p-4 bg-muted/20";
  }
  if (grupo.produto === "laboratorio_custos") {
    return "border border-dashed p-4 bg-muted/20";
  }
  return "border p-4";
}

function mostrarDesligada(grupo, plano) {
  if (grupo.sempreDesligada) return true;
  if (grupo.produto === "guia_zr" && !plano.venda_habilitada) return true;
  return false;
}

export default function PlanosTab() {
  const [planoEdicao, setPlanoEdicao] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);

  const { data: planos = [], isLoading, refetch } = useQuery({
    queryKey: ["configuracao-planos"],
    queryFn: () => base44.entities.ConfiguracaoPlano.list("ordem"),
  });

  const planosPorProduto = (produto) =>
    produto === null
      ? planos.filter((p) => !PRODUTOS_CONHECIDOS.includes(p.produto))
      : planos.filter((p) => p.produto === produto);

  const renovacoes = planos.filter((p) => p.plano_id === "renovacao");
  const renovacao = renovacoes[0];
  const renovacaoInvalida =
    renovacoes.length !== 1 ||
    !(Number(renovacao?.valor_cobranca) > 0) ||
    !(Number(renovacao?.preco_exibido) >= 0) ||
    !String(renovacao?.nome || "").trim();

  const sincronizarRenovacao = async () => {
    setSincronizando(true);
    try {
      const corrigirValor = renovacoes.length === 1 && !(Number(renovacao?.valor_cobranca) > 0);
      const resposta = await base44.functions.invoke("sincronizarConfiguracaoPlanos", {
        corrigir_valor_cobranca: corrigirValor,
      });
      toast({ title: "Configuração de Renovação sincronizada", description: `Ação: ${resposta.data?.acao || "concluída"}.` });
      await refetch();
    } catch (err) {
      toast({
        title: "Não foi possível sincronizar Renovação",
        description: err?.response?.data?.error || err.message || "Revise a configuração e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSincronizando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Edite aqui os valores e textos exibidos na tela pública de Planos. O valor "cobrado no checkout" é o que
        efetivamente será debitado no Mercado Pago.
      </p>

      <CondicoesComerciaisZR />

      {renovacaoInvalida && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Configuração de Renovação precisa de atenção</p>
              <p className="text-sm">
                {renovacoes.length > 1
                  ? `Existem ${renovacoes.length} registros de Renovação. Remova a duplicidade antes de sincronizar.`
                  : "Crie ou corrija a configuração de Renovação para liberar o checkout e o preflight."}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled={sincronizando || renovacoes.length > 1} onClick={sincronizarRenovacao}>
            {sincronizando ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Sincronizar Renovação
          </Button>
        </div>
      )}

      {montarGrupos(planos).map((grupo, idx) => {
        const itens = planosPorProduto(grupo.produto);
        const badgeTexto = grupo.produto === "guia_zr"
          ? (itens.some((p) => p.venda_habilitada) ? "Venda ligada" : "Venda desligada")
          : grupo.badge;
        return (
          <div key={grupo.produto || "sem-produto"} className={`space-y-3 ${idx > 0 ? "pt-5 border-t" : "pt-2"}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{grupo.titulo}</h3>
                <p className="text-xs text-muted-foreground">{grupo.descricao}</p>
              </div>
              {badgeTexto && <Badge variant={grupo.badgeVariant}>{badgeTexto}</Badge>}
            </div>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">Nenhum plano neste produto.</p>
            ) : (
              itens.map((plano) => (
                <div key={plano.id} className={`flex items-center justify-between gap-4 rounded-lg ${estiloLinha(grupo, plano)}`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{plano.nome}</p>
                      {plano.mais_popular && <Badge className="gap-1"><Star className="w-3 h-3" /> Mais popular</Badge>}
                      {mostrarDesligada(grupo, plano) && <Badge variant="outline" className="text-[10px]">Venda desligada</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plano.subtitulo}</p>
                    <p className="text-sm mt-1">
                      <span className="font-medium">{formatarPreco(plano)}</span>
                      {plano.preco_detalhe && <span className="text-muted-foreground"> · {plano.preco_detalhe}</span>}
                      <span className="text-muted-foreground"> · {grupo.labelCobranca}: R$ {(plano.valor_cobranca || 0).toFixed(2)}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPlanoEdicao(plano)}><Pencil className="w-4 h-4 mr-1.5" /> Editar</Button>
                </div>
              ))
            )}
          </div>
        );
      })}

      {planoEdicao && (
        <ConfiguracaoPlanoDialog
          open={!!planoEdicao}
          onOpenChange={(v) => !v && setPlanoEdicao(null)}
          plano={planoEdicao}
          onSaved={refetch}
        />
      )}
    </div>
  );
}