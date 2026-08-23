import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

execFileSync('npx', [
  'esbuild', 'base44/shared/custoAssinaturaReceitas.ts', '--bundle', '--platform=node', '--format=esm',
  '--outfile=/tmp/custoAssinaturaReceitas-test.mjs',
], { stdio: 'ignore' });
const { criarGeradorAssinaturaCustoReceita } = await import(`${pathToFileURL('/tmp/custoAssinaturaReceitas-test.mjs').href}?v=${Date.now()}`);

const receitaPai = { id: 'pai', nome: 'PAI', porcoes_base: 10, peso_pos_preparo_total: 1000, unidade_base: 'g', is_base: true };
const receitaFonte = { id: 'fonte', nome: 'FONTE', porcoes_base: 5, peso_pos_preparo_total: 500, unidade_base: 'g', is_base: true, updated_date: '2026-01-01' };
const ingrediente = { id: 'ing', nome: 'Cebola', preco_por_g_rs: 0.01, fator_correcao: 1.1 };

const receitaMap = new Map([['pai', receitaPai], ['fonte', receitaFonte]]);
const insumosMap = new Map([['pai', []], ['fonte', []]]);
const esquecidosMap = new Map([['pai', []], ['fonte', []]]);
const ingredienteMap = new Map([['ing', ingrediente]]);

const marker = { id: 'm', receita_id: 'pai', tipo: 'subreceita', subreceita_id: 'fonte', quantidade_por_porcao: 10, unidade_quantidade: 'g' };
const cache = { id: 'c', receita_id: 'pai', tipo: 'ingrediente', ingrediente_id: 'ing', ingrediente_nome: 'Cebola', quantidade_por_porcao: 2, fator_correcao_override: 0, subreceita_parent_id: 'm', subreceita_cache: true, subreceita_cache_versao: 2 };
const fonteItem = { id: 'fi', receita_id: 'fonte', tipo: 'ingrediente', ingrediente_id: 'ing', ingrediente_nome: 'Cebola', quantidade_por_porcao: 20, fator_correcao_override: 0 };
const itensMap = new Map([['pai', [marker, cache]], ['fonte', [fonteItem]]]);

const criar = () => criarGeradorAssinaturaCustoReceita({
  receitaMap, itensMap, insumosMap, esquecidosMap, ingredienteMap,
  resolverPrecoPorReceita: (_receita, ing) => ing?.preco_por_g_rs || 0,
});

const sig1 = criar()(receitaPai);
receitaFonte.updated_date = '2099-01-01';
const sigMeta = criar()(receitaPai);
assert.equal(sig1, sigMeta, 'timestamp da sub-receita não pode alterar assinatura de custo');

fonteItem.quantidade_por_porcao = 21;
const sig2 = criar()(receitaPai);
assert.notEqual(sig1, sig2, 'mudança de composição da sub-receita deve alterar assinatura do pai mesmo antes do rebuild do cache');

fonteItem.quantidade_por_porcao = 20;
receitaFonte.peso_pos_preparo_total = 450;
const sig3 = criar()(receitaPai);
assert.notEqual(sig1, sig3, 'mudança de rendimento da sub-receita deve alterar assinatura do pai');

console.log('Fase 10.4: dependência semântica de sub-receita OK');
