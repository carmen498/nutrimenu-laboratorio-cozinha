import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const USER_ID='6a8c4db1844fdf64672f1f5c';
const EMAIL='nutrimenu-e2e-mt7av3joda2596@emalupe.com';

export default async function(req:Request):Promise<Response>{
  const base44=createClientFromRequest(req);
  const pagamentos=await base44.asServiceRole.entities.Pagamento.filter({usuario_id:USER_ID});
  const pagamentoIds=(pagamentos||[]).map((p:any)=>p.id);
  const orderIds=(pagamentos||[]).map((p:any)=>p.mercadopago_order_id).filter(Boolean);
  let webhookLogs:any[]=[];
  for(const pid of pagamentoIds){ webhookLogs.push(...(await base44.asServiceRole.entities.LogWebhookMercadoPago.filter({pagamento_id:pid}).catch(()=>[]))); }
  for(const oid of orderIds){ webhookLogs.push(...(await base44.asServiceRole.entities.LogWebhookMercadoPago.filter({data_id:oid}).catch(()=>[]))); }
  const emailLogs=await base44.asServiceRole.entities.LogEmail.filter({usuario_id:USER_ID}).catch(()=>[]);
  const whatsappLogs=await base44.asServiceRole.entities.LogWhatsapp.filter({usuario_id:USER_ID}).catch(()=>[]);
  const uniq=(xs:any[])=>Array.from(new Map(xs.map((x:any)=>[x.id,x])).values());
  for(const x of uniq(webhookLogs)) await base44.asServiceRole.entities.LogWebhookMercadoPago.delete((x as any).id).catch(()=>{});
  for(const x of emailLogs||[]) await base44.asServiceRole.entities.LogEmail.delete(x.id).catch(()=>{});
  for(const x of whatsappLogs||[]) await base44.asServiceRole.entities.LogWhatsapp.delete(x.id).catch(()=>{});
  for(const p of pagamentos||[]) await base44.asServiceRole.entities.Pagamento.delete(p.id).catch(()=>{});
  const users=await base44.asServiceRole.entities.User.filter({email:EMAIL}).catch(()=>[]);
  for(const u of users||[]) if(u.id===USER_ID) await base44.asServiceRole.entities.User.delete(u.id).catch(()=>{});
  return Response.json({ok:true,pagamentos:(pagamentos||[]).length,webhook_logs:uniq(webhookLogs).length,email_logs:(emailLogs||[]).length,whatsapp_logs:(whatsappLogs||[]).length,users:(users||[]).filter((u:any)=>u.id===USER_ID).length});
}
