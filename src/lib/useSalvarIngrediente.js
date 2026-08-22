import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { salvarPrecoPersonalizado } from "@/lib/precoIngredienteCliente";

// Hook compartilhado de salvamento de Ingrediente.
// Segurança: o catálogo Ingrediente é global e somente administradores podem
// criar/alterar sua estrutura. Usuários comuns podem alterar exclusivamente o
// próprio preço, persistido em PrecoIngredienteCliente.
export function useSalvarIngrediente(onSaved, { isAdmin = true, userId = null } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rawData) => {
      const { _novos_sinonimos, ...data } = rawData;
      const preco_por_g = data.peso_embalagem_g > 0
        ? data.preco_embalagem_rs / data.peso_embalagem_g
        : 0;

      if (!isAdmin) {
        if (!data.id) {
          throw new Error("Somente administradores podem cadastrar novos ingredientes.");
        }
        if (!userId) {
          throw new Error("Usuário não identificado para salvar o preço pessoal.");
        }

        await salvarPrecoPersonalizado({
          ingredienteId: data.id,
          userId,
          precoPorGRs: preco_por_g,
        });

        return { id: data.id, preco_por_g_rs: preco_por_g, _preco_pessoal: true };
      }

      const payload = { ...data, preco_por_g_rs: preco_por_g };

      if (data.id) {
        const { id, created_date, updated_date, created_by_id, ...rest } = payload;
        const precoAlterado = data.preco_embalagem_rs !== data._preco_anterior || data.peso_embalagem_g !== data._peso_anterior;

        if (precoAlterado) {
          const precoAnteriorPorKg = (data._preco_anterior && data._peso_anterior > 0)
            ? parseFloat(((data._preco_anterior / data._peso_anterior) * 1000).toFixed(2))
            : 0;
          const precoNovaPorKg = preco_por_g * 1000;
          const variacao = precoAnteriorPorKg > 0
            ? parseFloat((((precoNovaPorKg - precoAnteriorPorKg) / precoAnteriorPorKg) * 100).toFixed(1))
            : 0;
          const historico = [...(data.historico_precos || [])];
          historico.unshift({
            data: new Date().toISOString(),
            preco_por_kg: parseFloat(precoNovaPorKg.toFixed(2)),
            variacao_percentual: variacao,
            fonte: data.fonte_preco || "Manual",
            fornecedor: data.fornecedor || "",
          });
          rest.historico_precos = historico;
          rest.preco_atualizado_em = new Date().toISOString();
          rest.fonte_preco = rest.fonte_preco || "Manual";
          rest.variacao_percentual = variacao;
        }

        delete rest._preco_anterior;
        delete rest._peso_anterior;
        return base44.entities.Ingrediente.update(id, rest);
      }

      if (preco_por_g > 0) {
        payload.preco_atualizado_em = new Date().toISOString();
        payload.fonte_preco = "Manual";
      }
      const existing = await base44.entities.Ingrediente.filter({ nome: data.nome });
      if (existing.length > 0) {
        payload.revisar = true;
        toast.warning("Ingrediente duplicado — marcado para revisão");
      }
      const created = await base44.entities.Ingrediente.create(payload);
      if (_novos_sinonimos?.length) {
        for (const sin of _novos_sinonimos) {
          await base44.entities.SinonimosIngredientes.create({ ingrediente_id: created.id, sinonimo: sin });
        }
      }
      return created;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      qc.invalidateQueries({ queryKey: ["sinonimos"] });
      qc.invalidateQueries({ queryKey: ["precos-personalizados"] });
      if (result?.id) qc.invalidateQueries({ queryKey: ["ingrediente", result.id] });
      toast.success(result?._preco_pessoal ? "Preço pessoal salvo!" : "Ingrediente salvo!");
      onSaved?.(result);
    },
  });
}