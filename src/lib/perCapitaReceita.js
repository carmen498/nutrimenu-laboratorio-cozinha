import { sugerirPerCapita } from "@/lib/perCapitaData";

const positivo = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const quaseIgual = (a, b) => {
  const aa = positivo(a);
  const bb = positivo(b);
  return aa > 0 && bb > 0 && Math.abs(aa - bb) / Math.max(aa, bb) <= 0.001;
};

export function resolverPerCapitaReceita(receita, perCapitaUsuario = 0) {
  const personalizado = positivo(perCapitaUsuario);
  const cadastrado = positivo(receita?.per_capita_g);
  const legado = positivo(receita?.rendimento_total);
  const canonico = positivo(receita?.peso_pos_preparo_total);
  const legadoSuspeito = !personalizado
    && !canonico
    && legado > 0
    && cadastrado > 0
    && quaseIgual(legado, cadastrado)
    && (
      (!receita?.rendimento_status && !receita?.rendimento_origem)
      || (receita?.rendimento_status === "a_validar" && receita?.rendimento_origem === "legado")
    );
  const categoria = (receita?.categorias || [])[0] || receita?.categoria || "";
  const sugerido = positivo(sugerirPerCapita(receita?.nome, categoria));
  const valorCalculo = personalizado || (legadoSuspeito ? 0 : cadastrado);

  return {
    valorCalculo,
    valorExibicao: valorCalculo || sugerido,
    sugerido,
    origem: personalizado ? "personalizado" : (valorCalculo ? "cadastrado" : "sugerido"),
    status: legadoSuspeito ? "a_validar" : (valorCalculo ? "valido" : "pendente"),
    legadoSuspeito,
  };
}