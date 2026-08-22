// Public Keys do Mercado Pago — não são dados sensíveis.
// IMPORTANTE: ao alternar a secret AMBIENTE do backend (função criarPagamentoMercadoPago)
// para "producao", altere também IS_PRODUCTION abaixo para true.
export const IS_PRODUCTION = true;

const SANDBOX_PUBLIC_KEY = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const PROD_PUBLIC_KEY = "APP_USR-7169e47c-b9ef-4c41-9294-decc25f6eb5b";

export const MERCADOPAGO_PUBLIC_KEY = IS_PRODUCTION ? PROD_PUBLIC_KEY : SANDBOX_PUBLIC_KEY;

let sdkPromise = null;

export function carregarMercadoPagoSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SDK do Mercado Pago indisponível fora do navegador."));
  }
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector('script[data-mercadopago-sdk="v2"]');
    if (existente) {
      existente.addEventListener("load", () => resolve(window.MercadoPago), { once: true });
      existente.addEventListener("error", () => reject(new Error("Falha ao carregar SDK do Mercado Pago.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.mercadopagoSdk = "v2";
    script.onload = () => window.MercadoPago
      ? resolve(window.MercadoPago)
      : reject(new Error("SDK do Mercado Pago carregou sem inicializar."));
    script.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago."));
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });

  return sdkPromise;
}