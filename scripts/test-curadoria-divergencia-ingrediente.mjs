import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

execFileSync('npx', ['esbuild', 'base44/shared/curadoriaDivergenciaIngrediente.ts', '--bundle', '--platform=node', '--format=esm', '--outfile=/tmp/curadoria-divergencia-test.mjs'], { stdio: 'ignore' });
const mod = await import(`${pathToFileURL('/tmp/curadoria-divergencia-test.mjs').href}?v=${Date.now()}`);
const { validarDecisaoDivergencia, scoreCandidatoDivergencia, sugestoesDivergencia } = mod;

assert.match(validarDecisaoDivergencia({ decisao: 'reapontar_ingrediente', ingredienteOrigemId: 'a', observacao: 'justificativa' }), /Selecione/);
assert.match(validarDecisaoDivergencia({ decisao: 'reapontar_ingrediente', ingredienteOrigemId: 'a', ingredienteDestinoId: 'a', observacao: 'justificativa' }), /mesmo ID/);
assert.match(validarDecisaoDivergencia({ decisao: 'confirmar_id_atual', ingredienteOrigemId: 'a', observacao: 'curta' }), /justificativa/);
assert.equal(validarDecisaoDivergencia({ decisao: 'confirmar_id_atual', ingredienteOrigemId: 'a', observacao: 'sinônimo culinário válido' }), '');
assert.equal(validarDecisaoDivergencia({ decisao: 'manter_pendente', ingredienteOrigemId: 'a', observacao: '' }), '');

const scoreExato = scoreCandidatoDivergencia('Creme de leite', { nome: 'Creme de leite' });
const scoreParcial = scoreCandidatoDivergencia('Creme de leite', { nome: 'Creme de leite fresco' });
assert.equal(scoreExato, 100);
assert.ok(scoreParcial > 0 && scoreParcial < 100);

const ingredientes = [
  { id: 'a', nome: 'Abóbora, qualquer tipo', categoria: 'Verduras e Hortaliças' },
  { id: 'b', nome: 'Moranga/abóbora', categoria: 'Verduras e Hortaliças' },
  { id: 'c', nome: 'Abobrinha verde', categoria: 'Verduras e Hortaliças' },
];
const sugestoes = sugestoesDivergencia('Abóbora', ingredientes, 'Verduras e Hortaliças', 'c', [{ id: 'b', nome: 'Moranga/abóbora' }]);
assert.equal(sugestoes[0].id, 'b');
assert.equal(sugestoes[0].evidencia, 'exata');
assert.equal(sugestoes[0].score, 100);

console.log('Fase 10.4.2: curadoria assistida ID × nome OK');
