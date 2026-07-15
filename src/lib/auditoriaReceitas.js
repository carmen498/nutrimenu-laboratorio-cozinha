// Auditoria de Receitas — relatório de sanidade, SOMENTE LEITURA.
// Nenhuma função aqui grava dados; apenas deriva uma lista de problemas por receita.

import { normalizarNome } from "@/lib/normalizarNome";

export const TIPOS_PROBLEMA = [
  { tipo: "vazia", label: "Vazia" },
  { tipo: "quase_vazia", label: "Quase vazia" },
  { tipo: "sem_rendimento", label: "Sem rendimento" },
  { tipo: "sem_pc", label: "Sem PC" },
  { tipo: "custo_zero", label: "Custo zero" },
  { tipo: "ingrediente_quebrado", label: "Ingrediente quebrado" },
  { tipo: "nome_ingredientes", label: "Nome × ingredientes" },
  { tipo: "duplicata", label: "Duplicata de nome" },
];

const PALAVRAS_CHAVE = [
  "BACALHAU", "CAMARAO", "FRANGO", "SALMAO", "PERU", "PALMITO", "BROCOLIS",
  "ESPINAFRE", "MACA", "LIMAO", "CHOCOLATE", "QUEIJO", "LENTILHA", "MILHO",
  "BATATA", "ATUM", "MORANGO", "MARACUJA", "GOIABA", "COCO",
];

function normUpper(s) {
  return normalizarNome(s).toUpperCase();
}

export function auditarReceitas(receitas, itens, ingredientes, sinonimos) {
  const itensPorReceita = {};
  itens.forEach((i) => {
    if (!itensPorReceita[i.receita_id]) itensPorReceita[i.receita_id] = [];
    itensPorReceita[i.receita_id].push(i);
  });

  const ingredientesMap = {};
  ingredientes.forEach((ing) => { ingredientesMap[ing.id] = ing; });

  const sinonimosPorIngrediente = {};
  sinonimos.forEach((s) => {
    if (!sinonimosPorIngrediente[s.ingrediente_id]) sinonimosPorIngrediente[s.ingrediente_id] = [];
    sinonimosPorIngrediente[s.ingrediente_id].push(s.sinonimo);
  });

  // Pré-computa grupos de nomes duplicados (#8)
  const gruposPorNomeNorm = {};
  receitas.forEach((r) => {
    const key = normalizarNome(r.nome);
    if (!key) return;
    if (!gruposPorNomeNorm[key]) gruposPorNomeNorm[key] = [];
    gruposPorNomeNorm[key].push(r);
  });

  const resultado = [];

  for (const r of receitas) {
    const problemas = [];
    const todosItens = itensPorReceita[r.id] || [];
    const itensIngrediente = todosItens.filter((i) => (i.tipo || "ingrediente") === "ingrediente");
    const nIngredientes = itensIngrediente.length;

    const porcoesBase = Number(r.porcoes_base) || 1;
    const somaBase = itensIngrediente.reduce((s, i) => s + (Number(i.quantidade_por_porcao) || 0), 0);
    const somaPesos = somaBase * porcoesBase;

    // Custo calculado ao vivo a partir do preço atual dos ingredientes — o campo
    // custo_total persistido na receita nem sempre é recalculado, gerando falsos positivos.
    const custoIngredientes = itensIngrediente.reduce((s, i) => {
      const ing = i.ingrediente_id ? ingredientesMap[i.ingrediente_id] : null;
      const qtd = (Number(i.quantidade_por_porcao) || 0) * porcoesBase;
      return s + qtd * (ing?.preco_por_g_rs || 0);
    }, 0);
    const custoTotalLive = custoIngredientes + (Number(r.custo_insumos) || 0);

    // 1. VAZIA
    const vazia = nIngredientes === 0;
    if (vazia) problemas.push({ tipo: "vazia", label: "Vazia: zero ingredientes vinculados" });

    // 2. QUASE VAZIA
    if (!vazia && (nIngredientes <= 2 || somaPesos < 100)) {
      problemas.push({ tipo: "quase_vazia", label: `Quase vazia: ${nIngredientes} ingrediente(s), ${somaPesos.toFixed(0)}g` });
    }

    // 3. SEM RENDIMENTO
    if (!(Number(r.rendimento_total) > 0)) {
      problemas.push({ tipo: "sem_rendimento", label: "Sem rendimento_total" });
    }

    // 4. SEM PC
    if (!(Number(r.per_capita_g) > 0)) {
      problemas.push({ tipo: "sem_pc", label: "Sem per_capita_g" });
    }

    // 5. CUSTO ZERO
    if (!(custoTotalLive > 0) && nIngredientes > 0) {
      problemas.push({ tipo: "custo_zero", label: "Custo total zero com ingredientes presentes" });
    }

    // 6. INGREDIENTE QUEBRADO
    const quebrados = itensIngrediente.filter((i) => {
      const semQtd = !(Number(i.quantidade_por_porcao) > 0);
      const semIngResolvido = !i.ingrediente_id || !ingredientesMap[i.ingrediente_id];
      return semQtd || semIngResolvido;
    });
    if (quebrados.length > 0) {
      problemas.push({ tipo: "ingrediente_quebrado", label: `${quebrados.length} linha(s) com ingrediente não resolvido ou quantidade zerada` });
    }

    // 7. NOME × INGREDIENTES (heurística)
    const nomeNorm = normUpper(r.nome);
    const nomesIngredientesNorm = itensIngrediente.map((i) => {
      const ing = i.ingrediente_id ? ingredientesMap[i.ingrediente_id] : null;
      const nomes = [i.ingrediente_nome, ing?.nome].filter(Boolean);
      const sins = i.ingrediente_id ? (sinonimosPorIngrediente[i.ingrediente_id] || []) : [];
      return [...nomes, ...sins].map(normUpper);
    }).flat();

    for (const palavra of PALAVRAS_CHAVE) {
      if (!nomeNorm.includes(palavra)) continue;
      const contida = nomesIngredientesNorm.some((n) => n.includes(palavra));
      if (!contida) {
        problemas.push({ tipo: "nome_ingredientes", label: `nome cita ${palavra}; ingredientes não contêm ${palavra}` });
      }
    }

    // 8. DUPLICATA DE NOME
    const grupo = gruposPorNomeNorm[normalizarNome(r.nome)] || [];
    if (grupo.length > 1) {
      const outras = grupo.filter((g) => g.id !== r.id).map((g) => g.nome).join(", ");
      problemas.push({ tipo: "duplicata", label: `Nome duplicado (com: ${outras})` });
    }

    if (problemas.length > 0) {
      resultado.push({
        id: r.id,
        nome: r.nome,
        categoria: (r.categorias || []).join(", "),
        problemas,
        nIngredientes,
        rendimento: Number(r.rendimento_total) || 0,
        custoTotal: custoTotalLive,
      });
    }
  }

  return resultado.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}