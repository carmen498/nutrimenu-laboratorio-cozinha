// Monta o texto de compartilhamento da Ficha Técnica (Web Share API / WhatsApp).
// Usa SOMENTE os valores BASE já calculados por montarFichaTecnica.
import { passosParaTexto } from "@/lib/formatarModoPreparo";
import { formatarStatusRendimento } from "@/lib/rendimentoReceita";

const formatCurrency = (v) => `R$ ${(v || 0).toFixed(2).replace(".", ",")}`;
const formatKg = (g) => `${((g || 0) / 1000).toFixed(2).replace(".", ",")} kg`;
const formatFator = (v) => v == null ? "—" : Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });

export function montarTextoCompartilhamentoFicha({ receita, ficha, passos }) {
  let text = `🍽 ${receita.nome}\n`;
  text += `FICHA TÉCNICA\n\n`;
  text += `PC Recomendado: ${ficha.pcRecomendado} g/porção\n`;
  text += `Pré-preparo líquido: ${formatKg(ficha.pesoPrePreparo)}\n`;
  text += `PB de compra: ${formatKg(ficha.pesoBruto)}\n`;
  text += `Rendimento (PDP): ${formatKg(ficha.rendimentoTotal)}${ficha.rendimentoEstimado ? " (estimado)" : ""} · ${ficha.nPorcoes} porções\n`;
  text += `Fator de rendimento: ${formatFator(ficha.fatorRendimento)} · Status: ${formatarStatusRendimento(ficha.rendimentoStatus)}\n`;
  if (ficha.perda && ficha.perda.tipo !== "estavel") {
    text += `${ficha.perda.tipo === "ganho" ? "Ganho" : "Perda"}: ${ficha.perda.pct.toFixed(1).replace(".", ",")}%\n`;
  }
  text += `Custo Total: ${formatCurrency(ficha.custoTotal)}\n`;
  text += `Custo por Porção: ${formatCurrency(ficha.custoPorPorcao)}\n\n`;

  text += `INGREDIENTES:\n`;
  ficha.itensFichaAgrupada.forEach((item) => {
    if (item.isGrupo) {
      text += `\n${item.titulo_grupo}:\n`;
      return;
    }
    const nome = item.isSubreceita ? item.subreceita_nome : (item.ing?.nome || item.ingrediente_nome);
    if (!nome) return;
    text += `• ${nome} — ${formatKg(item.qtdNova)}\n`;
  });

  if (passos.length > 0 || ficha.temSubreceitas) {
    text += `\nMODO DE PREPARO:\n`;
    if (ficha.temSubreceitas) {
      ficha.blocosCompostos.forEach((bloco) => {
        text += `\n${bloco.tipo === "subreceita" ? `— ${bloco.nome} —` : "Montagem:"}\n`;
        if (bloco.passos.length > 0) text += passosParaTexto(bloco.passos) + "\n";
      });
    } else {
      text += passosParaTexto(passos) + "\n";
    }
  }

  return text;
}
