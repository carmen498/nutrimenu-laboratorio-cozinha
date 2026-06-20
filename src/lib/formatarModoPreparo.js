// Converte texto de modo de preparo em array de passos numerados
// Garante que cada passo vire um item separado, com quebras de linha entre eles
export function formatarModoPreparo(texto) {
  if (!texto) return [];
  // Normaliza quebras
  let t = texto.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Primeiro: tenta quebrar por \n (já está em linhas separadas)
  const linhas = t.split("\n").map(l => l.trim()).filter(l => l);
  
  // Verifica se há múltiplas linhas com numeração — caso mais comum
  const linhasComNum = linhas.filter(l => /^\d+[\.\-\)]\s/.test(l));
  if (linhasComNum.length >= 2) {
    // Já está bem formatado: uma linha por passo
    return linhas;
  }

  // Se tem só uma linha com numeração OU texto contínuo, tenta quebrar por numeração inline
  // Ex: "1. Derreter 2. Bater 3. Assar" (tudo em uma linha)
  const partes = t.split(/(\d+[\.\-\)]\s)/);
  if (partes.length >= 3) {
    const passos = [];
    for (let i = 1; i < partes.length; i += 2) {
      const num = partes[i];
      const txt = (partes[i + 1] || "").trim();
      if (txt) passos.push(`${num}${txt}`);
    }
    if (passos.length > 0) return passos;
  }

  // Fallback: texto sem numeração clara — retorna como um só passo
  return [t.trim()];
}

// Junta passos de volta em texto para armazenar, cada passo em sua própria linha
export function juntarPassos(passos) {
  return (passos || []).join("\n");
}

// Renderiza passos como string para exportação/compartilhamento
export function passosParaTexto(passos) {
  return (passos || []).map(p => p.trim()).join("\n");
}