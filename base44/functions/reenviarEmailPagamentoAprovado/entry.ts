// Função descontinuada. Criada apenas para reenvio pontual do e-mail
// "pagamento_aprovado" do Guia ZR em 2026-09-29, quando o templateEmail.ts
// antigo ainda quebrava no webhook. Com o fix deployado, o pipeline normal
// (webhook → ativarCompraPagamento → enviarEmailAprovadoZR) já cobre todos
// os casos. Mantida como tombstone 410 para impedir chamadas acidentais.

export default async function(): Promise<Response> {
  return Response.json(
    { error: "Função descontinuada. O reenvio de e-mail transacional é feito pelo pipeline normal do webhook.", versao: "tombstone-410-2026-09-29" },
    { status: 410 }
  );
}