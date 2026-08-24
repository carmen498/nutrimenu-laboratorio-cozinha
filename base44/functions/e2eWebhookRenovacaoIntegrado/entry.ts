import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { resolverStatusOrderMercadoPago } from '../../shared/statusMercadoPago.ts';
import { ativarPlanoEEnviarEmail } from '../../shared/ativarAssinaturaPagamento.ts';
import { revogarAcessoEstorno } from '../../shared/revogarAcessoEstorno.ts';

const USER_ID='6a8c4db1844fdf64672f1f5c';
const EMAIL='nutrimenu-e2e-mt7av3joda2596@emalupe.com';

async function obterOrder(orderId:string, accessToken:string){
  const r=await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`,{headers:{Authorization:`Bearer ${accessToken}`}});
  const data=await r.json().catch(()=>null);
  return {r,data};
}

export default async function(req:Request):Promise<Response>{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user||user.id!==USER_ID||user.email!==EMAIL) return Response.json({error:'forbidden'},{status:403});
  const body=await req.json().catch(()=>({}));
  const orderId=String(body?.order_id||'');
  if(!orderId) return Response.json({error:'order_id_required'},{status:400});
  const token=secrets.get('MERCADOPAGO_ACCESS_TOKEN_SANDBOX');
  if(body?.acao==='refund'){
    const rr=await fetch(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}/refund`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-Idempotency-Key':crypto.randomUUID()}});
    const rd=await rr.json().catch(()=>null);
    if(!rr.ok) return Response.json({ok:false,refund_http:rr.status,error:rd?.message||rd?.error||'refund_failed'},{status:502});
  }
  const {r,data}=await obterOrder(orderId,token);
  if(!r.ok||!data) return Response.json({error:'order_not_found',http:r.status},{status:502});
  const pagamentoId=data.external_reference;
  const pagamento=pagamentoId?await base44.asServiceRole.entities.Pagamento.get(pagamentoId).catch(()=>null):null;
  if(!pagamento||pagamento.usuario_id!==USER_ID) return Response.json({error:'synthetic_payment_not_found'},{status:404});
  const novoStatus=resolverStatusOrderMercadoPago(data);
  if(novoStatus==='pending') return Response.json({ok:true,status:'pending',idempotent:false,pagamentoId,orderId});
  if(pagamento.status===novoStatus) return Response.json({ok:true,status:novoStatus,idempotent:true,pagamentoId,orderId});
  if(novoStatus==='approved'){
    await base44.asServiceRole.entities.Pagamento.update(pagamento.id,{status:'approved'});
    await ativarPlanoEEnviarEmail(base44,pagamento);
  }else{
    await base44.asServiceRole.entities.Pagamento.update(pagamento.id,{status:novoStatus});
    if(novoStatus==='estornado') await revogarAcessoEstorno(base44,pagamento);
  }
  const atualizado=await base44.asServiceRole.entities.Pagamento.get(pagamento.id);
  const userAtual=await base44.asServiceRole.entities.User.get(USER_ID);
  return Response.json({ok:true,status:atualizado.status,idempotent:false,pagamentoId,orderId,user:{status_assinatura:userAtual.status_assinatura,plano_atual:userAtual.plano_atual,ciclo_renovacao:userAtual.ciclo_renovacao,pagamento_ativo_id:userAtual.pagamento_ativo_id,data_expiracao:userAtual.data_expiracao}});
}
