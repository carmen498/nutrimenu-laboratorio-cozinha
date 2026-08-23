import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

execFileSync('npx', [
  'esbuild', 'base44/shared/divergenciaIngrediente.ts', '--platform=node', '--format=esm',
  '--outfile=/tmp/divergenciaIngrediente-test.mjs',
], { stdio: 'ignore' });
const mod = await import(`${pathToFileURL('/tmp/divergenciaIngrediente-test.mjs').href}?v=${Date.now()}`);
const { construirIndiceNomes, construirIndiceSinonimos, construirIndiceAliasesSeguros, classificarDivergenciaIngrediente } = mod;

const ingredientes = [
  { id: 'frango', nome: 'Frango, ave inteira' },
  { id: 'marg', nome: 'Margarina, com sal' },
  { id: 'camP', nome: 'Camarão p' },
  { id: 'camM', nome: 'Camarão m' },
  { id: 'sal', nome: 'Sal' },
  { id: 'presuntoCanon', nome: 'Embutido, presunto' },
  { id: 'presuntoAtual', nome: 'Presunto cozido' },
  { id: 'abobGen', nome: 'Abóbora, qualquer tipo' },
  { id: 'abobMor', nome: 'Moranga/abóbora' },
];
const ingredienteMap = new Map(ingredientes.map((i) => [i.id, i]));
const nomeIndex = construirIndiceNomes(ingredientes);
const sinonimoIndex = construirIndiceSinonimos([
  { ingrediente_id: 'frango', sinonimo: 'Frango' },
  { ingrediente_id: 'marg', sinonimo: 'Margarina' },
  { ingrediente_id: 'camP', sinonimo: 'Camarão para recheio' },
  { ingrediente_id: 'abobMor', sinonimo: 'Abóbora' },
]);
const aliasSeguroIndex = construirIndiceAliasesSeguros(nomeIndex);

const frango = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'frango', ingrediente_nome: 'Frango' },
  ingredienteAtual: ingredienteMap.get('frango'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(frango.acao, 'normalizar_nome_cache');
assert.equal(frango.destino_id, 'frango');

const marg = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'marg', ingrediente_nome: 'Margarina' },
  ingredienteAtual: ingredienteMap.get('marg'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(marg.acao, 'normalizar_nome_cache');

const camarao = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'camM', ingrediente_nome: 'Camarão para recheio' },
  ingredienteAtual: ingredienteMap.get('camM'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(camarao.acao, 'manual');
assert.equal(camarao.motivo, 'sinonimo_exato_outro_id_requer_curadoria');

const manual = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'camM', ingrediente_nome: 'Camarão' },
  ingredienteAtual: ingredienteMap.get('camM'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(manual.acao, 'manual');
assert.equal(manual.motivo, 'sem_evidencia_exata');

const semDivergencia = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'sal', ingrediente_nome: 'Sál' },
  ingredienteAtual: ingredienteMap.get('sal'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(semDivergencia.divergente, false);

const presunto = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'presuntoAtual', ingrediente_nome: 'Presunto' },
  ingredienteAtual: ingredienteMap.get('presuntoAtual'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(presunto.acao, 'reapontar_id_exato');
assert.equal(presunto.destino_id, 'presuntoCanon');
assert.equal(presunto.motivo, 'alias_seguro_outro_id');

const aboboraConflito = classificarDivergenciaIngrediente({
  item: { ingrediente_id: 'presuntoAtual', ingrediente_nome: 'Abóbora' },
  ingredienteAtual: ingredienteMap.get('presuntoAtual'), ingredienteMap, nomeIndex, sinonimoIndex, aliasSeguroIndex,
});
assert.equal(aboboraConflito.acao, 'manual');
assert.equal(aboboraConflito.motivo, 'evidencia_exata_conflitante');

console.log('Fase 10.4.1: classificação determinística ID × nome OK');
