import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { ofertaZR } from "../../shared/guiaTecnicoZR.ts";
import { obterCredencialMercadoPago } from "../../shared/mercadoPagoCredencial.ts";
import { consultarParcelasOuAVista } from "../../shared/parcelamentoMercadoPago.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { plano, bin } = await req.json().catch(() => ({}));
    if (!ofertaZR(plano)) return Response.json({ error: "Oferta do Guia ZR inválida" }, { status: 400 });
    if (!/^\d{6}$/.test(String(bin || ""))) return Response.json({ error: "BIN inválido" }, { status: 400 });

    // O ID recebido é o da oferta real (compra, upgrade ou renovação).
    // Assim, o valor consultado é exatamente o valor_cobranca daquela oferta.
    const configuracoes = await base44.asServiceRole.entities.ConfiguracaoPlano.filter({
      produto: "guia_zr",
      plano_id: plano,
    });
    const configuracao = configuracoes?.[0];
    const valor = Number(configuracao?.valor_cobranca);
    if (!configuracao?.venda_habilitada || !(valor > 0)) {
      return Response.json({ error: "Oferta indisponível ou sem preço válido" }, { status: 409 });
    }

    const { ambiente, accessToken } = obterCredencialMercadoPago();
    const resultado = await consultarParcelasOuAVista({
      bin: String(bin),
      valor,
      accessToken,
      contexto: { function: "consultarParcelamentoMercadoPago", ambiente, plano },
    });
    return Response.json({
      payer_costs: resultado.opcoes,
      fallback: resultado.fallback,
      aviso: resultado.fallback
        ? "Não foi possível carregar as opções de parcelamento. O pagamento poderá ser feito em 1x."
        : "",
    });
  } catch (error) {
    console.error("Erro ao consultar parcelamento Mercado Pago", {
      motivo: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ error: "Não foi possível consultar o parcelamento" }, { status: 500 });
  }
}
