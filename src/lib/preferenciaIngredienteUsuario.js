import { base44 } from "@/api/base44Client";

// Dados específicos do usuário nunca devem alterar o cadastro mestre de Ingrediente.
// Na Fase 3, IngredienteUsuario passa a concentrar favorito + dados comerciais pessoais.
const CAMPOS_COMERCIAIS = [
  "unidade_compra",
  "peso_embalagem_g",
  "preco_embalagem_rs",
  "preco_por_g_rs",
  "fornecedor",
  "estado_usuario",
  "fonte_preco",
  "preco_atualizado_em",
  "variacao_percentual",
  "historico_precos",
];

const temCampo = (obj, campo) => Object.prototype.hasOwnProperty.call(obj || {}, campo)
  && obj[campo] !== undefined;

export async function buscarPreferenciasIngredientes(userId) {
  if (!userId) return {};

  const registros = await base44.entities.IngredienteUsuario.filter(
    { user_id: userId },
    "-updated_date",
    500
  );

  const map = {};
  for (const registro of registros || []) {
    if (!registro?.ingrediente_id || map[registro.ingrediente_id]) continue;
    map[registro.ingrediente_id] = registro;
  }
  return map;
}

export function aplicarPreferenciasIngredientes(
  ingredientes,
  preferencias = {},
  { usarFavoritoLegado = false } = {}
) {
  return (ingredientes || []).map((ingrediente) => {
    const preferencia = preferencias?.[ingrediente.id];
    const favorito = preferencia
      ? !!preferencia.favorito
      : (usarFavoritoLegado ? !!ingrediente.favorito : false);

    const comerciais = {};
    if (preferencia) {
      for (const campo of CAMPOS_COMERCIAIS) {
        if (temCampo(preferencia, campo)) comerciais[campo] = preferencia[campo];
      }
    }

    return {
      ...ingrediente,
      ...comerciais,
      favorito,
      _preferencia_ingrediente_id: preferencia?.id || null,
      _dados_comerciais_pessoais: Object.keys(comerciais).length > 0,
    };
  });
}

async function buscarRegistroAtual(ingredienteId, userId) {
  const existentes = await base44.entities.IngredienteUsuario.filter(
    { ingrediente_id: ingredienteId, user_id: userId },
    "-updated_date",
    5
  );
  return existentes?.[0] || null;
}

export async function salvarFavoritoIngrediente({ ingredienteId, userId, favorito }) {
  if (!ingredienteId) throw new Error("Ingrediente não identificado.");
  if (!userId) throw new Error("Usuário não identificado.");

  const atual = await buscarRegistroAtual(ingredienteId, userId);
  if (atual) {
    return base44.entities.IngredienteUsuario.update(atual.id, { favorito: !!favorito });
  }

  return base44.entities.IngredienteUsuario.create({
    ingrediente_id: ingredienteId,
    user_id: userId,
    favorito: !!favorito,
  });
}

export async function salvarDadosComerciaisIngrediente({
  ingredienteId,
  userId,
  unidadeCompra,
  pesoEmbalagemG,
  precoEmbalagemRs,
  fornecedor = "",
  estadoUsuario = "",
  fontePreco = "Manual",
}) {
  if (!ingredienteId) throw new Error("Ingrediente não identificado.");
  if (!userId) throw new Error("Usuário não identificado.");

  const atual = await buscarRegistroAtual(ingredienteId, userId);
  const peso = Number(pesoEmbalagemG) || 0;
  const precoEmbalagem = Number(precoEmbalagemRs) || 0;
  const precoPorG = peso > 0 ? precoEmbalagem / peso : 0;

  const precoAlterado = !atual
    || Number(atual.preco_embalagem_rs || 0) !== precoEmbalagem
    || Number(atual.peso_embalagem_g || 0) !== peso;

  const payload = {
    unidade_compra: unidadeCompra || "",
    peso_embalagem_g: peso,
    preco_embalagem_rs: precoEmbalagem,
    preco_por_g_rs: precoPorG,
    fornecedor: fornecedor || "",
    estado_usuario: estadoUsuario || "",
  };

  if (precoAlterado) {
    const agora = new Date().toISOString();
    const precoAnteriorPorKg = atual?.preco_por_g_rs > 0
      ? Number(atual.preco_por_g_rs) * 1000
      : 0;
    const precoNovoPorKg = precoPorG * 1000;
    const variacao = precoAnteriorPorKg > 0
      ? parseFloat((((precoNovoPorKg - precoAnteriorPorKg) / precoAnteriorPorKg) * 100).toFixed(1))
      : 0;

    const historico = [...(atual?.historico_precos || [])];
    historico.unshift({
      data: agora,
      preco_por_kg: parseFloat(precoNovoPorKg.toFixed(2)),
      variacao_percentual: variacao,
      fonte: fontePreco || "Manual",
      fornecedor: fornecedor || "",
    });

    payload.fonte_preco = fontePreco || "Manual";
    payload.preco_atualizado_em = agora;
    payload.variacao_percentual = variacao;
    payload.historico_precos = historico;
  }

  if (atual) {
    return base44.entities.IngredienteUsuario.update(atual.id, payload);
  }

  return base44.entities.IngredienteUsuario.create({
    ingrediente_id: ingredienteId,
    user_id: userId,
    favorito: false,
    ...payload,
  });
}
