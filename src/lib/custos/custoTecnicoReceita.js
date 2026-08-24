// Adaptador do Laboratório de Custos para a fonte técnica canônica da Cozinha.
// Nenhuma fórmula de ingrediente é repetida aqui.
import { calcularCustoReceitaCanonico } from "@/lib/custoReceita";

export function calcularCustoTecnicoReceitaParaCustos({
  receita,
  ingredientesReceita = [],
  ingredienteMap = {},
  insumosReceita = [],
  esquecidos = [],
  fator = 1,
  unidadesFinais = 0,
  numeroLotes = 1,
} = {}) {
  const canonico = calcularCustoReceitaCanonico({
    receita,
    ingredientesReceita,
    ingredienteMap,
    insumosReceita,
    esquecidos,
    fator,
    unidadesFinais,
    numeroLotes,
  });

  return {
    modeloTecnicoVersao: canonico.modeloVersao,
    fator: canonico.fator,
    rendimento: canonico.rendimento,
    porcoesEfetivas: canonico.porcoesEfetivas,
    custoIngredientes: canonico.custoIngredientes,
    custoInsumosTecnicos: canonico.custoInsumos,
    custoEsquecidos: canonico.custoEsquecidos,
    custoTecnicoTotal: canonico.custoTotal,
    custoTecnicoPorPorcao: canonico.custoPorPorcao,
    completo: canonico.completo,
    itensSemPreco: canonico.itensSemPreco,
    insumosSemPreco: canonico.insumosSemPreco,
    referenciasAusentes: canonico.referenciasAusentes,
    problemas: canonico.problemas,
  };
}
