// Exporta EXATAMENTE os usuários visíveis na tabela administrativa,
// respeitando todos os filtros ativos. Formato CSV (ponto e vírgula + BOM UTF-8)
// para abrir direto no Excel em português sem quebrar acentos.

import { downloadCsvSemicolonBom } from "@/lib/exportCsv";
import {
  computeStatusUsuario,
  formatarData,
  formatarDataHora,
  PLANO_LABEL,
  ORIGEM_CADASTRO_LABEL,
} from "@/lib/statusAssinaturaUsuario";
import {
  getUltimoPagamento,
  formatarMoeda,
  FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL,
} from "@/lib/pagamentosUsuario";

const HEADERS = [
  "Nome",
  "E-mail",
  "Telefone",
  "Produto (origem)",
  "Plano",
  "Expira em",
  "Situação da assinatura",
  "Último pagamento (valor)",
  "Último pagamento (meio)",
  "Situação do pagamento",
  "Conta de teste",
  "Data de cadastro",
];

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function buildFiltroSlug(filtros) {
  const parts = [];
  if (filtros.busca) parts.push("busca");
  if (filtros.planoFiltro && filtros.planoFiltro !== "todos") parts.push(filtros.planoFiltro);
  if (filtros.statusFiltro && filtros.statusFiltro !== "todos") parts.push(slugify(filtros.statusFiltro));
  if (filtros.segmentoFiltro && filtros.segmentoFiltro !== "todos") parts.push(slugify(filtros.segmentoFiltro));
  if (filtros.origemFiltro && filtros.origemFiltro !== "todos") parts.push(slugify(filtros.origemFiltro));
  if (filtros.tipoUsuarioFiltro && filtros.tipoUsuarioFiltro !== "todos") parts.push(slugify(filtros.tipoUsuarioFiltro));
  if (filtros.situacaoPagamentoFiltro && filtros.situacaoPagamentoFiltro !== "todos") parts.push(filtros.situacaoPagamentoFiltro);
  if (filtros.origemCadastroFiltro && filtros.origemCadastroFiltro !== "todos") parts.push(slugify(ORIGEM_CADASTRO_LABEL[filtros.origemCadastroFiltro] || filtros.origemCadastroFiltro));
  if (parts.length === 0) return "todos";
  return parts.join("-");
}

export function exportarUsuariosCsv(usuariosFiltrados, pagamentosPorUsuario, filtros) {
  if (!usuariosFiltrados || usuariosFiltrados.length === 0) {
    return { ok: false, motivo: "vazio" };
  }

  const rows = usuariosFiltrados.map((u) => {
    const ultimo = getUltimoPagamento(pagamentosPorUsuario, u.id);
    return [
      u.nome_completo || u.full_name || "",
      u.email || "",
      u.telefone_whatsapp || "",
      ORIGEM_CADASTRO_LABEL[u.origem_cadastro] || "Não informado",
      PLANO_LABEL[u.plano_atual] || u.plano_atual || "",
      formatarData(u.data_expiracao),
      computeStatusUsuario(u).label,
      ultimo ? formatarMoeda(ultimo.valor) : "",
      ultimo ? (FORMA_PAGAMENTO_LABEL[ultimo.forma_pagamento] || "") : "",
      ultimo ? (STATUS_PAGAMENTO_LABEL[ultimo.status] || ultimo.status || "") : "",
      u.conta_teste ? "Sim" : "Não",
      formatarDataHora(u.created_date),
    ];
  });

  const slug = buildFiltroSlug(filtros);
  const hoje = new Date().toISOString().slice(0, 10);
  const filename = `usuarios-${slug}-${hoje}.csv`;

  downloadCsvSemicolonBom(filename, HEADERS, rows);
  return { ok: true, count: rows.length, filename };
}