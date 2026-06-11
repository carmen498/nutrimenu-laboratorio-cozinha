// Converte texto corrido de modo de preparo em array de passos numerados
export function formatarModoPreparo(texto) {
  if (!texto) return [];
  // Remove quebras extras e normaliza
  let t = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Verifica se já está em linhas separadas
  const linhas = t.split("\n").filter(l => l.trim());
  const temNumeracao = linhas.some(l => /^\d+[\.\-\)]\s/.test(l.trim()));
  if (temNumeracao) {
    return linhas.map(l => l.trim()).filter(l => l);
  }
  // Tenta quebrar por padrões de numeração inline: "1. texto 2. texto"
  const partes = t.split(/(\d+[\.\-\)]\s)/);
  if (partes.length > 1) {
    const passos = [];
    for (let i = 1; i < partes.length; i += 2) {
      const num = partes[i];
      const texto = (partes[i + 1] || "").trim();
      if (texto) passos.push(`${num}${texto}`);
    }
    if (passos.length > 0) return passos;
  }
  // Sem numeração clara, retorna o texto inteiro como um passo
  return [t.trim()];
}

// Junta passos de volta em texto para armazenar (um por linha)
export function juntarPassos(passos) {
  return (passos || []).join("\n");
}

// Renderiza passos como string para exportação/compartilhamento
export function passosParaTexto(passos) {
  return (passos || []).map(p => p.trim()).join("\n");
}