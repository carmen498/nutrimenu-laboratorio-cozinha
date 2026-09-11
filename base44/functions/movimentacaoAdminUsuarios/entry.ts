import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Agrega, no servidor, a contagem de receitas/refeições/cardápios/eventos por
// usuário. Antes o admin baixava todas essas entidades no navegador (milhares
// de registros) só para contar — origem principal da lentidão da tela.
async function contar(entity, filtro, chave, mapa) {
  const limite = 500;
  let pagina = 0;
  while (pagina < 60) {
    const registros = filtro
      ? await entity.filter(filtro, '-created_date', limite, pagina * limite)
      : await entity.list('-created_date', limite, pagina * limite);
    for (const registro of registros) {
      const userId = registro.usuario_dono_id || registro.created_by_id;
      if (!userId) continue;
      if (!mapa[userId]) mapa[userId] = { receitas: 0, refeicoes: 0, cardapios: 0, eventos: 0 };
      mapa[userId][chave] += 1;
    }
    if (registros.length < limite) return;
    pagina += 1;
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const entities = base44.asServiceRole.entities;
    const mapa = {};
    await contar(entities.Receita, { is_base: false }, 'receitas', mapa);
    await contar(entities.Cardapio, { is_base: false }, 'refeicoes', mapa);
    await contar(entities.CardapioPeriodo, null, 'cardapios', mapa);
    await contar(entities.Planejamento, null, 'eventos', mapa);

    return Response.json({ movimentacao: mapa });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}