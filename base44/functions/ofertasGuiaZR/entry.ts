// Endpoint público (sem login) que devolve as ofertas ativas do Guia Técnico ZR.
// Usado pela página /comprar-zr e pelo site do Guia (zr.nutrimenu.com.br).
// Não devolve dados de usuário, nem de pagamento, nem chaves internas — só leitura.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { OFERTAS_ZR } from "../../shared/guiaTecnicoZR.ts";
import { aplicarDescontoPixParaBaixo, lerCondicoesComerciaisZR } from "../../shared/condicoesComerciaisZR.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.ConfiguracaoPlano.filter({
      produto: "guia_zr",
      venda_habilitada: true,
    });
    const { descontoPix, parcelasSemJuros } = await lerCondicoesComerciaisZR(base44);

    const ofertas = (configs || [])
      .filter((c: any) => c.plano_id && c.nome && c.valor_cobranca != null)
      .map((c: any) => {
        const ref = OFERTAS_ZR[c.plano_id];
        return {
          plano_id: c.plano_id,
          faixa: ref?.faixa || null,
          nome: c.nome,
          subtitulo: c.subtitulo || null,
          preco: Number(c.valor_cobranca),
          preco_pix: aplicarDescontoPixParaBaixo(Number(c.valor_cobranca), descontoPix),
          desconto_pix: descontoPix,
          parcelas_sem_juros: parcelasSemJuros,
          periodo_exibido: c.periodo_exibido || null,
          preco_detalhe: c.preco_detalhe || null,
          renovacao: ref?.renovacao ?? c.plano_id.endsWith("_renovacao"),
          upgrade: ref?.upgrade ?? false,
          requer_faixas: ref?.requer_faixas ?? [],
          duracao_meses: 12,
          mais_popular: Boolean(c.mais_popular),
          ordem: Number(c.ordem || 0),
          beneficios: Array.isArray(c.beneficios) ? c.beneficios : [],
        };
      })
      .filter((o: any) => o.faixa !== null)
      .sort((a: any, b: any) => a.ordem - b.ordem);

    return Response.json({ ofertas });
  } catch (error) {
    return Response.json({ error: "Erro ao carregar ofertas" }, { status: 500 });
  }
}