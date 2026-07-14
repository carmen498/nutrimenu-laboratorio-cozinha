export const CORES_RECEITA = {
  verde: { label: "Verde", hex: "#4E7C4A" },
  vermelho: { label: "Vermelho", hex: "#B33A3A" },
  laranja: { label: "Laranja", hex: "#D97B2E" },
  amarelo: { label: "Amarelo", hex: "#E0B33C" },
  marrom_dourado: { label: "Marrom/Dourado", hex: "#8A5A33" },
  branco_creme: { label: "Branco/Creme", hex: "#F0E8D8" },
  rose: { label: "Rosé", hex: "#E8909F" },
  roxo: { label: "Roxo", hex: "#6B4A78" },
};

export const CORES_RECEITA_LIST = Object.entries(CORES_RECEITA).map(([key, val]) => ({
  key,
  ...val,
}));

export const COR_SEM_COR = "#D5D2C8";

export function getCorHex(key) {
  return CORES_RECEITA[key]?.hex || COR_SEM_COR;
}

export function getCorLabel(key) {
  return CORES_RECEITA[key]?.label || "Sem cor";
}