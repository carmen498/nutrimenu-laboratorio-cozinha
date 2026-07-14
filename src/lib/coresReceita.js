// Modelo de cor: família (8) x tom (claro/médio/escuro) = 24 combinações.
// Chave gravada no banco: `${familia}__${tom}` (ex: "verde__escuro").
// Compatibilidade: chaves antigas sem "__" (ex: "verde") são tratadas como tom "medio".

export const FAMILIAS_CORES = {
  verde: { label: "Verde", tons: { claro: "#8FBF86", medio: "#4E7C4A", escuro: "#2F4E2B" } },
  vermelho: { label: "Vermelho", tons: { claro: "#D97F7F", medio: "#B33A3A", escuro: "#7A2222" } },
  laranja: { label: "Laranja", tons: { claro: "#EAA968", medio: "#D97B2E", escuro: "#A65A1E" } },
  amarelo: { label: "Amarelo", tons: { claro: "#EDCB70", medio: "#E0B33C", escuro: "#B8901F" } },
  marrom_dourado: { label: "Marrom/Dourado", tons: { claro: "#B08862", medio: "#8A5A33", escuro: "#5E3A1F" } },
  branco_creme: { label: "Branco/Creme", tons: { claro: "#FAF6EC", medio: "#F0E8D8", escuro: "#DCCFB0" } },
  rose: { label: "Rosé", tons: { claro: "#F2B6C0", medio: "#E8909F", escuro: "#C56374" } },
  roxo: { label: "Roxo", tons: { claro: "#9779A3", medio: "#6B4A78", escuro: "#493352" } },
};

export const TONS_LIST = [
  { key: "claro", label: "Claro" },
  { key: "medio", label: "Médio" },
  { key: "escuro", label: "Escuro" },
];

export const FAMILIAS_CORES_LIST = Object.entries(FAMILIAS_CORES).map(([key, val]) => ({ key, ...val }));

export const COR_SEM_COR = "#D5D2C8";

// Retorna { familia, tom } ou null se a chave não corresponder a nenhuma família conhecida.
export function parseCorKey(key) {
  if (!key) return null;
  const idx = key.indexOf("__");
  const familia = idx === -1 ? key : key.slice(0, idx);
  const tomBruto = idx === -1 ? "medio" : key.slice(idx + 2);
  if (!FAMILIAS_CORES[familia]) return null;
  const tom = FAMILIAS_CORES[familia].tons[tomBruto] ? tomBruto : "medio";
  return { familia, tom };
}

export function buildCorKey(familia, tom) {
  if (!familia) return "";
  return `${familia}__${tom || "medio"}`;
}

export function getCorHex(key) {
  const parsed = parseCorKey(key);
  if (!parsed) return COR_SEM_COR;
  return FAMILIAS_CORES[parsed.familia].tons[parsed.tom];
}

// Label da família (usado para agrupar/legendar, ex. na barra de cores do cardápio)
export function getCorLabel(key) {
  const parsed = parseCorKey(key);
  if (!parsed) return "Sem cor";
  return FAMILIAS_CORES[parsed.familia].label;
}

export function getCorFamiliaKey(key) {
  const parsed = parseCorKey(key);
  return parsed ? parsed.familia : null;
}

export function getCorTomLabel(key) {
  const parsed = parseCorKey(key);
  if (!parsed) return "";
  return TONS_LIST.find(t => t.key === parsed.tom)?.label || "";
}

// Label completo "Família Tom" — usado em tooltips/detalhes
export function getCorLabelCompleto(key) {
  const parsed = parseCorKey(key);
  if (!parsed) return "Sem cor";
  return `${FAMILIAS_CORES[parsed.familia].label} ${getCorTomLabel(key)}`;
}