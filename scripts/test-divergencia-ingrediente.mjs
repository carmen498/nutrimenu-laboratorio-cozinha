import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

execFileSync('npx', [
  'esbuild', 'base44/shared/divergenciaIngrediente.ts', '--platform=node', '--format=esm',
  '--outfile=/tmp/divergenciaIngrediente-test.mjs',
], { stdio: 'ignore' });
const mod = await import(`${pathToFileURL('/tmp/divergenciaIngrediente-test.mjs').href}?v=${Date.now()}`);
const { construirIndiceNomes, construirIndiceSinonimos, classificarDivergenciaIngrediente } = mod;

const ingredientes = [
  { id: 'frango', nome: 'Frango, ave inteira' },
  { id: 'marg', nome: 'Margarina, com sal' },
  { id: 'camP', nome: 'Camarão p' },
  { id: 'camM', nome: 'Camarão m' },
  { id: 'sal', nome: 'Sal' },
];
const ingredienteMap = new Map(ingredientes.map((i) => [i.id, i]));
const nomeIndex = construirIndiceNomes(ingredientes);
const sinonimoIndex = construirIndiceSinonimos([
  { ingrediente_id: 'frango', sinonimo: 'Frango' },
  { ingrediente_id: 'marg', sinonimo: 'Margarina' },
  { ingrediente_id: 'camP', sinonimo: 'Camarão para recheio' },
]);

const frango = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'frango', ingrediente_nome: 'Frango' },
  ingredienteAtual: ingredienteMap.get('frango'), ingredienteMap, nomeIndex, sinonimoIndex,
});
assert.equal(frango.acao, 'normalizar_nome_cache');
assert.equal(frango.destino_id, 'frango');

const marg = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'marg', ingrediente_nome: 'Margarina' },
  ingredienteAtual: ingredienteMap.get('marg'), ingredienteMap, nomeIndex, sinonimoIndex,
});
assert.equal(marg.acao, 'normalizar_nome_cache');

const camarao = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'camM', ingrediente_nome: 'Camarão para recheio' },
  ingredienteAtual: ingredienteMap.get('camM'), ingredienteMap, nomeIndex, sinonimoIndex,
});
assert.equal(camarao.acao, 'reapontar_id_exato');
assert.equal(camarao.destino_id, 'camP');

const manual = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'camM', ingrediente_nome: 'Camarão' },
  ingredienteAtual: ingredienteMap.get('camM'), ingredienteMap, nomeIndex, sinonimoIndex,
});
assert.equal(manual.acao, 'manual');
assert.equal(manual.motivo, 'sem_evidencia_exata');

const semDivergencia = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'sal', ingrediente_nome: 'Sál' },
  ingredienteAtual: ingredienteMap.get('sal'), ingredienteMap, nomeIndex, sinonimoIndex,
});
assert.equal(semDivergencia.divergente, false);

console.log('Fase 10.4.1: classificação determinística ID × nome OK');
