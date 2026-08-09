import { useState } from "react";
import { toast } from "sonner";
import BuscaReceitaDialog from "@/components/receita/BuscaReceitaDialog";
import { explodirReceitaParaCarrinho } from "@/lib/explodirReceitaCarrinho";
import { base44 } from "@/api/base44Client";

// Explode os ingredientes de uma receita (peso BRUTO) em itens do Carrinho,
// mesclando (somando) com itens já existentes para o mesmo ingrediente.
export default function AdicionarReceitaCarrinhoDialog({ open, onClose, ingMap, itensCarrinho, onAdded }) {
  const [processando, setProcessando] = useState(false);

  const handleSelect = async (receita) => {
    setProcessando(true);
    try {
      const totais = await explodirReceitaParaCarrinho(receita, ingMap);
      const existentesPorIngrediente = {};
      itensCarrinho.forEach((it) => { existentesPorIngrediente[it.ingrediente_id] = it; });

      for (const [ingredienteId, { gramas, nome }] of Object.entries(totais)) {
        const ing = ingMap[ingredienteId];
        const pesoEmbalagem = ing?.peso_embalagem_g || gramas || 1;
        const embalagens = gramas / pesoEmbalagem;
        const existente = existentesPorIngrediente[ingredienteId];
        if (existente) {
          await base44.entities.CarrinhoItem.update(existente.id, {
            quantidade_embalagens: (existente.quantidade_embalagens || 0) + embalagens,
          });
        } else {
          await base44.entities.CarrinhoItem.create({
            ingrediente_id: ingredienteId,
            ingrediente_nome: nome,
            quantidade_embalagens: embalagens,
            comprado: false,
          });
        }
      }
      toast.success(`Ingredientes de "${receita.nome}" adicionados ao carrinho`);
      onAdded();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar ingredientes da receita");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <BuscaReceitaDialog
      open={open}
      onClose={() => !processando && onClose()}
      onSelect={handleSelect}
      title="Adicionar de uma receita"
    />
  );
}