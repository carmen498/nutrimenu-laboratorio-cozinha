// Public Keys do Mercado Pago — não são dados sensíveis.
// IMPORTANTE: ao alternar a secret AMBIENTE do backend (função criarPagamentoMercadoPago)
// para "producao", altere também IS_PRODUCTION abaixo para true.
export const IS_PRODUCTION = false;

const SANDBOX_PUBLIC_KEY = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const PROD_PUBLIC_KEY = "APP_USR-3768931e-0dad-4858-89d8-80cb96707a4e";

export const MERCADOPAGO_PUBLIC_KEY = IS_PRODUCTION ? PROD_PUBLIC_KEY : SANDBOX_PUBLIC_KEY;