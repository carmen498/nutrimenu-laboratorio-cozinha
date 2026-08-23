import fs from 'node:fs';

const jobs = [
  'base44/functions/enviarLembretePendencia/entry.ts',
  'base44/functions/enviarPlanoVencendo/entry.ts',
  'base44/functions/enviarTrialExpirando/entry.ts',
  'base44/functions/enviarTrialVencido/entry.ts',
  'base44/functions/atualizarPrecosAutomatico/entry.ts',
];

const erros = [];
for (const path of jobs) {
  const src = fs.readFileSync(path, 'utf8');
  if (!src.includes('protegerExecucaoAgendada')) erros.push(`${path}: sem gate agendado`);
  if (!src.includes('cooldownHoras:')) erros.push(`${path}: sem cooldown`);
  if (!src.includes('janela:')) erros.push(`${path}: sem janela de execução`);
  if (!src.includes('if (gate.response) return gate.response')) erros.push(`${path}: gate não interrompe execução`);
  if (/req\.json\(\)/.test(src)) erros.push(`${path}: job agendado aceita payload de negócio do request`);
}

const helper = fs.readFileSync('base44/shared/protecoesAutomacao.ts', 'utf8');
for (const regra of [
  'req.method !== "POST"',
  'user.role !== "admin"',
  '!user && !dentroDaJanela',
  'adquirirCooldownAutomacao',
]) {
  if (!helper.includes(regra)) erros.push(`protecoesAutomacao.ts: regra ausente: ${regra}`);
}

if (erros.length) {
  console.error('FALHA: hardening das functions agendadas incompleto');
  erros.forEach((erro) => console.error(`- ${erro}`));
  process.exit(1);
}

console.log(`OK: ${jobs.length} functions agendadas protegidas por método, janela e cooldown; sem payload de negócio do request.`);
