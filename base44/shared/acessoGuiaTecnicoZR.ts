// Direito de acesso ao Guia Técnico ZR (livro hospedado fora desta plataforma).
// As faixas ACUMULAM: devolvemos a lista do que foi comprado e está vigente.
// "acesso-livre" nunca aparece aqui — é o piso de todos, aplicado pelo próprio Guia.

const ORDEM_FAIXAS = ["tin", "full", "arquitetura-do-rotulo", "teste-lancamento"];

function dataISO(valor: any): string | null {
  const ms = Date.parse(valor || "");
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : null;
}

function vigente(registro: any, agora: Date): boolean {
  if (registro?.status !== "ativo") return false;
  if (registro.inicio_em && Date.parse(registro.inicio_em) > agora.getTime()) return false;
  if (registro.vitalicio) return true;
  if (!registro.fim_em) return true;
  const fim = Date.parse(registro.fim_em);
  return Number.isFinite(fim) && fim >= agora.getTime();
}

// Mais de um registro pode existir para a mesma faixa (renovações, cortesias).
// Consolidamos no mais favorável: vitalício vence tudo; senão, o vencimento mais distante.
function maisFavoravel(a: any, b: any) {
  if (a.vitalicio) return a;
  if (b.vitalicio) return b;
  if (!a.vence_em || !b.vence_em) return a.vence_em ? b : a;
  return b.vence_em > a.vence_em ? b : a;
}

export async function faixasGuiaTecnicoZR(base44: any, userId: string, agora = new Date()) {
  const [registros, testesLancamento] = await Promise.all([
    base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({ user_id: userId }),
    base44.asServiceRole.entities.TesteLancamentoGuiaZR.filter({ user_id: userId }),
  ]);

  const porFaixa = new Map<string, any>();
  for (const registro of registros || []) {
    if (!vigente(registro, agora)) continue;
    const item = {
      faixa: registro.faixa,
      vence_em: registro.vitalicio ? null : dataISO(registro.fim_em),
      vitalicio: !!registro.vitalicio,
    };
    const atual = porFaixa.get(item.faixa);
    porFaixa.set(item.faixa, atual ? maisFavoravel(atual, item) : item);
  }

  for (const teste of testesLancamento || []) {
    if (!vigente(teste, agora)) continue;
    const fim = Date.parse(teste.fim_em || "");
    if (!Number.isFinite(fim)) continue;
    porFaixa.set("teste-lancamento", {
      faixa: "teste-lancamento",
      vence_em: new Date(fim).toISOString(),
      vitalicio: false,
    });
  }

  return ORDEM_FAIXAS.filter((f) => porFaixa.has(f)).map((f) => porFaixa.get(f));
}