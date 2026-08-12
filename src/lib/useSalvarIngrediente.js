import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { salvarPrecoPersonalizado } from "@/lib/precoIngredienteCliente";

// Hook compartilhado de salvamento de Ingrediente — usado pela listagem (Ingredientes.jsx)
// e pela ficha (IngredienteAberto.jsx), para manter a MESMA lógica de custo e histórico.
//
// Não-admins nunca alteram o preço do cadastro compartilhado: quando o preço muda,
// a gravação vira um registro pessoal em PrecoIngredienteCliente — de forma
// transparente, sem erro de permissão visível. Os demais campos (nome, categoria,
// unidade, fator de correção...) continuam sendo gravados no cadastro compartilhado
// normalmente, para todos os usuários.
export function useSalvarIngrediente(onSaved, { isAdmin = true, userId = null } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rawData) => {
      const { _novos_sinonimos, ...data } = rawData;
      const preco_por_g = data.peso_embalagem_g > 0
        ? data.preco_embalagem_rs / data.peso_embalagem_g
        : 0;
      const payload = { ...data, preco_por_g_rs: preco_por_g };

      if (data.id) {
        const { id, created_date, updated_date, created_by_id, ...rest } = payload;
        const precoAlterado = data.preco_embalagem_rs !== data._preco_anterior || data.peso_embalagem_g !== data._peso_anterior;

        if (!isAdmin) {
          const {
            preco_embalagem_rs, peso_embalagem_g, preco_por_g_rs,
            historico_precos, preco_atualizado_em, fonte_preco, variacao_percentual,
            _preco_anterior, _peso_anterior,
            ...compartilhado
          } = rest;
          await base44.entities.Ingrediente.update(id, compartilhado);
          if (precoAlterado && userId) {
            await salvarPrecoPersonalizado({ ingredienteId: id, userId, precoPorGRs: preco_por_g });
          }
          return { id, ...compartilhado };
        }

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
      toast.success("Ingrediente salvo!");
      onSaved?.(result);
    },
  });
}