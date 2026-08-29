import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { criarZipSemCompressao, sha256Hex, textoBytes } from "../../shared/migrationArchive.ts";

const TAMANHO_PAGINA = 500;
const CAMPOS_PESSOAIS = new Set([
  "created_by_id", "usuario_dono_id", "usuario_id", "user_id", "email", "telefone", "telefone_whatsapp",
]);

async function listarTudo(entidade, filtro = null) {
  const registros = [];
  for (let skip = 0; ; skip += TAMANHO_PAGINA) {
    const pagina = filtro
      ? await entidade.filter(filtro, "updated_date", TAMANHO_PAGINA, skip)
      : await entidade.list("updated_date", TAMANHO_PAGINA, skip);
    registros.push(...(pagina || []));
    if (!pagina || pagina.length < TAMANHO_PAGINA) return registros;
  }
}

function removerDadosPessoais(valor) {
  if (Array.isArray(valor)) return valor.map(removerDadosPessoais);
  if (!valor || typeof valor !== "object") return valor;
  const limpo = {};
  for (const [chave, conteudo] of Object.entries(valor)) {
    if (!CAMPOS_PESSOAIS.has(chave)) limpo[chave] = removerDadosPessoais(conteudo);
  }
  return limpo;
}

function envelope(nome, registro) {
  const payload = removerDadosPessoais({ ...registro });
  delete payload.id;
  delete payload.created_date;
  delete payload.updated_date;
  return {
    entity_name: nome,
    id: registro.id,
    created_date: registro.created_date || null,
    updated_date: registro.updated_date || null,
    payload,
  };
}

function jsonl(nome, registros) {
  return registros.map((registro) => JSON.stringify(envelope(nome, registro))).join("\n") + (registros.length ? "\n" : "");
}

function idsAusentes(registros, campo, idsValidos) {
  return registros.filter((item) => item[campo] && !idsValidos.has(item[campo])).map((item) => ({ id: item.id, referencia: item[campo] }));
}

function relacao(nome, ausentes) {
  return { nome, total_invalidos: ausentes.length, amostra: ausentes.slice(0, 20) };
}

function tipoJsonSchema(valor) {
  if (valor === null) return "null";
  if (Array.isArray(valor)) return "array";
  if (Number.isFinite(valor)) return "number";
  return typeof valor;
}

function inferirSchema(nome, registros) {
  const tiposPorCampo = new Map();
  for (const registro of registros) {
    const limpo = removerDadosPessoais(registro);
    for (const [campo, valor] of Object.entries(limpo)) {
      if (!tiposPorCampo.has(campo)) tiposPorCampo.set(campo, new Set());
      tiposPorCampo.get(campo).add(tipoJsonSchema(valor));
    }
  }
  const properties = {};
  for (const [campo, tipos] of tiposPorCampo) {
    const lista = Array.from(tipos).sort();
    properties[campo] = lista.length === 1 ? { type: lista[0] } : { type: lista };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: nome,
    type: "object",
    properties,
    additionalProperties: true,
    "x-schema-source": "inferred-from-phase-a-export",
  };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });
    const { dry_run: dryRun = false } = await req.json().catch(() => ({}));
    const inicio = new Date();
    const entidades = base44.asServiceRole.entities;

    const [
      ingredientes, medidas, utensilios, tags, receitas, todosComponentes, todosInsumosReceita,
      todosEsquecidos, todasReceitasTags, todosInsumos,
    ] = await Promise.all([
      listarTudo(entidades.Ingrediente),
      listarTudo(entidades.MedidaCaseira),
      listarTudo(entidades.UtensilioPadrao),
      listarTudo(entidades.Tag),
      listarTudo(entidades.Receita, { is_base: true }),
      listarTudo(entidades.IngredienteReceita),
      listarTudo(entidades.InsumoReceita),
      listarTudo(entidades.IngredienteEsquecidoReceita),
      listarTudo(entidades.ReceitaTag),
      listarTudo(entidades.Insumo),
    ]);

    const receitaIds = new Set(receitas.map((item) => item.id));
    const componentes = todosComponentes.filter((item) => receitaIds.has(item.receita_id));
    const insumosReceita = todosInsumosReceita.filter((item) => receitaIds.has(item.receita_id));
    const esquecidos = todosEsquecidos.filter((item) => receitaIds.has(item.receita_id));
    const receitasTags = todasReceitasTags.filter((item) => receitaIds.has(item.receita_id));
    const ingredienteIds = new Set(ingredientes.map((item) => item.id));
    const utensilioIds = new Set(utensilios.map((item) => item.id));
    const tagIds = new Set(tags.map((item) => item.id));
    const insumoReferenciadoIds = new Set(insumosReceita.map((item) => item.insumo_id).filter(Boolean));
    const insumos = todosInsumos.filter((item) => insumoReferenciadoIds.has(item.id));
    const insumoIds = new Set(insumos.map((item) => item.id));

    const dados = {
      Ingrediente: ingredientes,
      MedidaCaseira: medidas,
      UtensilioPadrao: utensilios,
      Tag: tags,
      Insumo: insumos,
      Receita: receitas,
      IngredienteReceita: componentes,
      InsumoReceita: insumosReceita,
      IngredienteEsquecidoReceita: esquecidos,
      ReceitaTag: receitasTags,
    };

    const relacoes = [
      relacao("MedidaCaseira.ingrediente_id -> Ingrediente", idsAusentes(medidas, "ingrediente_id", ingredienteIds)),
      relacao("MedidaCaseira.utensilio_id -> UtensilioPadrao", idsAusentes(medidas, "utensilio_id", utensilioIds)),
      relacao("IngredienteReceita.receita_id -> Receita", idsAusentes(componentes, "receita_id", receitaIds)),
      relacao("IngredienteReceita.ingrediente_id -> Ingrediente", idsAusentes(componentes.filter((item) => item.tipo === "ingrediente"), "ingrediente_id", ingredienteIds)),
      relacao("IngredienteReceita.subreceita_id -> Receita", idsAusentes(componentes.filter((item) => item.tipo === "subreceita"), "subreceita_id", receitaIds)),
      relacao("InsumoReceita.receita_id -> Receita", idsAusentes(insumosReceita, "receita_id", receitaIds)),
      relacao("InsumoReceita.insumo_id -> Insumo", idsAusentes(insumosReceita, "insumo_id", insumoIds)),
      relacao("IngredienteEsquecidoReceita.receita_id -> Receita", idsAusentes(esquecidos, "receita_id", receitaIds)),
      relacao("IngredienteEsquecidoReceita.ingrediente_id -> Ingrediente", idsAusentes(esquecidos, "ingrediente_id", ingredienteIds)),
      relacao("ReceitaTag.receita_id -> Receita", idsAusentes(receitasTags, "receita_id", receitaIds)),
      relacao("ReceitaTag.tag_id -> Tag", idsAusentes(receitasTags, "tag_id", tagIds)),
    ];

    const arquivos = [];
    const entradasManifesto = [];
    for (const [nome, registros] of Object.entries(dados)) {
      const caminho = `raw/${nome}.jsonl`;
      const bytes = textoBytes(jsonl(nome, registros));
      arquivos.push({ nome: caminho, bytes });
      entradasManifesto.push({ name: nome, file: caminho, rows: registros.length, bytes: bytes.length, sha256: await sha256Hex(bytes) });
    }

    for (const [nome, registros] of Object.entries(dados)) {
      const schema = inferirSchema(nome, registros);
      arquivos.push({ nome: `schemas/${nome}.schema.json`, bytes: textoBytes(JSON.stringify(schema, null, 2) + "\n") });
    }

    const contagens = Object.fromEntries(Object.entries(dados).map(([nome, registros]) => [nome, registros.length]));
    const relatorioRelacoes = {
      generated_at: new Date().toISOString(),
      scope: "fase_a_catalogo_sem_dados_pessoais",
      total_relacoes_invalidas: relacoes.reduce((soma, item) => soma + item.total_invalidos, 0),
      relacoes,
    };
    arquivos.push({ nome: "reports/counts.json", bytes: textoBytes(JSON.stringify(contagens, null, 2) + "\n") });
    arquivos.push({ nome: "reports/relationships.json", bytes: textoBytes(JSON.stringify(relatorioRelacoes, null, 2) + "\n") });
    arquivos.push({ nome: "README.txt", bytes: textoBytes("Fase A - catálogo público sem dados pessoais.\nEste pacote não contém usuários, proprietários, e-mails, telefones, preços pessoais ou pagamentos.\n") });

    const manifesto = {
      format_version: "1.0",
      export_id: crypto.randomUUID(),
      started_at: inicio.toISOString(),
      finished_at: new Date().toISOString(),
      source: "base44-public-catalog",
      mode: "fase_a",
      cursor_rule: "updated_date,offset_sob_congelamento_logico",
      transformer_version: "fase-a-1.0.0",
      personal_data_included: false,
      entities: entradasManifesto,
      relationships_invalid: relatorioRelacoes.total_relacoes_invalidas,
    };
    arquivos.push({ nome: "manifest.json", bytes: textoBytes(JSON.stringify(manifesto, null, 2) + "\n") });

    const checksums = [];
    for (const arquivo of arquivos) checksums.push(`${await sha256Hex(arquivo.bytes)}  ${arquivo.nome}`);
    arquivos.push({ nome: "checksums.sha256", bytes: textoBytes(checksums.join("\n") + "\n") });

    const resumo = {
      export_id: manifesto.export_id,
      dry_run: dryRun,
      contagens,
      total_registros: Object.values(contagens).reduce((soma, total) => soma + total, 0),
      relacoes_invalidas: relatorioRelacoes.total_relacoes_invalidas,
      relacoes: relacoes.map((item) => ({ nome: item.nome, total_invalidos: item.total_invalidos })),
      dados_pessoais_incluidos: false,
      arquivos_no_pacote: arquivos.length,
    };
    if (dryRun) return Response.json(resumo);

    const zip = criarZipSemCompressao(arquivos, inicio);
    const nomeArquivo = `laboratorio-cozinha-fase-a-${inicio.toISOString().replace(/[:.]/g, "-")}.zip`;
    const upload = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
      file: new File([zip], nomeArquivo, { type: "application/zip" }),
    });
    const assinado = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: upload.file_uri,
      expires_in: 3600,
    });
    return Response.json({ ...resumo, nome_arquivo: nomeArquivo, tamanho_bytes: zip.length, file_uri: upload.file_uri, download_url: assinado.signed_url, expira_em_segundos: 3600 });
  } catch (error) {
    return Response.json({ error: error?.message || "Falha ao exportar Fase A" }, { status: 500 });
  }
}