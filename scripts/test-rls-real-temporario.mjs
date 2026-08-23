import crypto from 'node:crypto';

const APP='6a2b263c4c1cb1e47d54d8b7';
const API='https://base44.app/api';
const MAIL='https://api.mail.gw';
const PREFIX='rls-homolog-20260823-a93f7c2e';
const BASE_RECEITA='6a7facf4f7cbf92a174bb157';
const BASE_CARDAPIO='6a84ae7b924cbd3727364dac';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const rand=()=>crypto.randomBytes(18).toString('base64url')+'Aa1!';
const results=[];

async function jf(url,opt={}){const r=await fetch(url,opt);const t=await r.text();let d=null;try{d=t?JSON.parse(t):null}catch{d=t}return{status:r.status,ok:r.ok,data:d}}
async function api(path,{method='GET',token,body}={}){const h={'X-App-Id':APP,Accept:'application/json'};if(token)h.Authorization=`Bearer ${token}`;if(body!==undefined)h['Content-Type']='application/json';return jf(`${API}${path}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)})}
function check(name,pass,detail=''){results.push({name,pass,detail})}

async function mailSetup(address){const password=rand();let r=await jf(`${MAIL}/accounts`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,password})});if(!r.ok)throw new Error(`mail account ${r.status}`);await sleep(500);const id=r.data.id;r=await jf(`${MAIL}/token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,password})});if(!r.ok||!r.data?.token)throw new Error(`mail token ${r.status}`);return{id,address,password,token:r.data.token}}
async function waitOtp(mail){for(let i=0;i<35;i++){const l=await jf(`${MAIL}/messages?page=1`,{headers:{Authorization:`Bearer ${mail.token}`}});for(const m of l.data?.['hydra:member']||[]){const f=await jf(`${MAIL}/messages/${m.id}`,{headers:{Authorization:`Bearer ${mail.token}`}});const code=JSON.stringify(f.data||{}).match(/\b\d{6}\b/)?.[0];if(code)return code}await sleep(3000)}throw new Error('OTP não recebido')}
async function createUser(label,domain){const mail=await mailSetup(`${PREFIX}-${label}@${domain}`);const password=rand();let r=await api(`/apps/${APP}/auth/register`,{method:'POST',body:{email:mail.address,password}});if(!r.ok)throw new Error(`${label} register ${r.status}`);const otp=await waitOtp(mail);r=await api(`/apps/${APP}/auth/verify-otp`,{method:'POST',body:{email:mail.address,otp_code:otp}});if(!r.ok)throw new Error(`${label} verify ${r.status}`);let token=r.data?.access_token;if(!token){r=await api(`/apps/${APP}/auth/login`,{method:'POST',body:{email:mail.address,password}});if(!r.ok||!r.data?.access_token)throw new Error(`${label} login ${r.status}`);token=r.data.access_token}const me=await api(`/apps/${APP}/entities/User/me`,{token});if(!me.ok||!me.data?.id)throw new Error(`${label} me ${me.status}`);await api(`/apps/${APP}/entities/User/me`,{method:'PUT',token,body:{nome_completo:`RLS TEST ${label.toUpperCase()}`}});return{label,mail,token,user:me.data,created:[]}}
async function create(u,entity,payload){const r=await api(`/apps/${APP}/entities/${entity}`,{method:'POST',token:u.token,body:payload});check(`${u.label} cria ${entity}`,r.ok,`HTTP ${r.status}`);if(r.ok&&r.data?.id)u.created.push({entity,id:r.data.id});return r.data}
async function cross(entity,a,b,A,B,patch){for(const [owner,other,row] of [[A,B,a],[B,A,b]]){if(!row?.id)continue;let r=await api(`/apps/${APP}/entities/${entity}/${row.id}`,{token:owner.token});check(`${owner.label} lê próprio ${entity}`,r.ok,`HTTP ${r.status}`);r=await api(`/apps/${APP}/entities/${entity}/${row.id}`,{token:other.token});check(`${other.label} NÃO lê ${entity} de ${owner.label}`,!r.ok,`HTTP ${r.status}`);r=await api(`/apps/${APP}/entities/${entity}/${row.id}`,{method:'PUT',token:other.token,body:patch});check(`${other.label} NÃO altera ${entity} de ${owner.label}`,!r.ok,`HTTP ${r.status}`);r=await api(`/apps/${APP}/entities/${entity}/${row.id}`,{method:'DELETE',token:other.token});check(`${other.label} NÃO exclui ${entity} de ${owner.label}`,!r.ok,`HTTP ${r.status}`);const q=encodeURIComponent(JSON.stringify({id:row.id}));r=await api(`/apps/${APP}/entities/${entity}?q=${q}`,{token:other.token});const rows=Array.isArray(r.data)?r.data:(r.data?.entities||[]);check(`${other.label} não encontra ${entity} de ${owner.label} em filtro`,r.ok&&!rows.some(x=>x.id===row.id),`HTTP ${r.status}`)}}

let A,B;
try{
 const d=await jf(`${MAIL}/domains?page=1`);const domain=d.data?.['hydra:member']?.find(x=>x.isActive)?.domain;if(!domain)throw new Error('sem domínio temporário');
 A=await createUser('a',domain);await sleep(1200);B=await createUser('b',domain);
 check('duas sessões autenticadas independentes',A.user.id!==B.user.id,'2 IDs distintos');
 for(const u of[A,B]){let r=await api(`/apps/${APP}/entities/Receita/${BASE_RECEITA}`,{token:u.token});check(`${u.label} lê Receita base`,r.ok&&r.data?.is_base===true,`HTTP ${r.status}`);r=await api(`/apps/${APP}/entities/Cardapio/${BASE_CARDAPIO}`,{token:u.token});check(`${u.label} lê Cardapio base`,r.ok&&r.data?.is_base===true,`HTTP ${r.status}`)}
 const recA=await create(A,'Receita',{nome:'RLS PRIVADA A',is_base:false,usuario_dono_id:A.user.id,linhagem_tipo:'autoral',linhagem_versao:1,linhagem_status:'canonica'});
 const recB=await create(B,'Receita',{nome:'RLS PRIVADA B',is_base:false,usuario_dono_id:B.user.id,linhagem_tipo:'autoral',linhagem_versao:1,linhagem_status:'canonica'});
 const cardA=await create(A,'Cardapio',{nome:'RLS CARD A',tipo:'personalizado',is_base:false,usuario_dono_id:A.user.id});
 const cardB=await create(B,'Cardapio',{nome:'RLS CARD B',tipo:'personalizado',is_base:false,usuario_dono_id:B.user.id});
 const planA=await create(A,'Planejamento',{nome:'RLS PLAN A',tipo_planejamento:'Outro',tipo_servico:'Outro'});const planB=await create(B,'Planejamento',{nome:'RLS PLAN B',tipo_planejamento:'Outro',tipo_servico:'Outro'});
 const listA=await create(A,'ListaCompras',{nome:'RLS LISTA A'});const listB=await create(B,'ListaCompras',{nome:'RLS LISTA B'});
 const pcA=await create(A,'PerCapitaUsuario',{prep_nome:'RLS PC A',per_capita_g:100,original_g:0});const pcB=await create(B,'PerCapitaUsuario',{prep_nome:'RLS PC B',per_capita_g:110,original_g:0});
 await cross('Receita',recA,recB,A,B,{nota:'INVASAO'});await cross('Cardapio',cardA,cardB,A,B,{observacoes:'INVASAO'});await cross('Planejamento',planA,planB,A,B,{nome:'INVASAO'});await cross('ListaCompras',listA,listB,A,B,{nome:'INVASAO'});await cross('PerCapitaUsuario',pcA,pcB,A,B,{per_capita_g:999});
 let r=await api(`/apps/${APP}/entities/Receita`,{method:'POST',token:B.token,body:{nome:'RLS SPOOF OWNER',is_base:false,usuario_dono_id:A.user.id}});check('B NÃO cria Receita fingindo ser A',!r.ok,`HTTP ${r.status}`);
 r=await api(`/apps/${APP}/entities/Receita`,{method:'POST',token:A.token,body:{nome:'RLS SPOOF BASE',is_base:true,usuario_dono_id:''}});check('A NÃO cria Receita base',!r.ok,`HTTP ${r.status}`);
 const defs=[
 ['IngredienteReceita',recA,recB,(p,u)=>({receita_id:p.id,tipo:'grupo',titulo_grupo:`RLS ${u.label}`,is_base:false,usuario_dono_id:u.user.id}),{ordem:99}],
 ['ReceitaTag',recA,recB,(p,u)=>({receita_id:p.id,tag_id:`rls-tag-${u.label}`,tag_nome:'RLS',is_base:false,usuario_dono_id:u.user.id}),{tag_nome:'INVASAO'}],
 ['InsumoReceita',recA,recB,(p,u)=>({receita_id:p.id,quantidade:1,is_base:false,usuario_dono_id:u.user.id}),{quantidade:99}],
 ['IngredienteEsquecidoReceita',recA,recB,(p,u)=>({receita_id:p.id,nome:`RLS ${u.label}`,is_base:false,usuario_dono_id:u.user.id}),{nome:'INVASAO'}],
 ['CardapioReceita',cardA,cardB,(p,u)=>({cardapio_id:p.id,receita_id:u.label==='a'?recA.id:recB.id,receita_nome:'RLS',is_base:false,usuario_dono_id:u.user.id}),{ordem:99}],
 ['CardapioInsumo',cardA,cardB,(p,u)=>({cardapio_id:p.id,nome:'RLS',quantidade:1,is_base:false,usuario_dono_id:u.user.id}),{nome:'INVASAO'}],
 ['CardapioTag',cardA,cardB,(p,u)=>({cardapio_id:p.id,tag_id:`rls-card-tag-${u.label}`,tag_nome:'RLS',is_base:false,usuario_dono_id:u.user.id}),{tag_nome:'INVASAO'}]];
 for(const[entity,pA,pB,mk,patch]of defs){if(!pA?.id||!pB?.id)continue;const a=await create(A,entity,mk(pA,A));const b=await create(B,entity,mk(pB,B));await cross(entity,a,b,A,B,patch)}
 if(recA?.id){r=await api(`/apps/${APP}/entities/IngredienteReceita`,{method:'POST',token:B.token,body:{receita_id:recA.id,tipo:'grupo',titulo_grupo:'RLS SPOOF',is_base:false,usuario_dono_id:A.user.id}});check('B NÃO cria filho declarando A como dono',!r.ok,`HTTP ${r.status}`)}
}catch(e){check('execução do teste',false,String(e?.message||e))}
finally{for(const u of[A,B].filter(Boolean)){for(const x of[...u.created].reverse()){try{await api(`/apps/${APP}/entities/${x.entity}/${x.id}`,{method:'DELETE',token:u.token})}catch{}}try{await jf(`${MAIL}/accounts/${u.mail.id}`,{method:'DELETE',headers:{Authorization:`Bearer ${u.mail.token}`}})}catch{}}}
const failed=results.filter(x=>!x.pass);console.log(JSON.stringify({summary:{total:results.length,passed:results.length-failed.length,failed:failed.length},failures:failed,checks:results},null,2));process.exitCode=failed.length?2:0;
