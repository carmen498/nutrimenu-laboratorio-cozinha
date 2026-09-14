import { secrets } from "base44:runtime";

export function obterCredencialMercadoPago() {
  const ambiente = (secrets.get("AMBIENTE") || "").trim().toLowerCase();
  const accessToken = ambiente === "producao"
    ? secrets.get("MERCADOPAGO_ACCESS_TOKEN_PROD")
    : secrets.get("MERCADOPAGO_ACCESS_TOKEN_SANDBOX");
  return { ambiente, accessToken };
}
