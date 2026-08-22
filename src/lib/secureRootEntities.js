import { base44 } from '@/api/base44Client';
import {
  construirLinhagemRaiz,
  removerMetadadosLinhagem,
} from '@/lib/receitaLineage';

async function usuarioAtual() {
  const user = await base44.auth.me();
  if (!user) throw new Error('Unauthorized');
  return user;
}

/**
 * Criação canônica de Receita — Fase 9.
 *
 * Regras:
 * - Admin pode criar catálogo (default) ou receita pessoal explicitamente.
 * - Usuário comum SEMPRE cria receita pessoal: is_base=false + usuario_dono_id.
 * - Campos de linhagem recebidos por spread são descartados para impedir que uma
 *   duplicação herde acidentalmente a genealogia da origem.
 * - Uma derivação deliberada (fork/personalização) deve passar __linhagem.
 * - Toda receita raiz recebe receita_raiz_id apontando para o próprio ID.
 */
export async function criarReceitaSegura(payload = {}) {
  const user = await usuarioAtual();
  const isAdmin = user.role === 'admin';
  const isBase = isAdmin ? (payload.is_base ?? true) : false;
  const dados = removerMetadadosLinhagem(payload);
  const linhagem = payload.__linhagem || construirLinhagemRaiz({ isBase });

  const dadosCriacao = {
    ...dados,
    ...linhagem,
    ...(isAdmin ? { is_base: isBase } : {}),
    usuario_dono_id: isBase ? '' : user.id,
  };

  if (!isBase) {
    dadosCriacao.data_personalizacao = payload.data_personalizacao || new Date().toISOString();
  }

  let criada = await base44.entities.Receita.create(dadosCriacao);

  if (!criada.receita_raiz_id) {
    const atualizada = await base44.entities.Receita.update(criada.id, {
      receita_raiz_id: criada.id,
      linhagem_geracao: 0,
    });
    criada = atualizada || { ...criada, receita_raiz_id: criada.id, linhagem_geracao: 0 };
  }

  return criada;
}

export async function criarCardapioSeguro(payload = {}) {
  const user = await usuarioAtual();
  if (user.role === 'admin') {
    return base44.entities.Cardapio.create({
      ...payload,
      is_base: payload.is_base ?? true,
    });
  }

  const { is_base: _ignorado, ...dadosPessoais } = payload;
  return base44.entities.Cardapio.create({
    ...dadosPessoais,
    usuario_dono_id: user.id,
    data_personalizacao: payload.data_personalizacao || new Date().toISOString(),
  });
}
