type OpcaoParcelamento = {
  installments: number;
  installment_amount: number;
  installment_rate: number;
  total_amount: number;
};

export function opcaoAVista(valor: number): OpcaoParcelamento {
  return {
    installments: 1,
    installment_amount: Number(valor.toFixed(2)),
    installment_rate: 0,
    total_amount: Number(valor.toFixed(2)),
  };
}

export async function consultarParcelasMercadoPago({
  bin,
  valor,
  accessToken,
}: {
  bin: string;
  valor: number;
  accessToken: string;
}): Promise<OpcaoParcelamento[]> {
  if (!/^\d{6}$/.test(bin)) throw new Error("BIN inválido");
  if (!(valor > 0)) throw new Error("Valor inválido");
  if (!accessToken) throw new Error("Credencial do Mercado Pago ausente");

  const url = new URL("https://api.mercadopago.com/v1/payment_methods/installments");
  url.searchParams.set("bin", bin);
  url.searchParams.set("amount", valor.toFixed(2));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Mercado Pago HTTP ${response.status}`);

  const data = await response.json();
  const opcoes = (Array.isArray(data) ? data : [])
    .flatMap((metodo: any) => Array.isArray(metodo?.payer_costs) ? metodo.payer_costs : [])
    .map((opcao: any) => ({
      installments: Number(opcao.installments),
      installment_amount: Number(opcao.installment_amount),
      installment_rate: Number(opcao.installment_rate || 0),
      total_amount: Number(opcao.total_amount),
    }))
    .filter((opcao: OpcaoParcelamento) =>
      Number.isInteger(opcao.installments) &&
      opcao.installments >= 1 &&
      Number.isFinite(opcao.installment_amount) &&
      (opcao.installment_rate <= 0 || Number.isFinite(opcao.total_amount))
    )
    .sort((a: OpcaoParcelamento, b: OpcaoParcelamento) => {
      const grupoA = a.installment_rate > 0 ? 1 : 0;
      const grupoB = b.installment_rate > 0 ? 1 : 0;
      return grupoA - grupoB || a.installments - b.installments;
    });
  if (!opcoes.length) throw new Error("Mercado Pago não devolveu payer_costs válidos");
  return opcoes;
}

export async function consultarParcelasOuAVista({
  bin,
  valor,
  accessToken,
  contexto,
}: {
  bin: string;
  valor: number;
  accessToken: string;
  contexto: Record<string, unknown>;
}) {
  try {
    return { opcoes: await consultarParcelasMercadoPago({ bin, valor, accessToken }), fallback: false };
  } catch (error) {
    console.error("Fallback de parcelamento Mercado Pago acionado", {
      ...contexto,
      motivo: error instanceof Error ? error.message : String(error),
      valor,
      bin_presente: /^\d{6}$/.test(bin),
    });
    return { opcoes: [opcaoAVista(valor)], fallback: true };
  }
}
