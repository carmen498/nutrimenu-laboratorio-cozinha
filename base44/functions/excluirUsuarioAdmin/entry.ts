import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const EMAIL_PROTEGIDO = "carmen@nutrimenu.com.br";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { usuario_ids } = body;

    if (!Array.isArray(usuario_ids) || usuario_ids.length === 0) {
      return Response.json({ error: "Lista de usuários inválida" }, { status: 400 });
    }

    const resultados: any[] = [];

    for (const userId of usuario_ids) {
      try {
        const usuario = await base44.asServiceRole.entities.User.get(userId);
        if (!usuario) {
          resultados.push({ userId, erro: "Usuário não encontrado" });
          continue;
        }

        if (userId === admin.id) {
          resultados.push({ userId, erro: "Não é possível excluir a própria conta logada" });
          continue;
        }

        if (usuario.email === EMAIL_PROTEGIDO) {
          resultados.push({ userId, erro: "Conta protegida — exclusão não permitida" });
          continue;
        }

        const pagamentos = await base44.asServiceRole.entities.Pagamento.filter({ usuario_id: userId });
        const temAprovado = (pagamentos || []).some((p: any) => p.status === "approved");
        if (temAprovado) {
          resultados.push({ userId, nome: usuario.nome_completo || usuario.full_name, erro: "Existe pagamento aprovado e não estornado. Estorne no Mercado Pago antes de apagar." });
          continue;
        }

        const contagem: any = { pagamentos: 0, acessos: 0, logs_email: 0, receitas: 0, cardapios: 0, eventos: 0, fichas: 0 };

        // 1. Pagamentos vinculados
        await base44.asServiceRole.entities.Pagamento.deleteMany({ usuario_id: userId });
        contagem.pagamentos = pagamentos?.length || 0;

        // 2. Acessos concedidos (Guia ZR + Laboratório de Custos)
        const acessosZR = await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.filter({ user_id: userId });
        await base44.asServiceRole.entities.AcessoGuiaTecnicoZR.deleteMany({ user_id: userId });
        const acessosCustos = await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: userId });
        await base44.asServiceRole.entities.AcessoLaboratorioCustosUsuario.deleteMany({ user_id: userId });
        contagem.acessos = (acessosZR?.length || 0) + (acessosCustos?.length || 0);

        // 3. Logs de e-mail e WhatsApp
        const logsEmail = await base44.asServiceRole.entities.LogEmail.filter({ usuario_id: userId });
        await base44.asServiceRole.entities.LogEmail.deleteMany({ usuario_id: userId });
        await base44.asServiceRole.entities.LogWhatsapp.deleteMany({ usuario_id: userId });
        await base44.asServiceRole.entities.PedidoDesistencia.deleteMany({ usuario_id: userId });
        contagem.logs_email = logsEmail?.length || 0;

        // 4. Conteúdo criado — consultar receitas e cardápios antes de deletar filhos
        const receitasCreator = await base44.asServiceRole.entities.Receita.filter({ created_by_id: userId });
        const receitasOwner = await base44.asServiceRole.entities.Receita.filter({ usuario_dono_id: userId });
        const receitaIds = [...new Set([...(receitasCreator || []).map((r: any) => r.id), ...(receitasOwner || []).map((r: any) => r.id)])];
        contagem.receitas = receitaIds.length;

        const cardapiosCreator = await base44.asServiceRole.entities.Cardapio.filter({ created_by_id: userId });
        const cardapiosOwner = await base44.asServiceRole.entities.Cardapio.filter({ usuario_dono_id: userId });
        const cardapioIds = [...new Set([...(cardapiosCreator || []).map((c: any) => c.id), ...(cardapiosOwner || []).map((c: any) => c.id)])];
        contagem.cardapios = cardapioIds.length;

        // 4a. Filhos das receitas (ingrediente/insumo)
        for (const rid of receitaIds) {
          await base44.asServiceRole.entities.IngredienteReceita.deleteMany({ receita_id: rid });
          await base44.asServiceRole.entities.InsumoReceita.deleteMany({ receita_id: rid });
        }

        // 4b. Filhos dos cardápios
        for (const cid of cardapioIds) {
          await base44.asServiceRole.entities.CardapioReceita.deleteMany({ cardapio_id: cid });
          await base44.asServiceRole.entities.CardapioInsumo.deleteMany({ cardapio_id: cid });
        }

        // 4c. Fichas de cálculo de custo
        const calculos = await base44.asServiceRole.entities.CalculoCusto.filter({ user_id: userId });
        await base44.asServiceRole.entities.CalculoCusto.deleteMany({ user_id: userId });
        contagem.fichas = calculos?.length || 0;

        // 4d. Receitas
        await base44.asServiceRole.entities.Receita.deleteMany({ created_by_id: userId });
        await base44.asServiceRole.entities.Receita.deleteMany({ usuario_dono_id: userId });

        // 4e. Cardápios
        await base44.asServiceRole.entities.Cardapio.deleteMany({ created_by_id: userId });
        await base44.asServiceRole.entities.Cardapio.deleteMany({ usuario_dono_id: userId });

        // 4f. Eventos/planejamentos
        const planejamentos = await base44.asServiceRole.entities.Planejamento.filter({ created_by_id: userId });
        await base44.asServiceRole.entities.Planejamento.deleteMany({ created_by_id: userId });
        contagem.eventos = planejamentos?.length || 0;

        // 4g. Dados pessoais do usuário
        await base44.asServiceRole.entities.IngredienteUsuario.deleteMany({ user_id: userId });
        await base44.asServiceRole.entities.PerCapitaUsuario.deleteMany({ created_by_id: userId });

        // 5. Usuário (por último)
        await base44.asServiceRole.entities.User.delete(userId);

        // Registro de auditoria
        await base44.asServiceRole.entities.LogExclusaoUsuario.create({
          usuario_excluido_id: userId,
          usuario_excluido_nome: usuario.nome_completo || usuario.full_name || "—",
          usuario_excluido_email: usuario.email || "—",
          excluido_por_id: admin.id,
          excluido_por_nome: admin.nome_completo || admin.full_name || "—",
          excluido_por_email: admin.email || "—",
          pagamentos_apagados: contagem.pagamentos,
          acessos_apagados: contagem.acessos,
          logs_email_apagados: contagem.logs_email,
          receitas_apagadas: contagem.receitas,
          cardapios_apagados: contagem.cardapios,
          eventos_apagados: contagem.eventos,
          fichas_apagadas: contagem.fichas,
        });

        resultados.push({ userId, nome: usuario.nome_completo || usuario.full_name, sucesso: true, contagem });
      } catch (err: any) {
        resultados.push({ userId, erro: err.message });
      }
    }

    return Response.json({ resultados });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}