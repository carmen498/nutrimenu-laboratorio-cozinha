import { normalizarNome } from "@/lib/normalizarNome";

// Agrupa itens cujo nome normalizado (sem acento, minúsculo, sem pontuação/hífen) é igual.
// Retorna apenas grupos com 2+ variantes, ordenados do maior para o menor.
export function agruparDuplicados(items, getNome) {
  const map = new Map();
  items.forEach((item) => {
    const norm = normalizarNome(getNome(item));
    if (!norm) return;
    if (!map.has(norm)) map.set(norm, []);
    map.get(norm).push(item);
  });
  return Array.from(map.values())
    .filter((grupo) => grupo.length > 1)
    .sort((a, b) => b.length - a.length);
}

// Retorna true se o grupo contém 2+ itens com o nome EXATAMENTE igual (case-insensitive).
export function grupoTemNomeExato(grupo, getNome) {
  const contagem = new Map();
  grupo.forEach((item) => {
    const nome = (getNome(item) || "").trim().toLowerCase();
    contagem.set(nome, (contagem.get(nome) || 0) + 1);
  });
  return [...contagem.values()].some((n) => n > 1);
}