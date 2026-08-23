import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { gerarAssinaturaCusto as gerarFront } from '../src/lib/custoAssinatura.js';

execFileSync('npx', ['esbuild', 'base44/shared/custoAssinatura.ts', '--platform=node', '--format=esm', '--outfile=/tmp/custoAssinatura-backend.mjs'], { stdio: 'ignore' });
const { gerarAssinaturaCusto: gerarBack } = await import(`${pathToFileURL('/tmp/custoAssinatura-backend.mjs').href}?v=${Date.now()}`);

const ingredientes = {
  ing1: { id: 'ing1', nome: 'Cebola', preco_por_g_rs: 0.01, fator_correcao: 1.1 },
  ing2: { id: 'ing2', nome: 'Sal', preco_por_g_rs: 0.002, fator_correcao: 1 },
};
const base = {
  receita: { id: 'r1', nome: 'TESTE', porcoes_base: 10, per_capita_g: 100, unidade_base: 'g', foto_url: 'a.jpg', nota: 'x' },
  itens: [
    { id: 'i1', tipo: 'ingrediente', ingrediente_id: 'ing1', ingrediente_nome: 'Cebola', quantidade_por_porcao: 20, fator_correcao_override: 0 },
    { id: 'i2', tipo: 'ingrediente', ingrediente_id: 'ing2', ingrediente_nome: 'Sal', quantidade_por_porcao: 1, fator_correcao_override: 0 },
    { id: 'g1', tipo: 'grupo', titulo_grupo: 'MOLHO' },
    { id: 's1', tipo: 'subreceita', subreceita_id: 'sub1', quantidade_por_porcao: 5, unidade_quantidade: 'g', subreceita_dependencias_assinatura: 'sub@1', subreceita_sincronizacao_status: 'sincronizada' },
  ],
  insumos: [{ id: 'n1', insumo_id: 'emb1', insumo_nome: 'Embalagem', quantidade: 1, custo_unitario: 0.5, comportamento_custo: 'por_unidade', modelo_custo_versao: 2 }],
  esquecidos: [{ id: 'e1', ingrediente_id: 'ing2', nome: 'Sal', quantidade_g: 2, custo_unitario: 0, custo_total: 0 }],
  contexto: 'global',
  rendimento: 1000,
  resolverIngrediente: (id) => ingredientes[id] || null,
  resolverPreco: (ing) => ing?.preco_por_g_rs || 0,
  resolverAssinaturaSubreceita: (id) => id === 'sub1' ? 'exp-v1-abc' : '',
};

const sig = gerarFront(base);
assert.equal(sig, gerarBack(base), 'frontend/backend devem produzir a mesma assinatura');

const clone = (obj) => structuredClone(obj);
const assinar = (patch) => gerarFront({ ...base, ...patch });

const receitaMeta = { ...base.receita, foto_url: 'outra.jpg', nota: 'mudou', updated_date: '2099-01-01' };
assert.equal(sig, assinar({ receita: receitaMeta }), 'foto/nota/timestamp não podem alterar assinatura');
assert.equal(sig, assinar({ itens: [...base.itens].reverse() }), 'ordem da lista não pode alterar assinatura');

const qtd = clone(base.itens); qtd[0].quantidade_por_porcao = 21;
assert.notEqual(sig, assinar({ itens: qtd }), 'quantidade deve alterar assinatura');
const fc = clone(base.itens); fc[0].fator_correcao_override = 1.2;
assert.notEqual(sig, assinar({ itens: fc }), 'FC deve alterar assinatura');
assert.notEqual(sig, assinar({ rendimento: 950 }), 'rendimento deve alterar assinatura');
const ins = clone(base.insumos); ins[0].custo_unitario = 0.6;
assert.notEqual(sig, assinar({ insumos: ins }), 'custo de insumo deve alterar assinatura');
const sub = clone(base.itens); sub.find((i) => i.tipo === 'subreceita').subreceita_dependencias_assinatura = 'sub@2';
assert.notEqual(sig, assinar({ itens: sub }), 'assinatura da sub-receita deve alterar assinatura');

const ingredientesPreco = { ...ingredientes, ing1: { ...ingredientes.ing1, preco_por_g_rs: 0.02 } };
assert.notEqual(sig, gerarFront({ ...base, resolverIngrediente: (id) => ingredientesPreco[id] || null, resolverPreco: (ing) => ing?.preco_por_g_rs || 0 }), 'preço efetivo deve alterar assinatura');

console.log('Fase 10.4: assinatura canônica de custos OK');
