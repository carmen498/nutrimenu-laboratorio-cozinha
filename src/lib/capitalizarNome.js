// Capitaliza cada palavra de um nome próprio: "suzana rolim" → "Suzana Rolim".
// Preserva conectivos portugueses (de, da, do, das, dos, e) em minúsculas
// quando no meio do nome. Não altera siglas já em maiúscula (ex: "PF", "ME").
export function capitalizarNome(nome) {
  if (!nome) return "";
  const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e", "del", "della", "van", "von"]);
  return nome
    .trim()
    .split(/\s+/)
    .map((palavra, i, arr) => {
      const lower = palavra.toLowerCase();
      if (i > 0 && i < arr.length - 1 && CONECTIVOS.has(lower)) return lower;
      if (palavra.length <= 2 && palavra === palavra.toUpperCase()) return palavra;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}