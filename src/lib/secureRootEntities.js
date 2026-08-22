import { base44 } from '@/api/base44Client';

async function usuarioAtual() {
  const user = await base44.auth.me();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function criarReceitaSegura(payload = {}) {
  const user = await usuarioAtual();
  if (user.role === 'admin') {
    return base44.entities.Receita.create(payload);
  }

  return base44.entities.Receita.create({
    ...payload,
    is_base: false,
    usuario_dono_id: user.id,
    data_personalizacao: payload.data_personalizacao || new Date().toISOString(),
  });
}

export async function criarCardapioSeguro(payload = {}) {
  const user = await usuarioAtual();
  if (user.role === 'admin') {
    return base44.entities.Cardapio.create(payload);
  }

  return base44.entities.Cardapio.create({
    ...payload,
    is_base: false,
    usuario_dono_id: user.id,
    data_personalizacao: payload.data_personalizacao || new Date().toISOString(),
  });
}
