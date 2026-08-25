// Public Keys do Mercado Pago — não são dados sensíveis.
// IMPORTANTE: ao alternar a secret AMBIENTE do backend (função criarPagamentoMercadoPago)
// para "producao", altere também IS_PRODUCTION abaixo para true.
export const IS_PRODUCTION = true;

const SANDBOX_PUBLIC_KEY = "APP_USR-d5eb6ba4-9921-4c6c-bd65-f0edbd382ae2";
const PROD_PUBLIC_KEY = "APP_USR-7169e47c-b9ef-4c41-9294-decc25f6eb5b";

export const MERCADOPAGO_PUBLIC_KEY = IS_PRODUCTION ? PROD_PUBLIC_KEY : SANDBOX_PUBLIC_KEY;

let sdkPromise = null;
let deviceIdPromise = null;

export function carregarMercadoPagoSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SDK do Mercado Pago indisponível fora do navegador."));
  }
  const browserWindow = /** @type {any} */ (window);
  if (browserWindow.MercadoPago) return Promise.resolve(browserWindow.MercadoPago);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector('script[data-mercadopago-sdk="v2"]');
    if (existente) {
      existente.addEventListener("load", () => resolve(browserWindow.MercadoPago), { once: true });
      existente.addEventListener("error", () => reject(new Error("Falha ao carregar SDK do Mercado Pago.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.dataset.mercadopagoSdk = "v2";
    script.onload = () => browserWindow.MercadoPago
      ? resolve(browserWindow.MercadoPago)
      : reject(new Error("SDK do Mercado Pago carregou sem inicializar."));
    script.onerror = () => reject(new Error("Falha ao carregar SDK do Mercado Pago."));
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });

  return sdkPromise;
}

export function carregarMercadoPagoDeviceId() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.MP_DEVICE_SESSION_ID) return Promise.resolve(window.MP_DEVICE_SESSION_ID);
  if (deviceIdPromise) return deviceIdPromise;

  deviceIdPromise = new Promise((resolve) => {
    let script = document.querySelector('script[data-mercadopago-security="v2"]');
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.mercadopago.com/v2/security.js";
      script.async = true;
      script.dataset.mercadopagoSecurity = "v2";
      script.setAttribute("view", "checkout");
      document.head.appendChild(script);
    }

    const inicio = Date.now();
    const verificar = () => {
      if (window.MP_DEVICE_SESSION_ID) return resolve(window.MP_DEVICE_SESSION_ID);
      if (Date.now() - inicio >= 5000) return resolve(null);
      window.setTimeout(verificar, 100);
    };
    verificar();
  }).finally(() => {
    if (!window.MP_DEVICE_SESSION_ID) deviceIdPromise = null;
  });

  return deviceIdPromise;
}