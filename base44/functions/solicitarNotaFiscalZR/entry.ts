// Registra o pedido de nota fiscal do Guia Técnico ZR: atualiza os dados
// fiscais do usuário e notifica o administrador por e-mail e WhatsApp.
// A nota é emitida manualmente pelo Nutrimenu — esta function apenas coleta
// e encaminha o pedido, não emite a nota.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { secrets } from "base44:runtime";
import { sendEmailViaResend } from "../../shared/resendEmail.ts";
import { OFERTAS_ZR } from "../../shared/guiaTecnicoZR.ts";
import { DADOS_EMPRESA } from "../../shared/dadosEmpresa.ts";
import { resolverPagadorFiscal } from "../../shared/dadosFiscaisPagador.ts";
import { dataHoraUtcBase44 } from "../../shared/prazoDesistencia.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { pagamento_id, dados } = body;

    if (!pagamento_id) return Response.json({ error: "Pagamento não informado" }, { status: 400 });
    if (!dados) return Response.json({ error: "Dados fiscais não informados" }, { status: 400 });

    const cpfCnpj = String(dados.cpf_cnpj || "").replace(/\D/g, "");
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      return Response.json({ error: "CPF ou CNPJ inválido" }, { status: 400 });
    }
    if (!String(dados.nome_razao || "").trim()) {
      return Response.json({ error: dados.tipo === "pj" ? "Razão social não informada" : "Nome completo não informado" }, { status: 400 });
    }
    if (!dados.email_nf || !dados.cep || !dados.logradouro || !dados.numero || !dados.bairro || !dados.cidade || !dados.estado) {
      return Response.json({ error: "Dados fiscais incompletos" }, { status: 400 });
    }

    // Verifica que o pagamento pertence ao usuário
    const pagamento = await base44.asServiceRole.entities.Pagamento.get(pagamento_id);
    if (!pagamento || pagamento.usuario_id !== user.id) {
      return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }

    // Atualiza os dados fiscais do usuário
    const tipo = dados.tipo === "pj" ? "pj" : "pf";
    const uf = String(dados.estado).toUpperCase().slice(0, 2);
    const cep = String(dados.cep).replace(/\D/g, "");
    const updateData: Record<string, any> = {
      cpf_cnpj: cpfCnpj,
      cep,
      logradouro: dados.logradouro,
      numero: dados.numero,
      complemento: dados.complemento || undefined,
      bairro: dados.bairro,
      cidade: dados.cidade,
      estado: uf,
      cidade_uf: `${dados.cidade}/${uf}`,
      endereco: `${dados.logradouro}, ${dados.numero}${dados.complemento ? `, ${dados.complemento}` : ""} — ${dados.bairro}, ${dados.cidade}/${uf}`,
    };
    if (tipo === "pf") {
      updateData.nome_completo = dados.nome_razao;
    } else {
      updateData.razao_social = dados.nome_razao;
    }
    await base44.asServiceRole.entities.User.update(user.id, updateData);
    const pagadorFiscal = resolverPagadorFiscal({ ...user, ...updateData });
    if (pagadorFiscal.faltando.length) {
      return Response.json({
        error: `Dados fiscais incompletos: ${pagadorFiscal.faltando.join(", ")}.`,
        code: "dados_fiscais_incompletos",
        faltando: pagadorFiscal.faltando,
      }, { status: 409 });
    }

    // Resolve nome do plano e dados da compra para a notificação
    const planoNome = OFERTAS_ZR[pagamento.plano]?.nome || pagamento.plano;
    const valorTxt = `R$ ${Number(pagamento.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    const dataPagamento = dataHoraUtcBase44(pagamento.pago_em || pagamento.created_date);
    const dataTxt = Number.isFinite(dataPagamento.getTime())
      ? `${dataPagamento.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })} (horário de Brasília)`
      : "Data não localizada";
    const formaTxt = pagamento.forma_pagamento === "pix" ? "PIX" : "Cartão";

    const assunto = `[Guia Técnico ZR] Pedido de nota fiscal — ${pagamento_id}`;
    const html =
      `<p><strong>Pedido de nota fiscal — Guia Técnico ZR</strong></p>` +
      `<p><strong>Emitente:</strong> ${DADOS_EMPRESA.razaoSocial}<br>` +
      `<strong>CNPJ:</strong> ${DADOS_EMPRESA.cnpj}<br>` +
      `${DADOS_EMPRESA.enderecoCompleto}</p>` +
      `<p><strong>Cliente:</strong> ${pagadorFiscal.nome}<br>` +
      `<strong>E-mail da conta:</strong> ${user.email || ""}</p>` +
      `<h3>Dados para emissão</h3>` +
      `<p><strong>Tipo:</strong> ${tipo === "pf" ? "Pessoa Física" : "Pessoa Jurídica"}<br>` +
      `<strong>CPF/CNPJ:</strong> ${cpfCnpj}<br>` +
      `<strong>Nome/Razão social:</strong> ${dados.nome_razao || "—"}<br>` +
      (dados.inscricao_estadual ? `<strong>Inscrição estadual:</strong> ${dados.inscricao_estadual}<br>` : "") +
      `<strong>E-mail para envio da nota:</strong> ${dados.email_nf}</p>` +
      `<h3>Endereço</h3>` +
      `<p><strong>CEP:</strong> ${cep}<br>` +
      `<strong>Logradouro:</strong> ${dados.logradouro}<br>` +
      `<strong>Número:</strong> ${dados.numero}<br>` +
      (dados.complemento ? `<strong>Complemento:</strong> ${dados.complemento}<br>` : "") +
      `<strong>Bairro:</strong> ${dados.bairro}<br>` +
      `<strong>Cidade:</strong> ${dados.cidade}<br>` +
      `<strong>UF:</strong> ${uf}</p>` +
      `<h3>Dados da compra</h3>` +
      `<p><strong>Plano:</strong> ${planoNome}<br>` +
      `<strong>Valor:</strong> ${valorTxt}<br>` +
      `<strong>Data:</strong> ${dataTxt}<br>` +
      `<strong>Forma de pagamento:</strong> ${formaTxt}<br>` +
      `<strong>Transação MP:</strong> ${pagamento.mercadopago_order_id || "—"}</p>` +
      `<p><em>A nota fiscal é emitida pelo Nutrimenu e enviada por e-mail. Este pedido coleta e encaminha os dados — não emite a nota automaticamente.</em></p>`;

    const mensagemWpp =
      `Pedido de NF — Guia Técnico ZR\n` +
      `Cliente: ${pagadorFiscal.nome}\n` +
      `Plano: ${planoNome}\n` +
      `Valor: ${valorTxt}\n` +
      `Transação MP: ${pagamento.mercadopago_order_id || "—"}`;

    const admins = await base44.asServiceRole.entities.User.filter({ role: "admin" }).catch(() => []);
    for (const admin of admins || []) {
      if (admin.email) {
        await sendEmailViaResend(base44, { to: admin.email, subject: assunto, html, produto: "guia_zr" }).catch((e: any) =>
          console.log(`Falha ao enviar e-mail admin (${admin.email}):`, e?.message || "erro")
        );
      }
      const telefone = admin.telefone_whatsapp;
      if (telefone) {
        const digits = String(telefone).replace(/\D/g, "");
        const numero = digits.length <= 11 ? `55${digits}` : digits;
        const modoTeste = secrets.get("WASCRIPT_MODO_TESTE") !== "false";
        const token = secrets.get("WASCRIPT_API_TOKEN");
        try {
          if (modoTeste || !token) {
            console.log(`[MODO TESTE] WhatsApp admin "Pedido NF" simulado.`);
          } else {
            const resposta = await fetch(`https://api-whatsapp.wascript.com.br/api/enviar-texto/${token}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ number: numero, message: mensagemWpp }),
            });
            if (!resposta.ok) console.log(`Erro ao enviar WhatsApp admin (HTTP ${resposta.status}).`);
          }
        } catch (e: any) {
          console.log("Falha ao enviar WhatsApp admin:", e?.message || "erro");
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}