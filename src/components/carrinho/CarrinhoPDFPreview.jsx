import { formatEmbalagem } from "@/components/carrinho/CarrinhoItemRow";

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;

// Pré-visualização da Lista de Compras, renderizada inline na tela do Carrinho.
// É o mesmo elemento usado para gerar o PDF (via printarElementoIsolado),
// seguindo o padrão visual das fichas (cabeçalho timbrado verde + Playfair).
export default function CarrinhoPDFPreview({ grupos, ingMap, getQtd, total }) {
  const dataEmissao = new Date().toLocaleDateString("pt-BR");

  return (
    <div id="carrinho-pdf-preview" className="bg-white border rounded-xl overflow-hidden print:border-0 print:rounded-none">
      <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm">Laboratório de Cozinha · Receitas que se Multiplicam · por Carmen Reinstein</p>
        <p className="font-display text-sm text-right">LISTA DE COMPRAS · emitida em {dataEmissao}</p>
      </div>

      <div className="p-6 space-y-5">
        <h2 className="font-display text-2xl font-bold">Lista de Compras</h2>

        {grupos.map((g) => (
          <div key={g.categoria}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              {g.categoria}
            </p>
            <div className="space-y-1">
              {g.itens.map((item) => {
                const ing = ingMap[item.ingrediente_id];
                const nome = ing?.nome || item.ingrediente_nome || "Ingrediente";
                const qtd = getQtd(item);
                const custo = qtd * (ing?.preco_embalagem_rs || 0);
                const embalagem = formatEmbalagem(ing?.peso_embalagem_g, ing?.unidade_compra);
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between text-sm py-1 border-b border-border/50 ${item.comprado ? "line-through text-muted-foreground" : ""}`}
                  >
                    <span className="flex-1">{nome}</span>
                    <span className="w-28 text-right tabular-nums">{qtd} × {embalagem}</span>
                    <span className="w-20 text-right font-medium tabular-nums">{formatCurrency(custo)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-3 border-t-2 border-primary font-bold text-base">
          <span>Total da compra</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>

        <p className="text-[11px] text-muted-foreground text-center pt-4 border-t border-border">
          Laboratório de Cozinha · Gastronomia Planejada · {dataEmissao}
        </p>
      </div>
    </div>
  );
}