import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const acesso = await import(pathToFileURL(path.join(root, "src/lib/acessoAssinatura.js")).href);
const hoje = new Date("2026-08-30T15:00:00-03:00");
const base = {
  role: "user",
  plano_atual: "trial",
  status_assinatura: "trial",
  data_inicio: "2026-08-01",
  data_expiracao: "2026-08-30",
  trial_modelo: "7_em_30",
};

const seisDias = ["2026-08-02","2026-08-05","2026-08-09","2026-08-13","2026-08-18","2026-08-25"];
assert.equal(acesso.avaliarAcessoAssinatura({ ...base, trial_dias_uso: seisDias }, hoje).temAcesso, true, "6 dias usados deve permitir o 7º dia");
assert.equal(acesso.avaliarAcessoAssinatura({ ...base, trial_dias_uso: [...seisDias, "2026-08-30"] }, hoje).temAcesso, true, "7º dia já registrado deve permanecer válido até o fim do dia");
assert.equal(acesso.avaliarAcessoAssinatura({ ...base, trial_dias_uso: [...seisDias, "2026-08-29"] }, hoje).motivo, "trial_dias_esgotados", "8º dia distinto deve ser bloqueado");
assert.equal(acesso.avaliarAcessoAssinatura({ ...base, data_expiracao: "2026-08-29", trial_dias_uso: ["2026-08-02"] }, hoje).motivo, "expirado", "janela de 30 dias vencida deve bloquear mesmo com dias de uso restantes");

const init = fs.readFileSync(path.join(root, "base44/functions/inicializarTrialUsuario/entry.ts"), "utf8");
const registrar = fs.readFileSync(path.join(root, "base44/functions/registrarDiaUsoTrial/entry.ts"), "utf8");
const custosFront = fs.readFileSync(path.join(root, "src/lib/laboratorioCustosAccess.js"), "utf8");
const custosServer = fs.readFileSync(path.join(root, "base44/shared/acessoLaboratorioCustos.ts"), "utf8");
const planos = fs.readFileSync(path.join(root, "src/pages/Planos.jsx"), "utf8");

assert.ok(init.includes("calcularExpiracaoInclusiva(dataInicio, 30)"), "trial novo precisa ter janela de 30 dias");
assert.ok(init.includes('trial_modelo: "7_em_30"'), "trial novo precisa gravar o modelo 7_em_30");
assert.ok(init.includes("AcessoLaboratorioCustosUsuario.create"), "trial novo precisa criar acesso automático ao Custos");
assert.ok(registrar.includes("usados.includes(hoje)"), "mesmo dia não pode ser consumido duas vezes");
assert.ok(registrar.includes("usados.length >= LIMITE_DIAS_USO"), "8º dia precisa ser bloqueado");
assert.ok(registrar.includes("trialLegadoMigravel"), "trials antigos precisam migrar sem perder a nova janela");
assert.ok(custosFront.includes('motivo: "trial_plataforma"') && custosServer.includes('motivo: "trial_plataforma"'), "Cozinha e Custos precisam compartilhar o trial no front e no backend");
assert.ok(planos.includes("Laboratório de Custos incluído"), "card Trial precisa mostrar Custos incluído automaticamente");
assert.ok(planos.includes("7 dias de uso em até 30 dias"), "card Trial precisa comunicar a nova regra");

console.log("OK: trial Plataforma ZR — 7 dias distintos de uso em até 30 dias, Cozinha + Custos compartilhados.");
