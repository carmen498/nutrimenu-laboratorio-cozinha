import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const mode = url.searchParams.get('mode') || 'dry_run';
    const apply = mode === 'apply';
    if (mode === 'recalc') {
      const rec = await base44.asServiceRole.functions.invoke('normalizarCustosReceitas', { dry_run: false, somente_incompletas: true });
      return Response.json({ mode: 'recalc', recalculo: rec?.data ?? rec });
    }
    if (mode === 'san') {
      const sanOnly = await base44.asServiceRole.functions.invoke('sanearCustosPendentes', { dry_run: true });
      return Response.json({ mode: 'san', saneamento: sanOnly?.data ?? sanOnly });
    }
    const san = await base44.asServiceRole.functions.invoke('sanearCustosPendentes', { dry_run: !apply });
    const sanData = san?.data ?? san;
    let syncData: any = null;
    let preparacoesData: any = null;
    let recData: any = null;
    if (apply) {
      const prep = await base44.asServiceRole.functions.invoke('sincronizarSubreceita', { migrar_preparacoes_exatas: true, dry_run: false });
      preparacoesData = prep?.data ?? prep;
      const sync = await base44.asServiceRole.functions.invoke('sincronizarSubreceita', { todos_desatualizados: true, dry_run: false });
      syncData = sync?.data ?? sync;
      const rec = await base44.asServiceRole.functions.invoke('normalizarCustosReceitas', { dry_run: false, somente_incompletas: true });
      recData = rec?.data ?? rec;
    } else {
      const prep = await base44.asServiceRole.functions.invoke('sincronizarSubreceita', { migrar_preparacoes_exatas: true, dry_run: true });
      preparacoesData = prep?.data ?? prep;
      const rec = await base44.asServiceRole.functions.invoke('normalizarCustosReceitas', { dry_run: true, somente_incompletas: true });
      recData = rec?.data ?? rec;
    }
    return Response.json({ mode: apply ? 'apply' : 'dry_run', saneamento: sanData, preparacoes: preparacoesData, sincronizacao: syncData, recalculo: recData });
  } catch (error: any) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
