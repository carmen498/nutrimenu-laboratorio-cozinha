export const CORES_RECEITA = {
  branco_bege: { label: "Branco/Bege", hex: "#F0E6D2" },
  amarelo: { label: "Amarelo", hex: "#FFD54F" },
  laranja: { label: "Laranja", hex: "#FF8A65" },
  vermelho: { label: "Vermelho", hex: "#E53935" },
  verde: { label: "Verde", hex: "#66BB6A" },
  marrom_dourado: { label: "Marrom/Dourado", hex: "#8D6E63" },
  roxo_rosa: { label: "Roxo/Rosa", hex: "#C477B0" },
  preto_escuro: { label: "Preto/Escuro", hex: "#37474F" },
};

export const CORES_RECEITA_LIST = Object.entries(CORES_RECEITA).map(([key, val]) => ({
  key,
  ...val,
}));

export const COR_SEM_COR = "#D6D3D1";

export function getCorHex(key) {
  return CORES_RECEITA[key]?.hex || COR_SEM_COR;
}

export function getCorLabel(key) {
  return CORES_RECEITA[key]?.label || "Sem cor";
}