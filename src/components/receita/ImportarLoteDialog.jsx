import { criarIngredienteReceita } from '@/lib/secureChildEntities';
import { criarReceitaSegura } from '@/lib/secureRootEntities';
import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Sparkles, FileText, ClipboardPaste, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import { sugerirUnidadeCompra } from "@/lib/sugerirUnidadeCompra";
import { buscarFuzzy, removerMarca } from "@/lib/normalizarNome";
import { CATEGORIAS } from "@/components/receita/CategoriaPicker";
import ImportarLoteReport from "@/components/receita/ImportarLoteReport";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { uploadArquivoSeguro, validarDocumentoReceitaUpload } from "@/lib/securityHardening";

const TABS = { PASTE: "paste", FILE: "file" };

const RECIPE_EXTRACTION_PROMPT = `
⚠️ CRÍTICO: Use SOMENTE o conteúdo fornecido abaixo. NÃO invente, NÃO sugira, NÃO complemente nenhuma receita. Se não houver receitas no texto, retorne array vazio.

Analise o conteúdo e extraia SOMENTE as receitas que estão explicitamente nele.

O conteúdo pode vir de uma tabela Word convertida para texto corrido com este padrão:

Nome da receita: [NOME]
Ingredientes Pré-preparo Qtd. 1 porção
[ingrediente] [pré-preparo opcional] [número]
[ingrediente] [número]
Modo de preparo:
1. [passo]
2. [passo]
Nome da receita: [PRÓXIMA]

REGRAS DE EXTRAÇÃO:

1. SEPARADOR DE RECEITAS: cada "Nome da receita:" inicia uma nova receita. Tudo até o próximo "Nome da receita:" pertence a essa receita.

2. CABEÇALHOS A IGNORAR: linhas como "Ingredientes", "Pré-preparo", "Qtd.", "Qtd. 1 porção", "Ingredientes Pré-preparo Qtd. 1 porção" são cabeçalhos de tabela — NÃO são ingredientes.

3. SUB-TÍTULOS: linhas em CAIXA ALTA isoladas, linhas terminadas em ":", ou linhas curtas sem número no final e sem ser o nome da receita — tratar como sub-título de grupo (tipo: "grupo").

4. LINHA DE INGREDIENTE: extraia SOMENTE os ingredientes explicitamente listados no texto. NUNCA adicione, invente ou infira ingredientes que não estejam no conteúdo original. Linha com número no final = ingrediente. O número é a quantidade em gramas (substitua vírgula por ponto). O texto antes é o nome + pré-preparo opcional. Ex: "Farinha de trigo 250,00" → nome="Farinha de trigo", quantidade_g=250. Ex: "Cebola picada 150,00" → nome="Cebola", pre_preparo="picada", quantidade_g=150.

5. MODO DE PREPARO: tudo após "Modo de preparo:" até o próximo "Nome da receita:" ou fim do conteúdo. Reescreva no padrão: lista numerada, UM verbo de ação por item no INFINITIVO (Derreter, Bater, Acrescentar, nunca Derreta/Bata/Acrescente), NENHUM texto narrativo/dicas/comentários, NENHUMA especificação de equipamento ou marca, Cada passo deve ser AUTOSSUFICIENTE: inclua o verbo de ação + objeto breve para que faça sentido lido isoladamente. Nunca omita o ingrediente para evitar repetição entre passos.

6. NORMALIZAÇÃO DE NOMES DE INGREDIENTES (APLICAR SEMPRE):
   - REMOVER MARCAS COMERCIAIS do final do nome. Ex: "Manteiga com Sal Piracanjuba" → "Manteiga com sal", "Creme de Leite Itambé" → "Creme de leite", "Farinha de Trigo Renata" → "Farinha de trigo", "Leite Condensado Moça" → "Leite condensado", "Fermento em Pó Royal" → "Fermento em pó", "Amido de Milho Maizena" → "Amido de milho". NUNCA registre ou associe ingredientes pelo nome da marca — sempre use o nome genérico.
   - SEPARAR NOME DE PRÉ-PREPARO: texto após vírgula que indica forma/parte → mover para pre_preparo ou incorporar ao nome corretamente.
     • "Limão, suco" → nome="Limão", pre_preparo="suco"
     • "Ovo, gema" → nome="Gema de ovo", pre_preparo=""
     • "Óleo, de soja" → nome="Óleo de soja"
     • "Carne de peixe, bacalhau" → nome="Bacalhau"
     • "Carne frutos mar, camarão" → nome="Camarão"
     • "Milho verde cozido" → nome="Milho verde", pre_preparo="cozido"
   - TRADUÇÕES E PADRONIZAÇÕES:
     • "Nata" ou "nata" → "Creme de leite fresco"
     • "Fines-herbes" ou "Fines herbes" → "Ervas finas"
     • "Cheiro verde" → "Cheiro verde (salsinha + cebolinha)"
     • "Pimenta moída" → "Pimenta-do-reino moída"

7. QUANTIDADE: sempre em gramas, converta vírgula para ponto. Ex: "250,00" → 250.

8. CATEGORIA DA RECEITA: deduza do nome e ingredientes (ex: "Carnes, Bovina", "Confeitaria, Doces e Docinhos"). Se incerto, use string vazia. IMPORTANTE: se a receita tiver MAIS DE 2 ingredientes claramente da categoria DOCES (chocolate, cacau, açúcar, baunilha, chantilly, doce de leite, leite condensado, glucose, mel, gelatina, coco ralado, goiabada, frutas cristalizadas, etc.), sugira APENAS "Sobremesas" ou "Pães e Bolos" — NUNCA "Prato Principal", "Acompanhamento", "Entradas", "Carnes, Bovina" ou qualquer outra categoria que não seja doce.

9. PER CAPITA (PC): se o texto tiver uma linha "PC:", "PORÇÃO:" ou "PORÇÕES:" (dois-pontos seguido de valor numérico em gramas), esse valor é o per_capita_g da receita — NUNCA o número de porções. Extraia para o campo per_capita_g. NÃO use esse valor para porcoes_base.

10. INGREDIENTES AMBÍGUOS ("X ou Y"): se um ingrediente estiver escrito como "X ou Y" (ex: "manteiga ou margarina"), NÃO escolha um — transcreva o nome COMPLETO "X ou Y" como nome. O sistema detectará e pedirá que o usuário escolha.

CONTEÚDO:
`;

// ── NORMALIZATION HELPERS ──

const normalizeIngredienteNome = (rawNome) => {
if (!rawNome) return { nome: "", pre_preparo: "" };
let nome = rawNome.trim();

// Strip commercial brands first
nome = removerMarca(nome);

// Translations
const translations = {
  "nata": "Creme de leite fresco",
  "fines-herbes": "Ervas finas",
  "fines herbes": "Ervas finas",
  "cheiro verde": "Cheiro verde (salsinha + cebolinha)",
  "pimenta moída": "Pimenta-do-reino moída",
  "pimenta moida": "Pimenta-do-reino moída",
};

const lower = nome.toLowerCase();
if (translations[lower]) return { nome: translations[lower], pre_preparo: "" };

  // Split name from pré-preparo: handle patterns like "Nome, forma" or "Nome forma"
  // Pattern: "Limão, suco" → "Limão" + "suco"
  if (nome.includes(",")) {
    const parts = nome.split(",");
    const base = parts[0].trim();
    const rest = parts.slice(1).join(" ").trim();
    // If rest looks like a form/part, it's pré-preparo
    const formKeywords = ["suco", "picado", "ralado", "moido", "moído", "cubos", "fatias", "rodelas",
      "gema", "clara", "filé", "file", "peito", "coxa", "sobrecoxa", "lombo", "costela",
      "de soja", "de milho", "de trigo", "de arroz", "de mandioca"];
    const isForm = formKeywords.some(k => rest.toLowerCase().includes(k));
    if (isForm) {
      // Special case: "Ovo, gema" → "Gema de ovo"
      if (base.toLowerCase() === "ovo" && rest.toLowerCase() === "gema") return { nome: "Gema de ovo", pre_preparo: "" };
      if (base.toLowerCase() === "ovo" && rest.toLowerCase() === "clara") return { nome: "Clara de ovo", pre_preparo: "" };
      // "Carne de peixe, bacalhau" → "Bacalhau"
      if (base.toLowerCase().includes("carne") && (rest.toLowerCase() === "bacalhau" || rest.toLowerCase() === "camarão")) return { nome: rest, pre_preparo: "" };
      if (base.toLowerCase().includes("carne") && rest.toLowerCase().includes("camar")) return { nome: "Camarão", pre_preparo: "" };
      return { nome: base, pre_preparo: rest };
    }
    // "Óleo, de soja" → "Óleo de soja"
    if (rest.startsWith("de ")) return { nome: base + " " + rest, pre_preparo: "" };
    return { nome, pre_preparo: "" };
  }

  // "Milho verde cozido" → "Milho verde" + "cozido"
  const cozidoMatch = nome.match(/^(.+?)\s+(cozido|cru|fresco|seco|defumado|curado)$/i);
  if (cozidoMatch) return { nome: cozidoMatch[1], pre_preparo: cozidoMatch[2].toLowerCase() };

  return { nome, pre_preparo: "" };
};

const autoCategoria = (nome) => {
  const lower = (nome || "").toLowerCase();
  if (/\b(bacalhau|camarão|camarão|peixe|salmão|atum|sardinha|lula|polvo|marisco|mexilhão)\b/.test(lower)) return "Peixes e Frutos do Mar";
  if (/\b(azeitona|palmito|milho|ervilha)\b.*\b(conserva|enlatado)\b/.test(lower)) return "Conservas e Enlatados";
  if (/\b(azeitona)\b/.test(lower) && !lower.includes("azeite")) return "Conservas e Enlatados";
  if (/\b(palmito)\b/.test(lower)) return "Conservas e Enlatados";
  if (/\b(páprica|pimenta|orégano|oregano|tomilho|alecrim|manjericão|manjericao|salsinha|cebolinha|coentro|louro|noz.moscada|canela|cravo|cominho|açafrão|acafrao|curry|gengibre|colorau|urucum|sal|ervas)\b/.test(lower)) return "Temperos e Ervas";
  if (/\b(óleo|azeite|manteiga|margarina|banha|gordura)\b/.test(lower)) return "Óleos e Gorduras";
  if (/\b(leite|queijo|creme|iogurte|nata|manteiga|requeijão|requeijao|ricota|catupiry|mascarpone)\b/.test(lower)) return "LATICÍNIOS";
  if (/\b(ovo|gema|clara)\b/.test(lower)) return "Ovos";
  if (/\b(caldo|bechamel|molho base|massa base|fundo)\b/.test(lower)) return "Receitas Básicas";
  if (/\b(limão|limao|laranja|maçã|maca|banana|abacaxi|morango|uva|manga|maracujá|maracuja|pêssego|pessego|ameixa|coco|abacate|kiwi|melão|melao|melancia|framboesa|mirtilo|cereja)\b/.test(lower)) return "Frutas";
  if (/\b(cebola|alho|cenoura|brócolis|brocolis|abobrinha|berinjela|pimentão|pimentao|tomate|pepino|beterraba|batata|mandioca|aipim|inhame|nabo|rabanete|rúcula|rucula|alface|espinafre|couve|repolho|acelga|agrião|agriao|quiabo|vagem|chuchu|abóbora|abobora)\b/.test(lower)) return "Legumes e Verduras";
  return "A Revisar";
};

const compareNormalized = (a, b) => {
  // Remove accents, punctuation, extra spaces, lowercase
  const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
};

const normWords = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);

// Mapeia a categoria em texto livre (extraída pela IA) para o valor MAIS PRÓXIMO do enum válido.
// Nunca retorna uma categoria nova/inválida.
const matchCategoria = (categoriaTexto) => {
  if (!categoriaTexto) return CATEGORIAS[0];
  const exata = CATEGORIAS.find((c) => compareNormalized(c, categoriaTexto));
  if (exata) return exata;
  const palavras = new Set(normWords(categoriaTexto));
  let melhor = CATEGORIAS[0];
  let melhorScore = -1;
  for (const c of CATEGORIAS) {
    const score = normWords(c).filter((p) => palavras.has(p)).length;
    if (score > melhorScore) { melhorScore = score; melhor = c; }
  }
  return melhor;
};

export default function ImportarLoteDialog({ open, onClose }) {
  const [tab, setTab] = useState(TABS.PASTE);
  const [texto, setTexto] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(""); // "uploading" | "extracting" | "identifying" | ""
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const fileInputRef = useRef(null);
  const qc = useQueryClient();

  const reset = () => {
    setTexto("");
    setFile(null);
    setError(false);
    setResult(null);
    setLoading(false);
    setLoadingStep("");
    setImporting(false);
    setImportReport(null);
  };

  const handleClose = () => {
    reset();
    setTab(TABS.PASTE);
    onClose();
  };

  const handleFile = (f) => {
    if (!f) return;
    try {
      validarDocumentoReceitaUpload(f);
      setFile(f);
      setError(false);
      setResult(null);
    } catch (err) {
      setFile(null);
      toast.error(err?.message || "Arquivo inválido");
    }
  };

  const responseSchema = {
    type: "object",
    properties: {
      receitas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nome: { type: "string" },
            categoria: { type: "string" },
            porcoes_base: { type: "number" },
            per_capita_g: { type: "number", description: "Valor do campo PC:/PORÇÃO:/PORÇÕES: do texto, em gramas — nunca o número de porções" },
            rendimento_g: { type: "number" },
            modo_preparo: { type: "string", description: "Lista numerada, UM verbo por item no INFINITIVO (Derreter, Bater). Sem imperativo, sem marcas/equipamentos, sem dicas. Cada passo autossuficiente com objeto breve." },
            ingredientes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome: { type: "string" },
                  pre_preparo: { type: "string" },
                  quantidade_g: { type: "number" },
                  tipo: { type: "string", enum: ["ingrediente", "grupo"] }
                }
              }
            }
          }
        }
      }
    }
  };

  const handleIdentify = async () => {
    if (tab === TABS.PASTE && !texto.trim()) { toast.error("Cole o texto da receita"); return; }
    if (tab === TABS.FILE && !file) { toast.error("Selecione um arquivo"); return; }

    setLoading(true);
    setError(false);
    setResult(null);

    try {
      let conteudo = "";
      const ext = tab === TABS.FILE ? file.name?.split(".").pop()?.toLowerCase() : null;

      // — PASTE TAB: use text directly —
      if (tab === TABS.PASTE) {
        conteudo = texto;
      }
      // — FILE TAB: extract text first —
      else {
        setLoadingStep("uploading");
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        if (ext === "txt") {
          // Fetch .txt content directly
          const response = await fetch(file_url);
          conteudo = await response.text();
        } else if (ext === "pdf") {
          // Use ExtractDataFromUploadedFile for PDF
          setLoadingStep("extracting");
          try {
            const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
              file_url,
              json_schema: {
                type: "object",
                properties: {
                  texto_completo: { type: "string" }
                }
              }
            });
            if (extraction.status === "success" && extraction.output?.texto_completo) {
              conteudo = extraction.output.texto_completo;
            }
          } catch {
            // Extraction failed, try LLM fallback
          }
          // If still empty, try LLM-based extraction
          if (!conteudo?.trim()) {
            setLoadingStep("extracting");
            const textResult = await base44.integrations.Core.InvokeLLM({
              prompt: "Extraia TODO o texto deste arquivo, palavra por palavra. Retorne o texto bruto. Se não conseguir ler, retorne string vazia.",
              file_urls: [file_url],
              response_json_schema: {
                type: "object",
                properties: { texto: { type: "string" } }
              }
            });
            conteudo = textResult.texto || "";
          }
        } else {
          // .docx — LLM to extract text
          setLoadingStep("extracting");
          const textResult = await base44.integrations.Core.InvokeLLM({
            prompt: "Extraia TODO o texto deste arquivo .docx, palavra por palavra, preservando quebras de linha. Retorne o texto bruto completo. Se não conseguir ler o arquivo, retorne string vazia.",
            file_urls: [file_url],
            response_json_schema: {
              type: "object",
              properties: { texto: { type: "string" } }
            }
          });
          conteudo = textResult.texto || "";
        }
      }

      // — VALIDATE extracted content —
      if (!conteudo || !conteudo.trim()) {
        // Try one more approach for files: let LLM read file directly with strict anti-hallucination
        if (tab === TABS.FILE && file) {
          setLoadingStep("identifying");
          const { file_url: url2 } = await base44.integrations.Core.UploadFile({ file });
          const directResult = await base44.integrations.Core.InvokeLLM({
            prompt: `⚠️ CRÍTICO: Leia SOMENTE o que está neste arquivo. Se o arquivo não contiver receitas claramente identificáveis, retorne receitas vazio E marque conteudo_vazio=true. NUNCA invente receitas.

${RECIPE_EXTRACTION_PROMPT}`,
            file_urls: [url2],
            response_json_schema: {
              type: "object",
              properties: {
                receitas: responseSchema.properties.receitas,
                conteudo_vazio: { type: "boolean" }
              }
            }
          });
          if (directResult.conteudo_vazio || !directResult.receitas?.length) {
            setError(true);
            setLoading(false);
            return;
          }
          const receitas = (directResult.receitas || []).filter(r => (r.nome || "").trim());
          if (receitas.length === 0) { setError(true); setLoading(false); return; }
          setResult({ receitas });
          setLoading(false);
          return;
        }
        setError(true);
        setLoading(false);
        return;
      }

      // Verify extracted text actually looks like recipes
      const temIndiciosReceita = /modo de preparo|ingredientes|nome da receita|porções|rendimento/i.test(conteudo);
      // Also check for recipe-like structure (lines with quantities, numbered steps)
      const temEstruturaReceita = /\d+[.,]\d{2}/.test(conteudo) || /^\d+\.\s/.test(conteudo);

      if (!temIndiciosReceita && !temEstruturaReceita) {
        setError(true);
        setLoading(false);
        return;
      }

      // — IDENTIFY RECIPES —
      setLoadingStep("identifying");
      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: RECIPE_EXTRACTION_PROMPT + conteudo,
        response_json_schema: responseSchema
      });

      const receitasExtraidas = (llmResult.receitas || []).filter(r => (r.nome || "").trim());

      if (receitasExtraidas.length === 0) {
        setError(true);
        setLoading(false);
        return;
      }

      setResult({ receitas: receitasExtraidas });
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleImport = async () => {
    if (!result?.receitas?.length) return;
    setImporting(true);
    try {
      const existingIngredientes = await fetchAllPages(base44.entities.Ingrediente, "-nome");
      const ingredienteMap = {};
      existingIngredientes.forEach(ing => {
        const key = ing.nome?.toLowerCase().trim();
        if (key) ingredienteMap[key] = ing;
      });

      const existingReceitas = await fetchAllPages(base44.entities.Receita, "-nome");
      const receitaMap = {};
      existingReceitas.forEach(r => { receitaMap[r.nome?.toLowerCase().trim()] = r; });

      let created = 0, updated = 0, skipped = 0, ambiguos = 0;
      const processedNames = new Set();
      const substituicoesCategoria = [];

      for (const item of result.receitas) {
        const nome = (item.nome || "").trim();
        if (!nome) { skipped++; continue; }

        const nomeKey = nome.toLowerCase();
        // Skip intra-batch duplicates (case-insensitive, trimmed)
        if (processedNames.has(nomeKey)) { skipped++; continue; }
        processedNames.add(nomeKey);

        const modoPreparo = item.modo_preparo
          ? juntarPassos(formatarModoPreparo(item.modo_preparo))
          : "";

        const rendimentoCalc = (item.ingredientes || []).reduce((acc, i) => acc + (i.tipo === "grupo" ? 0 : (i.quantidade_g || 0)), 0);
        const categoriaFinal = matchCategoria(item.categoria);
        if (item.categoria && !compareNormalized(item.categoria, categoriaFinal)) {
          substituicoesCategoria.push({ receita: nome.toUpperCase(), original: item.categoria, usada: categoriaFinal });
        }
        const payload = {
          nome: nome.toUpperCase(),
          categorias: [categoriaFinal],
          porcoes_base: 1,
          per_capita_g: item.per_capita_g || null,
          rendimento_total: rendimentoCalc,
          unidade_base: "g",
          modo_preparo: modoPreparo,
          revisar: false,
        };

        let receitaId;
        const fuzzyMatch = buscarFuzzy(nome, existingReceitas);
        const existingReceita = fuzzyMatch?.receita;
        if (existingReceita) {
          receitaId = existingReceita.id;
          await base44.entities.Receita.update(receitaId, payload);
          const oldItems = await base44.entities.IngredienteReceita.filter({ receita_id: receitaId }, "", 200);
          for (const old of oldItems) {
            await base44.entities.IngredienteReceita.delete(old.id);
          }
          updated++;
        } else {
          const newReceita = await criarReceitaSegura(payload);
          receitaId = newReceita.id;
          created++;
        }

        const ingredientes = item.ingredientes || [];

        // ── Estimate prices for new ingredients in batch ──
        const novosNomesLote = [];
        for (const ing of ingredientes) {
          if (ing.tipo === "grupo") continue;
          const ingNome = (ing.nome || "").trim();
          if (!ingNome || /\b.+\s+ou\s+.+\b/i.test(ingNome)) continue;
          const normalized = normalizeIngredienteNome(ingNome);
          const nomeFinal = normalized.nome;
          if (!ingredienteMap[nomeFinal.toLowerCase()]) {
            let jaExiste = false;
            for (const key of Object.keys(ingredienteMap)) {
              if (compareNormalized(key, nomeFinal)) { jaExiste = true; break; }
            }
            if (!jaExiste) novosNomesLote.push(nomeFinal);
          }
        }
        const precosEstimadosLote = {};
        if (novosNomesLote.length > 0) {
          try {
            const resultado = await base44.integrations.Core.InvokeLLM({
              prompt: `Estime o preço médio de mercado no Brasil (em R$) para cada ingrediente abaixo, na unidade de compra indicada. Busque preços atuais (2025-2026) em supermercados e atacadistas brasileiros.\n\n${novosNomesLote.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
              add_context_from_internet: true,
              model: "gemini_3_flash",
              response_json_schema: {
                type: "object",
                properties: {
                  precos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        preco_embalagem_rs: { type: "number", description: "Preço da embalagem padrão em R$" },
                        peso_embalagem_g: { type: "number", description: "Peso da embalagem padrão em gramas" }
                      }
                    }
                  }
                }
              }
            });
            (resultado.precos || []).forEach(pe => {
              if (pe.nome && pe.preco_embalagem_rs > 0) {
                precosEstimadosLote[pe.nome.toLowerCase()] = pe;
              }
            });
          } catch { /* segue sem preços estimados */ }
        }

        let ordem = 0;
        for (const ing of ingredientes) {
          if (ing.tipo === "grupo") {
            await criarIngredienteReceita({
              receita_id: receitaId,
              ingrediente_id: "",
              ingrediente_nome: "",
              tipo: "grupo",
              titulo_grupo: ing.nome || "",
              ordem: ordem++,
              quantidade_por_porcao: 0,
            });
            continue;
          }

          const ingNome = (ing.nome || "").trim();
          if (!ingNome) { ordem++; continue; }

          // Skip ambiguous "X ou Y" ingredients — user must resolve manually
          if (/\b.+\s+ou\s+.+\b/i.test(ingNome)) {
            ambiguos++;
            ordem++;
            continue;
          }

          // Normalize ingredient name
          const normalized = normalizeIngredienteNome(ingNome);
          const ingNomeFinal = normalized.nome;
          const ingPrePreparoFinal = normalized.pre_preparo || ing.pre_preparo || "";
          const ingCategoria = autoCategoria(ingNomeFinal);

          // Check for similar existing ingredient
          let ingId = null;
          for (const key of Object.keys(ingredienteMap)) {
            if (compareNormalized(key, ingNomeFinal)) {
              ingId = ingredienteMap[key].id;
              break;
            }
          }
          // Also check by exact lowercase match (fallback)
          if (!ingId) {
            ingId = ingredienteMap[ingNomeFinal.toLowerCase()]?.id;
          }

          if (!ingId) {
            const unidade = sugerirUnidadeCompra(ingNomeFinal);
            const estimado = precosEstimadosLote[ingNomeFinal.toLowerCase()];
            const precoEmb = estimado?.preco_embalagem_rs || 0;
            const pesoEmb = estimado?.peso_embalagem_g || unidade.peso_embalagem_g;
            const precoPorG = pesoEmb > 0 ? precoEmb / pesoEmb : 0;
            const novoIng = await base44.entities.Ingrediente.create({
              nome: ingNomeFinal,
              categoria: ingCategoria,
              unidade_compra: unidade.unidade_compra,
              peso_embalagem_g: pesoEmb,
              preco_embalagem_rs: precoEmb,
              preco_por_g_rs: precoPorG,
              fator_correcao: 1,
              revisar: false,
              preco_estimado: true,
              fonte_preco: precoEmb > 0 ? "IA web" : "Manual",
            });
            ingId = novoIng.id;
            ingredienteMap[ingNomeFinal.toLowerCase()] = novoIng;
          }

          await criarIngredienteReceita({
            receita_id: receitaId,
            ingrediente_id: ingId,
            ingrediente_nome: ingNomeFinal,
            pre_preparo: ingPrePreparoFinal,
            quantidade_por_porcao: ing.quantidade_g || 0,
            tipo: "ingrediente",
            ordem: ordem++,
          });
        }
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      setImportReport({ created, updated, skipped, ambiguos, substituicoesCategoria });
    } catch (err) {
      toast.error("Erro na importação: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const hasContent = tab === TABS.PASTE ? texto.trim() : file;
  const loadingLabel = loadingStep === "uploading" ? "Enviando arquivo..."
    : loadingStep === "extracting" ? "Lendo conteúdo..."
    : loadingStep === "identifying" ? "Identificando receitas..."
    : "Processando...";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Importar com IA (texto ou arquivo)</DialogTitle>
          <DialogDescription>
            Cole 1 ou várias receitas, ou envie um arquivo — a IA identifica e organiza.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === TABS.PASTE ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab(TABS.PASTE); setError(false); setResult(null); }}
          >
            <ClipboardPaste className="w-4 h-4" />
            Colar texto
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === TABS.FILE ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab(TABS.FILE); setError(false); setResult(null); }}
          >
            <Upload className="w-4 h-4" />
            Enviar arquivo
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="p-3 bg-muted rounded-lg flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Não encontramos receitas no conteúdo enviado. Tente colar diretamente o texto da receita.
            </p>
          </div>
        )}

        {/* Import report */}
        {importReport && <ImportarLoteReport report={importReport} onClose={handleClose} />}

        {/* Result state */}
        {!importReport && result && !loading && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>{result.receitas.length} receitas</strong> identificadas.
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {result.receitas.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                  <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <span className="font-medium truncate">{(r.nome || "").toUpperCase() || "(sem nome)"}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{(r.ingredientes || []).length} ingr.</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setResult(null); setError(false); }}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...</> : <>Importar {result.receitas.length} receitas</>}
              </Button>
            </div>
          </div>
        )}

        {/* Content area */}
        {!importReport && !result && !error && (
          <>
            {tab === TABS.PASTE ? (
              <div className="space-y-1.5">
                <Textarea
                  className="min-h-40 resize-y"
                  placeholder={"Cole aqui suas receitas — do jeito que estiverem, como da internet ou suas anotações.\nRecomendamos colar até 10 receitas por vez para melhor resultado."}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">💡 Receitas muito longas ou complexas: prefira colar até 5 por vez.</p>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : file ? "border-green-300 bg-green-50/50" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              >
                {file ? (
                  <div className="space-y-1">
                    <FileText className="w-8 h-8 mx-auto text-green-600" />
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs mt-1"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground/60" />
                    <p className="text-sm font-medium">Arraste o arquivo aqui</p>
                    <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">.docx · .pdf · .txt</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.pdf,.txt"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
            )}
          </>
        )}

        {/* Footer */}
        {!importReport && !result && !error && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleIdentify} disabled={!hasContent || loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {loadingLabel}</> : <><Sparkles className="w-4 h-4 mr-1" /> Identificar Receitas</>}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}