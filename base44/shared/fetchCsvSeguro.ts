const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const BASE44_UPLOAD_HOST = 'base44.app';
const APP_ID = '6a2b263c4c1cb1e47d54d8b7';
const BASE44_FILE_PREFIX = `/api/apps/${APP_ID}/files/`;

function validarUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('URL do arquivo inválida');
  }

  if (url.protocol !== 'https:') throw new Error('A URL do arquivo deve usar HTTPS');
  if (url.username || url.password) throw new Error('URL do arquivo não pode conter credenciais');

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host !== BASE44_UPLOAD_HOST || (url.port && url.port !== '443')) {
    throw new Error('Somente arquivos enviados pelo Base44 são permitidos');
  }
  if (!url.pathname.startsWith(BASE44_FILE_PREFIX)) {
    throw new Error('O arquivo deve pertencer a este aplicativo Base44');
  }

  return url;
}

export async function fetchCsvSeguro(rawUrl: string): Promise<string> {
  let url = validarUrl(rawUrl);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'text/csv,text/plain,application/octet-stream;q=0.8' },
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Tempo limite excedido ao baixar o CSV');
      throw new Error('Não foi possível baixar o CSV');
    } finally {
      clearTimeout(timer);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirecionamento do CSV sem destino');
      if (redirects === MAX_REDIRECTS) throw new Error('Muitos redirecionamentos ao baixar o CSV');
      url = validarUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) throw new Error(`Falha ao baixar CSV (HTTP ${response.status})`);

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_CSV_BYTES) throw new Error('CSV excede o limite de 5 MB');

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_CSV_BYTES) throw new Error('CSV excede o limite de 5 MB');

    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }

  throw new Error('Não foi possível baixar o CSV');
}
