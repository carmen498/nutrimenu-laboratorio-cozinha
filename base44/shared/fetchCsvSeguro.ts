const MAX_CSV_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return false;
  const nums = parts.map(Number);
  if (nums.some((n) => n < 0 || n > 255)) return false;
  const [a, b] = nums;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    a >= 224
  );
}

function isPrivateIPv6(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!h.includes(':')) return false;
  return h === '::' || h === '::1' || h.startsWith('fe8') || h.startsWith('fe9') ||
    h.startsWith('fea') || h.startsWith('feb') || h.startsWith('fc') || h.startsWith('fd');
}

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
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host.endsWith('.internal') || host.endsWith('.lan') || isPrivateIPv4(host) || isPrivateIPv6(host)) {
    throw new Error('Host do arquivo não permitido');
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
