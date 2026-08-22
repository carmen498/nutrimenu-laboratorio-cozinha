import assert from 'node:assert/strict';
import fs from 'node:fs';

const entities = [
  'IngredienteReceita',
  'ReceitaTag',
  'InsumoReceita',
  'IngredienteEsquecidoReceita',
  'CardapioReceita',
  'CardapioInsumo',
  'CardapioTag',
];

const USER_A = { id: 'user-a', role: 'user' };
const USER_B = { id: 'user-b', role: 'user' };
const ADMIN = { id: 'admin', role: 'admin' };

function resolveTemplate(value, user) {
  if (value === '{{user.id}}') return user.id;
  if (value === '{{user.role}}') return user.role;
  return value;
}

function evaluate(rule, row, user) {
  if (rule === true) return true;
  if (rule === false || rule == null) return false;

  if (rule.$or) return rule.$or.some((item) => evaluate(item, row, user));
  if (rule.$and) return rule.$and.every((item) => evaluate(item, row, user));

  if (rule.user_condition) {
    return Object.entries(rule.user_condition).every(([key, value]) => user[key] === resolveTemplate(value, user));
  }

  return Object.entries(rule).every(([key, expected]) => {
    if (!key.startsWith('data.')) throw new Error(`Operador não suportado no teste: ${key}`);
    const field = key.slice(5);
    return row[field] === resolveTemplate(expected, user);
  });
}

for (const entity of entities) {
  const path = `base44/entities/${entity}.jsonc`;
  const schema = JSON.parse(fs.readFileSync(path, 'utf8'));
  const { rls } = schema;
  assert.ok(rls, `${entity}: RLS ausente`);

  const base = { is_base: true, usuario_dono_id: null };
  const privadaA = { is_base: false, usuario_dono_id: USER_A.id };
  const privadaB = { is_base: false, usuario_dono_id: USER_B.id };

  assert.equal(evaluate(rls.read, base, USER_A), true, `${entity}: A deve ler base`);
  assert.equal(evaluate(rls.read, base, USER_B), true, `${entity}: B deve ler base`);
  assert.equal(evaluate(rls.read, privadaA, USER_A), true, `${entity}: A deve ler próprio registro`);
  assert.equal(evaluate(rls.read, privadaA, USER_B), false, `${entity}: B não pode ler registro de A`);
  assert.equal(evaluate(rls.read, privadaB, USER_A), false, `${entity}: A não pode ler registro de B`);

  assert.equal(evaluate(rls.update, privadaA, USER_A), true, `${entity}: A deve atualizar próprio registro`);
  assert.equal(evaluate(rls.update, privadaA, USER_B), false, `${entity}: B não pode atualizar registro de A`);
  assert.equal(evaluate(rls.delete, privadaA, USER_A), true, `${entity}: A deve excluir próprio registro`);
  assert.equal(evaluate(rls.delete, privadaA, USER_B), false, `${entity}: B não pode excluir registro de A`);

  assert.equal(evaluate(rls.create, privadaA, USER_A), true, `${entity}: A deve criar registro privado próprio`);
  assert.equal(evaluate(rls.create, privadaA, USER_B), false, `${entity}: B não pode criar registro declarando A como dono`);
  assert.equal(evaluate(rls.create, base, USER_A), false, `${entity}: usuário comum não pode criar registro base`);
  assert.equal(evaluate(rls.create, base, ADMIN), true, `${entity}: admin deve criar registro base`);
  assert.equal(evaluate(rls.read, privadaA, ADMIN), true, `${entity}: admin deve ler qualquer registro`);
}

console.log(`OK: matriz RLS Usuário A × Usuário B aprovada nas ${entities.length} entidades-filhas.`);
