import assert from 'node:assert/strict';

const ORIGIN = 'https://laboratoriodecozinha.com.br';
const APP_ID = '6a2b263c4c1cb1e47d54d8b7';

async function fetchManual(url, options = {}) {
  return fetch(url, { redirect: 'manual', ...options });
}

function redirectOk(status) {
  return [301, 302, 307, 308].includes(status);
}

const httpRoot = await fetchManual('http://laboratoriodecozinha.com.br/');
assert.ok(redirectOk(httpRoot.status), `HTTP apex não redirecionou: ${httpRoot.status}`);
assert.equal(httpRoot.headers.get('location'), `${ORIGIN}/`, 'HTTP apex deve redirecionar direto para HTTPS apex');

const httpsRoot = await fetch(`${ORIGIN}/`);
assert.equal(httpsRoot.status, 200, `HTTPS apex respondeu ${httpsRoot.status}`);
const hsts = httpsRoot.headers.get('strict-transport-security') || '';
assert.match(hsts, /max-age=31536000/i, 'HSTS de 1 ano não encontrado no apex');
const htmlRoot = await httpsRoot.text();
assert.match(htmlRoot, /<div id=["']root["']/i, 'Shell SPA não encontrado no apex');
assert.doesNotMatch(htmlRoot, /sdk\.mercadopago\.com\/js\/v2/i, 'Produção ainda carrega SDK Mercado Pago global legado; build publicada está defasada');
assert.doesNotMatch(htmlRoot, /logUserAgentDiagnostico/i, 'Produção ainda contém diagnóstico User-Agent legado; build publicada está defasada');

const httpWww = await fetchManual('http://www.laboratoriodecozinha.com.br/');
assert.ok(redirectOk(httpWww.status), `HTTP www não redirecionou: ${httpWww.status}`);
const httpsWww = await fetchManual('https://www.laboratoriodecozinha.com.br/');
assert.ok(redirectOk(httpsWww.status), `HTTPS www não redirecionou: ${httpsWww.status}`);
assert.equal(httpsWww.headers.get('location'), `${ORIGIN}/`, 'www deve canonicalizar para o apex HTTPS');

const routes = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/termos',
  '/privacidade',
  '/aceitar-termos',
  '/sobre',
  '/contato',
  '/app',
  '/planos',
  '/conta',
  '/suporte',
  '/sobre-carmen',
  '/receitas',
  '/minhas-receitas',
  '/cardapios',
  '/ingredientes',
  '/lista-compras',
  '/percapita',
  '/admin/comunicacao',
  '/auditorias',
];

for (const path of routes) {
  const res = await fetch(`${ORIGIN}${path}`, { redirect: 'manual' });
  assert.equal(res.status, 200, `${path} respondeu ${res.status}; deep link da SPA quebrado`);
  const html = await res.text();
  assert.match(html, /<div id=["']root["']/i, `${path} não retornou o shell da SPA`);
}

// Exercita somente a rota pública do backend com um endereço propositalmente inexistente.
// A resposta deve permanecer neutra para não permitir enumeração de contas.
const resetProbe = await fetch(`${ORIGIN}/api/apps/${APP_ID}/auth/reset-password-request`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-App-Id': APP_ID,
  },
  body: JSON.stringify({ email: 'fase8-rota-inexistente-20260823@example.invalid' }),
});
assert.equal(resetProbe.status, 200, `reset-password-request no domínio próprio respondeu ${resetProbe.status}`);

const oauthStart = `${ORIGIN}/api/apps/auth/login?app_id=${APP_ID}&from_url=${encodeURIComponent(`${ORIGIN}/`)}`;
const oauthHop1 = await fetchManual(oauthStart);
assert.ok(redirectOk(oauthHop1.status), `OAuth hop 1 respondeu ${oauthHop1.status}`);
const hop1Location = oauthHop1.headers.get('location');
assert.ok(hop1Location, 'OAuth hop 1 sem Location');
const hop1Url = new URL(hop1Location);
assert.equal(hop1Url.hostname, 'app.base44.com', 'OAuth deve delegar ao host oficial da Base44');

const oauthHop2 = await fetchManual(hop1Location);
assert.ok(redirectOk(oauthHop2.status), `OAuth hop 2 respondeu ${oauthHop2.status}`);
const hop2Location = oauthHop2.headers.get('location');
assert.ok(hop2Location, 'OAuth hop 2 sem Location');
const googleUrl = new URL(hop2Location);
assert.equal(googleUrl.hostname, 'accounts.google.com', 'OAuth não chegou ao Google');
assert.equal(
  googleUrl.searchParams.get('redirect_uri'),
  'https://app.base44.com/api/apps/auth/callback',
  'Callback Google/Base44 inesperado',
);
assert.ok(googleUrl.searchParams.has('state'), 'OAuth Google sem state');

console.log(`OK: domínio de produção — ${routes.length} deep links + HTTPS/HSTS + www canônico + reset + OAuth Google.`);
