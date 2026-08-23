import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

const root = process.cwd();

async function importarTs(relPath) {
  const full = path.join(root, relPath);
  const source = await fs.readFile(full, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
    fileName: full,
  }).outputText;
  const url = `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
  return import(url);
}

const frontend = await import(pathToFileURL(path.join(root, 'src/lib/acessoAssinatura.js')).href);
const backend = await importarTs('base44/shared/acessoAssinatura.ts');
const datas = await importarTs('base44/shared/datasAssinatura.ts');

const agora = new Date('2026-08-23T12:00:00.000Z'); // 09:00 em America/Sao_Paulo
const depoisMeiaNoiteUtcAindaDia23SP = new Date('2026-08-24T01:30:00.000Z'); // 22:30 de 23/08 em SP

const cenarios = [
  ['sem usuário', null, false, 'sem_usuario'],
  ['admin sem validade', { role: 'admin' }, true, 'admin'],
  ['trial no último dia', { role: 'user', plano_atual: 'trial', status_assinatura: 'trial', data_expiracao: '2026-08-23' }, true, 'trial'],
  ['trial futuro', { role: 'user', plano_atual: 'trial', status_assinatura: 'trial', data_expiracao: '2026-08-24' }, true, 'trial'],
  ['trial expirado', { role: 'user', plano_atual: 'trial', status_assinatura: 'trial', data_expiracao: '2026-08-22' }, false, 'expirado'],
  ['mensal ativo no último dia', { role: 'user', plano_atual: 'mensal', status_assinatura: 'ativo', data_expiracao: '2026-08-23' }, true, 'ativo'],
  ['anual ativo futuro', { role: 'user', plano_atual: 'anual', status_assinatura: 'ativo', data_expiracao: '2027-08-22' }, true, 'ativo'],
  ['renovação ativa futura', { role: 'user', plano_atual: 'renovacao', status_assinatura: 'ativo', data_expiracao: '2027-08-22' }, true, 'ativo'],
  ['ativo expirado', { role: 'user', plano_atual: 'mensal', status_assinatura: 'ativo', data_expiracao: '2026-08-22' }, false, 'expirado'],
  ['vencido com data futura', { role: 'user', plano_atual: 'mensal', status_assinatura: 'vencido', data_expiracao: '2026-09-18' }, false, 'vencido'],
  ['cancelado com data futura', { role: 'user', plano_atual: 'mensal', status_assinatura: 'cancelado', data_expiracao: '2026-09-18' }, false, 'cancelado'],
  ['inativo com data futura', { role: 'user', plano_atual: 'mensal', status_assinatura: 'inativo', data_expiracao: '2026-09-18' }, false, 'inativo'],
  ['ativo sem data', { role: 'user', plano_atual: 'mensal', status_assinatura: 'ativo' }, false, 'sem_data_expiracao'],
  ['trial com data inválida', { role: 'user', plano_atual: 'trial', status_assinatura: 'trial', data_expiracao: '23/08/2026' }, false, 'sem_data_expiracao'],
  ['sem status', { role: 'user', plano_atual: 'mensal', data_expiracao: '2026-09-18' }, false, 'sem_status'],
];

let falhas = 0;
function conferir(condicao, mensagem) {
  if (!condicao) {
    falhas++;
    console.error(`FALHA: ${mensagem}`);
  }
}

for (const [nome, user, temAcesso, motivo] of cenarios) {
  const front = frontend.avaliarAcessoAssinatura(user, agora);
  const back = backend.avaliarAcessoAssinaturaServer(user, agora);
  conferir(front.temAcesso === temAcesso && front.motivo === motivo, `${nome} — frontend retornou ${JSON.stringify(front)}`);
  conferir(back.temAcesso === temAcesso && back.motivo === motivo, `${nome} — backend retornou ${JSON.stringify(back)}`);
  conferir(front.temAcesso === back.temAcesso && front.motivo === back.motivo, `${nome} — frontend/backend divergiram`);
}

// Fronteira de fuso: já é 24/08 UTC, mas ainda 23/08 em São Paulo.
const fronteiraUser = { role: 'user', status_assinatura: 'ativo', data_expiracao: '2026-08-23' };
const frontFuso = frontend.avaliarAcessoAssinatura(fronteiraUser, depoisMeiaNoiteUtcAindaDia23SP);
const backFuso = backend.avaliarAcessoAssinaturaServer(fronteiraUser, depoisMeiaNoiteUtcAindaDia23SP);
conferir(frontFuso.temAcesso === true, `fronteira de fuso — frontend bloqueou antes da meia-noite de São Paulo`);
conferir(backFuso.temAcesso === true, `fronteira de fuso — backend bloqueou antes da meia-noite de São Paulo`);

// Rotas que precisam permanecer disponíveis para recuperação/renovação.
for (const rota of ['/planos', '/conta', '/suporte']) {
  conferir(frontend.rotaLiberadaSemAssinatura(rota) === true, `rota ${rota} deveria estar liberada sem assinatura`);
}
for (const rota of ['/', '/receitas', '/cardapios', '/planejamentos']) {
  conferir(frontend.rotaLiberadaSemAssinatura(rota) === false, `rota ${rota} não deveria estar liberada sem assinatura`);
}

// Períodos inclusivos.
conferir(datas.calcularExpiracaoInclusiva('2026-08-23', 1) === '2026-08-23', 'plano de 1 dia deve expirar no próprio dia');
conferir(datas.calcularExpiracaoInclusiva('2026-08-23', 7) === '2026-08-29', 'trial de 7 dias deve expirar em 29/08');
conferir(datas.calcularExpiracaoInclusiva('2026-08-23', 30) === '2026-09-21', 'plano de 30 dias deve expirar em 21/09');
conferir(datas.calcularExpiracaoInclusiva('2026-08-23', 365) === '2027-08-22', 'plano anual de 365 dias deve expirar em 22/08/2027');

// Gate HTTP server-side: conta bloqueada precisa receber 403 subscription_required.
const mockBase44 = (user) => ({ auth: { me: async () => user } });
const bloqueado = await backend.exigirAssinaturaAtiva(mockBase44({ role: 'user', status_assinatura: 'vencido', data_expiracao: '2026-09-18' }), agora);
conferir(bloqueado.response?.status === 403, 'gate server-side deveria retornar HTTP 403 para vencido');
const bloqueadoBody = bloqueado.response ? await bloqueado.response.json() : {};
conferir(bloqueadoBody.code === 'subscription_required' && bloqueadoBody.motivo === 'vencido', 'gate server-side deveria retornar subscription_required/vencido');

const permitido = await backend.exigirAssinaturaAtiva(mockBase44({ role: 'user', status_assinatura: 'ativo', data_expiracao: '2026-08-23' }), agora);
conferir(permitido.response === null && permitido.acesso.temAcesso === true, 'gate server-side deveria liberar ativo no último dia');

// Verificação estática das funções pagas chamadas por usuários comuns.
for (const funcao of ['analisarReceitaTexto', 'buscarPrecosIA', 'registrarHistoricoReceita']) {
  const src = await fs.readFile(path.join(root, `base44/functions/${funcao}/entry.ts`), 'utf8');
  conferir(src.includes('exigirAssinaturaAtiva'), `${funcao} deve exigir assinatura server-side`);
}

// Renovação/contratação e aceite precisam continuar acessíveis a uma conta vencida.
for (const funcao of ['criarPagamentoMercadoPago', 'registrarAceiteTermos', 'inicializarTrialUsuario']) {
  const src = await fs.readFile(path.join(root, `base44/functions/${funcao}/entry.ts`), 'utf8');
  conferir(!src.includes('exigirAssinaturaAtiva'), `${funcao} não deve exigir assinatura ativa para ser chamado`);
}

if (falhas) {
  console.error(`\n${falhas} falha(s) na matriz de assinaturas.`);
  process.exit(1);
}

console.log(`OK: matriz de assinaturas aprovada — ${cenarios.length} estados + fuso + rotas + períodos + gate server-side.`);
