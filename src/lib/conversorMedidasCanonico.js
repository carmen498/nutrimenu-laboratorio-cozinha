// Conversor canônico de medidas caseiras — Fase 7.
// Mantém as funções legadas de IA disponíveis pelo módulo antigo, mas as
// conversões de runtime usam peso_g/quantidade_utensilio como fonte principal.
import { getPesoPorMedidaG } from "@/lib/medidaCaseiraModel";
export { converterMedida, gerarTabelaPrompt } from "@/lib/conversorMedidas";

const FRACOES = [
  { val: 0, str: "" },
  { val: 0.25, str: "¼" },
  { val: 1 / 3, str: "⅓" },
  { val: 0.5, str: "½" },
  { val: 2 / 3, str: "⅔" },
  { val: 0.75, str: "¾" },
];
const EPS = 0.01;

function findClosestFraction(n, maxInt = 20) {
  let closest = 0;
  let minDiff = Math.abs(n);
  for (let i = 0; i <= maxInt; i++) {
    for (const f of FRACOES) {
      const v = i + f.val;
      const diff = Math.abs(n - v);
      if (diff < minDiff - EPS) {
        minDiff = diff;
        closest = v;
      }
    }
  }
  return closest;
}

function formatFracao(n) {
  const intPart = Math.floor(n + EPS);
  const fracPart = n - intPart;
  let closestFrac = FRACOES[0];
  let minDiff = Math.abs(fracPart);
  for (const f of FRACOES) {
    if (f.val === 0) continue;
    const diff = Math.abs(fracPart - f.val);
    if (diff < minDiff - EPS) {
      minDiff = diff;
      closestFrac = f;
    }
  }
  if (intPart === 0) return closestFrac.str || "0";
  if (closestFrac.val === 0 || minDiff > EPS) return String(intPart);
  return `${intPart}${closestFrac.str}`;
}

function formatGramas(g) {
  if (g >= 1000) return `${(g / 1000).toFixed(2).replace(".", ",")}kg`;
  return Number.isInteger(g) ? `${g}g` : `${g.toFixed(1).replace(".", ",")}g`;
}

export function converterGramasParaMedida(quantidadeG, medida, utensilio) {
  if (!medida || medida.so_gramas) return { texto: null, regra: 2 };
  const refG = getPesoPorMedidaG(medida);
  if (!refG || !quantidadeG || quantidadeG <= 0) return { texto: null, regra: 2 };

  const n = quantidadeG / refG;
  const nArredondado = findClosestFraction(n);
  const gRecalculado = nArredondado * refG;
  const desvio = Math.abs(gRecalculado - quantidadeG) / quantidadeG;
  if (desvio > 0.1) return { texto: null, regra: 2 };

  const fracText = formatFracao(nArredondado);
  const isSingular = nArredondado <= 1 + EPS;
  const descUtensilio = isSingular
    ? utensilio?.descricao_singular || utensilio?.nome || "medida"
    : utensilio?.descricao_plural || utensilio?.descricao_singular || utensilio?.nome || "medidas";

  return {
    texto: `${fracText} ${descUtensilio} (${formatGramas(gRecalculado)})`,
    regra: 1,
    n: nArredondado,
    gRecalculado,
    desvio,
  };
}

export function converterMedidaParaGramas(quantidadeN, medida) {
  if (!medida || !quantidadeN || quantidadeN <= 0) return null;
  const refG = getPesoPorMedidaG(medida);
  return refG ? quantidadeN * refG : null;
}

export default converterGramasParaMedida;
