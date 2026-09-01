import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { salvarPrecoPersonalizado } from "@/lib/precoIngredienteCliente";
import { salvarDadosComerciaisIngrediente } from "@/lib/preferenciaIngredienteUsuario";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";
import { toSentenceCaseName } from "@/lib/textCase";

// Hook compartilhado de salvamento de Ingrediente.
// Segurança/arquitetura:
// - Ingrediente = catálogo mestre técnico, alterável somente por administradores.
// - IngredienteUsuario = dados comerciais pessoais (compra, embalagem, fornecedor, preço).
// - PrecoIngredienteCliente permanece espelhado temporariamente por compatibilidade
//   com telas de custo que ainda usam a entidade legada.
export function useSalvarIngrediente(onSaved, { isAdmin = true, userId = null } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (/** @type {any} */ rawData) => {
      const { _novos_sinonimos, ...dadosRecebidos } = rawData;
      const data = {
        ...dadosRecebidos,
        ...(dadosRecebidos.nome !== undefined ? { nome: toSentenceCaseName(dadosRecebidos.nome) } : {}),
      };
      const preco_por_g = data.peso_embalagem_g > 0
        ? data.preco_embalagem_rs / data.peso_embalagem_g
        : 0;

      if (!isAdmin) {
        if (!data.id) {
          throw new Error("Somente administradores podem cadastrar novos ingredientes.");
        }
        if (!userId) {
          throw new Error("Usuário não identificado para salvar os dados de compra.");
        }

        await salvarDadosComerciaisIngrediente({
          ingredienteId: data.id,
          userId,
          unidadeCompra: data.unidade_compra,
          pesoEmbalagemG: data.peso_embalagem_g,
          precoEmbalagemRs: data.preco_embalagem_rs,
          fornecedor: data.fornecedor,
          estadoUsuario: data.estado_usuario,
          fontePreco: "Manual",
        });

        // Compatibilidade Fase 3: mantém o preço pessoal disponível para módulos
        // ainda não migrados de PrecoIngredienteCliente para IngredienteUsuario.
        await salvarPrecoPersonalizado({
          ingredienteId: data.id,
          userId,
          precoPorGRs: preco_por_g,
        });

        return {
          id: data.id,
          unidade_compra: data.unidade_compra,
          peso_embalagem_g: data.peso_embalagem_g,
          preco_embalagem_rs: data.preco_embalagem_rs,
          preco_por_g_rs: preco_por_g,
          fornecedor: data.fornecedor,
          estado_usuario: data.estado_usuario,
          _dados_comerciais_pessoais: true,
        };
      }

      const payload = { ...data, preco_por_g_rs: preco_por_g };

      if (data.id) {
        const atualMestre = await base44.entities.Ingrediente.get(data.id);
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
        delete rest._preferencia_ingrediente_id;
        delete rest._dados_comerciais_pessoais;
        delete rest._preco_personalizado;
        const atualizado = await base44.entities.Ingrediente.update(id, rest);
        const custoMudou = ["preco_embalagem_rs", "peso_embalagem_g", "preco_por_g_rs", "fator_correcao"]
          .some((campo) => Number(atualMestre?.[campo] || 0) !== Number(rest?.[campo] || 0));
        if (custoMudou) {
          await invalidarCustosDependentesSeguro({
            ingredienteIds: [id],
            motivo: "ingrediente_mestre_preco_ou_fc",
            origem: "cadastro_ingrediente",
          });
        }
        return atualizado;
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
      qc.invalidateQueries({ queryKey: ["preferencias-ingredientes"] });
      if (result?.id) qc.invalidateQueries({ queryKey: ["ingrediente", result.id] });
      toast.success(result?._dados_comerciais_pessoais ? "Dados de compra salvos!" : "Ingrediente salvo!");
      onSaved?.(result);
    },
  });
}
