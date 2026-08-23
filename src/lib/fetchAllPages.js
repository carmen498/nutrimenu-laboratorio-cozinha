// Busca TODOS os registros de uma entidade, paginando além do limite máximo
// de 5000 por requisição imposto pelo backend. Usar sempre que uma auditoria
// ou relatório precisar refletir 100% da base (não apenas uma amostra).
export async function fetchAllPages(entityClient, sort, pageSize = 1000) {
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