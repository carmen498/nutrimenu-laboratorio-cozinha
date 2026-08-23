import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const jobs = [
  { name: "enviarTrialVencido", start: "11:00", unit: "days", interval: 1, cooldown: "cooldownHoras: 20" },
  { name: "enviarTrialExpirando", start: "11:10", unit: "days", interval: 1, cooldown: "cooldownHoras: 20" },
  { name: "enviarPlanoVencendo", start: "11:20", unit: "days", interval: 1, cooldown: "cooldownHoras: 20" },
  { name: "enviarLembretePendencia", start: "11:30", unit: "days", interval: 1, cooldown: "cooldownHoras: 20" },
  { name: "atualizarPrecosAutomatico", start: "06:00", unit: "weeks", interval: 1, weekdays: [1], cooldown: "cooldownHoras: 144" },
];

const erros = [];
const fail = (message) => erros.push(message);

for (const job of jobs) {
  const dir = path.join(root, "base44", "functions", job.name);
  const entryPath = path.join(dir, "entry.ts");
  const configPath = path.join(dir, "function.jsonc");
  if (!fs.existsSync(entryPath)) { fail(`${job.name}: entry.ts ausente`); continue; }
  if (!fs.existsSync(configPath)) { fail(`${job.name}: function.jsonc ausente`); continue; }

  const entry = fs.readFileSync(entryPath, "utf8");
  if (!entry.includes("protegerExecucaoAgendada")) fail(`${job.name}: sem gate protegerExecucaoAgendada`);
  if (!entry.includes(job.cooldown)) fail(`${job.name}: cooldown esperado ausente (${job.cooldown})`);
  if (!entry.includes("janela:")) fail(`${job.name}: sem janela de execução`);
  if (!entry.includes("if (gate.response) return gate.response")) fail(`${job.name}: gate não interrompe execução`);
  if (/req\.json\s*\(/.test(entry)) fail(`${job.name}: job agendado aceita payload de negócio do request`);

  let config;
  try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); }
  catch (error) { fail(`${job.name}: function.jsonc inválido (${error.message})`); continue; }

  if (config.name !== job.name) fail(`${job.name}: name divergente no function.jsonc`);
  if (config.entry !== "entry.ts") fail(`${job.name}: entry divergente no function.jsonc`);
  const automations = Array.isArray(config.automations) ? config.automations : [];
  if (automations.length !== 1) { fail(`${job.name}: deve possuir exatamente 1 automação versionada`); continue; }
  const automation = automations[0];
  if (automation.type !== "scheduled") fail(`${job.name}: automação deve ser scheduled`);
  if (automation.schedule_mode !== "recurring") fail(`${job.name}: schedule_mode deve ser recurring`);
  if (automation.schedule_type !== "simple") fail(`${job.name}: schedule_type deve ser simple`);
  if (automation.repeat_unit !== job.unit) fail(`${job.name}: repeat_unit esperado ${job.unit}`);
  if (automation.repeat_interval !== job.interval) fail(`${job.name}: repeat_interval esperado ${job.interval}`);
  if (automation.start_time !== job.start) fail(`${job.name}: start_time esperado ${job.start} UTC`);
  if (automation.is_active !== true) fail(`${job.name}: automação deve estar ativa`);
  if (job.weekdays && JSON.stringify(automation.repeat_on_days || []) !== JSON.stringify(job.weekdays)) {
    fail(`${job.name}: repeat_on_days esperado ${JSON.stringify(job.weekdays)}`);
  }
}

const helper = fs.readFileSync(path.join(root, "base44", "shared", "protecoesAutomacao.ts"), "utf8");
for (const regra of [
  'req.method !== "POST"',
  'user.role !== "admin"',
  '!user && !dentroDaJanela',
  'reason: "outside_schedule_window"',
  'reason: "cooldown"',
  'adquirirCooldownAutomacao',
]) {
  if (!helper.includes(regra)) fail(`protecoesAutomacao.ts: regra ausente: ${regra}`);
}

if (erros.length) {
  console.error("FALHA: hardening das functions agendadas incompleto");
  erros.forEach((erro) => console.error(`- ${erro}`));
  process.exit(1);
}

console.log(`OK: ${jobs.length} functions agendadas com agenda versionada, método POST, janela, cooldown e sem payload de negócio do request.`);
