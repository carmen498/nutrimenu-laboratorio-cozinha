// Busca TODOS os registros de uma entidade, paginando além do limite máximo
// de 500 por requisição imposto pelo SDK no navegador. Usar sempre que uma auditoria
// ou relatório precisar refletir 100% da base (não apenas uma amostra).
export function withTimeout(promise, timeoutMs = 30000, message = "A consulta demorou mais que o esperado.") {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export async function fetchAllPages(entityClient, sort, pageSize = 500) {
  let all = [];
  let skip = 0;
  let lastLen = pageSize;
  while (lastLen === pageSize) {
    const page = await entityClient.list(sort, pageSize, skip);
    all = all.concat(page);
    lastLen = page.length;
    skip += pageSize;
  }
  return all;
}

// Variante paginada para consultas filtradas. O SDK aceita
// filter(query, sort, limit, skip); usar isto evita truncamento silencioso em
// receitas/auditorias que ultrapassem o limite de uma única página.
export async function fetchAllFilteredPages(entityClient, query, sort = "created_date", pageSize = 500) {
  let all = [];
  let skip = 0;
  let lastLen = pageSize;
  while (lastLen === pageSize) {
    const page = await entityClient.filter(query, sort, pageSize, skip);
    all = all.concat(page);
    lastLen = page.length;
    skip += pageSize;
  }
  return all;
}