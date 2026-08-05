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