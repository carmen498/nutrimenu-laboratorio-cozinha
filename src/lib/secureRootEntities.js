import { base44 } from '@/api/base44Client';

async function usuarioAtual() {
  const user = await base44.auth.me();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function criarReceitaSegura(payload = {}) {
  const user = await usuarioAtual();
  if (user.role === 'admin') {
    return base44.entities.Receita.create({
      ...payload,
      is_base: payload.is_base ?? true,
    });
  }

  const { is_base: _ignorado, ...dadosPessoais } = payload;
  return base44.entities.Receita.create({
    ...dadosPessoais,
    usuario_dono_id: user.id,
    data_personalizacao: payload.data_personalizacao || new Date().toISOString(),
  });
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
