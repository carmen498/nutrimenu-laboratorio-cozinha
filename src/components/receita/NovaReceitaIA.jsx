import { criarIngredienteReceita, criarReceitaTag } from '@/lib/secureChildEntities';
import { criarReceitaSegura } from '@/lib/secureRootEntities';
import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Check, X, AlertCircle, Plus, AlertTriangle, ChefHat } from "lucide-react";
import CategoriaPicker from "@/components/receita/CategoriaPicker";
import TagSelector from "@/components/tags/TagSelector";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import { buscarFuzzy, buscarIngredientesRanqueado, removerMarca } from "@/lib/normalizarNome";
import { converterMedida, gerarTabelaPrompt } from "@/lib/conversorMedidas";
import { sugerirUnidadeCompra } from "@/lib/sugerirUnidadeCompra";
import { toSentenceCaseName } from "@/lib/textCase";
import { confirmarPorcoesBase, normalizarPorcoesBase } from "@/lib/porcoesBase";

// ── Auto-category from ingredients ──
const categorizarPorIngredientes = (ingredientesNomes) => {
  const all = (ingredientesNomes || []).join(" ").toLowerCase();
  if (!all) return [];
  const has = (words) => words.some(w => all.includes(w));
  const cats = [];
  if (has(["chocolate", "cacau", "açúcar", "acucar", "baunilha", "chantilly", "doce", "brigadeiro", "beijinho", "pavê", "pave", "mousse"])) cats.push("Sobremesas");
  if (has(["farinha", "manteiga", "margarina", "fermento"]) && has(["açúcar", "acucar"])) cats.push("Sobremesas");
  if (has(["bovin", "contrafilé", "contrafile", "picanha", "alcatra", "maminha", "patinho", "coxão", "coxao", "costela bovina", "fraldinha", "cupim", "músculo", "musculo"])) cats.push("Carnes Bovinas e Suínos");
  if (has(["frango", "peru", "ave", "galinha", "chester"])) cats.push("Aves");
  if (has(["peixe", "salmão", "salmao", "atum", "sardinha", "bacalhau"])) cats.push("Peixes e Frutos do Mar");
  if (has(["camarão", "camarao", "lula", "polvo", "marisco", "mexilhão", "mexilhao", "lagosta", "siri", "caranguejo"])) cats.push("Peixes e Frutos do Mar");
  if (has(["arroz", "risoto"])) cats.push("Arroz e Risotos");
  if (has(["macarrão", "macarrao", "espaguete", "penne", "fusilli", "talharim", "nhoque"])) cats.push("Massas, Pastelão e Quiches");
  if (has(["pão", "pizza", "sanduíche"])) cats.push("Lanches");
  return [...new Set(cats)];
};

// ── Validate if text looks like a recipe ──
const isRecipeText = (text) => {
  const t = text.trim();
  if (t.length < 50) return false;

  const lower = t.toLowerCase();

  // Reject if it looks like a question or general request
  if (/^(como|qual|quem|quando|onde|por que|porque|posso|você|voce|pode|me |explique|quero|gostaria|preciso|ajuda|fale |meu |minha)/i.test(lower)) return false;

  // Recipe indicators — measurements with numbers
  const hasMedidas = /(\d+[\.,]?\d*)\s*(g|gramas?|kg|quilos?|ml|litros?|l\b|xícara|xicara|colher|pitada|unidade|pacote|lata|caixa|dente|folha|ramo|maço|maco|tablete|envelope|copo|unid)/i.test(lower);

  // Recipe indicators — cooking verbs (infinitive or imperative)
  const verbos = /\b(assar|cozinhar|bater|misturar|picar|cortar|fritar|grelhar|refogar|aquecer|derreter|acrescentar|adicionar|incorporar|despejar|levar|reservar|deixar|peneirar|amassar|sovar|modelar|enrolar|rechear|cobrir|polvilhar|regar|temperar|descascar|ralar|espremer|dissolver|hidratar|escorrer|untar|forrar|pré-aquecer|preaquecer|servir|decorar|finalizar|reduzir|apurar|saltear|selar|assar|empanar|gratinar|flambar|marinar|congelar|gelar|descongelar)\b/i.test(lower);

  // Recipe section markers
  const hasMarcadores = /\b(ingredientes|modo de preparo|preparo|rendimento|porções|porcoes|rende|massa|recheio|cobretura|calda|molho)\b/i.test(lower);

  // Ingredient-like words (common food items)
  const alimentos = /\b(farinha|açúcar|acucar|ovo|leite|manteiga|azeite|sal|pimenta|alho|cebola|arroz|feijão|feijao|macarrão|macarrao|carne|frango|peixe|camarao|camarão|chocolate|creme|queijo|presunto|bacalhau|tomate|batata|cenoira|alface|limão|limao|laranja|banana|maçã|maca|fermento|óleo|oleo|vinagre|molho)\b/i.test(lower);

  return hasMedidas || verbos || hasMarcadores || alimentos;
};

export default function NovaReceitaIA({ open, onClose, onCreated }) {
  const [texto, setTexto] = useState("");
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState(/** @type {any} */ (null));
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const parsedRef = useRef(null);
  parsedRef.current = parsed;
  const [duplicateWarning, setDuplicateWarning] = useState(/** @type {any} */ (null));
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [novoGrupoTitulo, setNovoGrupoTitulo] = useState("");
  const navigate = useNavigate();
  const [similarSuggestions, setSimilarSuggestions] = useState(/** @type {any} */ ({}));
  const [docesAmbiguo, setDocesAmbiguo] = useState(false);
  const [showVariations, setShowVariations] = useState(false);
  const [variationsQty, setVariationsQty] = useState(3);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [variationResults, setVariationResults] = useState(/** @type {any} */ (null));
  const receitaSalvaRef = useRef(/** @type {any} */ (null));
  const [validacaoErro, setValidacaoErro] = useState("");

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => base44.entities.Receita.list("-nome", 200),
  });

  const handleParse = async () => {
    if (!texto.trim()) { setValidacaoErro("Cole o texto da receita para continuar."); return; }
    if (!isRecipeText(texto)) {
      setValidacaoErro("Este texto não parece ser uma receita. Cole os ingredientes e o modo de preparo para que a IA possa estruturar.");
      return;
    }
    setProcessing(true);
    setDocesAmbiguo(false);
    try {
      const ingNames = ingredientes.map(i => i.nome).join(", ");
      const recBasicasNomes = receitasBasicas.map(r => r.nome).join(", ");

      const tabelaPrompt = gerarTabelaPrompt();

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analise este texto de receita e extraia os dados estruturados.

${tabelaPrompt}

IMPORTANTE SOBRE CONVERSÃO:
- Use a tabela acima para converter medidas caseiras para gramas
- Priorize SEMPRE as conversões por ingrediente (se o ingrediente está na tabela, use o valor exato)
- Se não houver conversão específica para o ingrediente, use a medida padrão como fallback
- Para medidas marcadas com ⚠️, ainda assim converta usando o valor padrão (o ⚠️ é para revisão humana depois)
- NÃO invente valores de conversão — use apenas os da tabela
        
Ingredientes disponíveis no banco (use APENAS correspondência EXATA): ${ingNames}

Receitas Básicas disponíveis (se um ingrediente corresponder a uma receita básica, marque como subreceita usando o campo eh_receita_basica=true): ${recBasicasNomes}

Texto da receita:
${texto}

IMPORTANTE: 
- Use SOMENTE os ingredientes fornecidos pelo usuário no texto. NUNCA adicione, invente, infira ou sugira ingredientes que não estejam explicitamente listados.
- REMOVA marcas comerciais dos nomes dos ingredientes. Ex: "Manteiga com Sal Piracanjuba" → "Manteiga com sal", "Creme de Leite Itambé" → "Creme de leite", "Farinha de Trigo Renata" → "Farinha de trigo", "Leite Condensado Moça" → "Leite condensado", "Fermento em Pó Royal" → "Fermento em pó", "Amido de Milho Maizena" → "Amido de milho". NUNCA registre ou associe ingredientes pelo nome da marca — sempre use o nome genérico.
- CORRIJA erros de digitação ÓBVIOS nos nomes dos ingredientes (ex: "perito" → "peito", "frago" → "frango", "açucar" → "açúcar", "farinah" → "farinha"). Use o nome CORRIGIDO no campo nome_banco.
- NÃO substitua um ingrediente por outro DIFERENTE (ex: "Ovo" NÃO é "Gema", "Filé de frango" NÃO é "Peito de frango"). Só corrija erros de grafia.
- Se NENHUM ingrediente do banco corresponder (mesmo após correção), deixe nome_banco VAZIO.
- Se um ingrediente estiver escrito como "X ou Y" (ex: "manteiga ou margarina"), NÃO escolha um — mantenha o texto AMBÍGUO completo como nome_original para que o usuário decida depois.
- Se o ingrediente parecer ser uma RECEITA BÁSICA (ex: "Molho Bechamel", "Massa de pizza", "Calda de chocolate"), marque eh_receita_basica=true e coloque o nome da receita em nome_banco MESMO que não seja uma correspondência exata — o sistema confirmará depois.
- Converta SEMPRE medidas caseiras para gramas usando a tabela acima
- NÃO invente porções: se o texto mencionar explicitamente quantas porções rende, use esse valor. Se NÃO mencionar, deixe porcoes_base = 0 (zero).
- NÃO invente categoria — a categoria será determinada pelo sistema com base nos ingredientes. Se a receita tiver MAIS DE 2 ingredientes da categoria DOCES (chocolate, cacau, açúcar, baunilha, chantilly, doce de leite, leite condensado, glucose, mel, gelatina, coco ralado, goiabada, etc.), sugira APENAS "Sobremesas" e/ou "Pães e Bolos" — NUNCA "Prato Principal", "Acompanhamento", "Entradas" ou qualquer outra categoria.
- O modo de preparo deve ser REWRITTEN seguindo ESTRITAMENTE este padrão:
  * Lista numerada (1. 2. 3.)
  * UM verbo de ação por item, no INFINITIVO (Derreter, Bater, Acrescentar, Assar, Reservar)
  * NUNCA use imperativo (Derreta, Bata, Acrescente) — apenas infinitivo
  * NENHUM texto narrativo, dicas, sugestões ou comentários
  * NENHUMA especificação de equipamento ou marca (nada de "Batedeira KitchenAid", "Processador X", "liquidificador", "batedeira", "fogão", etc.)
  * Cada passo deve ser AUTOSSUFICIENTE — inclua o verbo de ação + objeto breve para que faça sentido lido isoladamente. Nunca omita o ingrediente para evitar repetição entre passos.
  * Temperatura e tempo na mesma linha da ação, quando relevantes
  Exemplo correto:
  1. Derreter o chocolate com a manteiga em banho-maria. Reservar.
  2. Bater os ovos com o açúcar até formar creme fofo e esbranquiçado.
  3. Incorporar a farinha e mexer até homogeneizar.
  4. Acrescentar o fermento peneirado e misturar delicadamente.
  5. Despejar a massa em forma untada e polvilhada.
  6. Assar a 180 °C por 20 minutos.
  7. Retirar do forno e aguardar esfriar para cortar.
- MANTENHA a ordem exata dos ingredientes como aparecem no texto original — NÃO reordene com base no modo de preparo.`,
        response_json_schema: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da receita" },
            categorias: { type: "array", items: { type: "string" }, description: "Categorias sugeridas: Carnes Bovinas e Suínos, Aves, Peixes e Frutos do Mar, Ovos, Massas, Pastelão e Quiches, Arroz e Risotos, Sopas e Caldos, Leguminosas, Salgadinhos, Pães e Bolos, Sobremesas, Molhos, Acompanhamentos, Entradas, Saladas, Lanches, Receitas Base" },
            porcoes_base: { type: "number" },
            unidade_base: { type: "string", enum: ["g", "ml"] },
            modo_preparo: { type: "string" },
            ingredientes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nome_original: { type: "string", description: "Nome como aparece no texto" },
                  nome_banco: { type: "string", description: "Nome mais próximo no banco de ingredientes ou receitas básicas" },
                  eh_receita_basica: { type: "boolean", description: "True se for uma receita básica, não ingrediente" },
                  pre_preparo: { type: "string" },
                  quantidade_g: { type: "number", description: "Quantidade em gramas ou ml" },
                  medida_original: { type: "string", description: "Medida como aparece no texto (ex: 2 xícaras)" }
                }
              }
            },
            tags_sugeridas: {
              type: "array",
              items: { type: "string" },
              description: "Tags sugeridas para a receita. Use APENAS tags desta lista: 'Molho vermelho','Molho branco','Molho escuro','Molho agridoce','Molho de manteiga','Sem molho','Carne moída','Carne desfiada','Frango desfiado','Ovo','Prato único','Vegetariana','Vegana','Funcional','Low carb','Proteica','Integral','Sem glúten','Sem lactose','Sem pimentão','Sem pimenta','Sem alho','Sem cebola','Sem ovos','Sem açúcar','Air Fryer','Forno','Vapor','Grelhado','Frito','Cozido','Sem fogo / Cru','Freezer','Rende muito','Rápido — até 30 min','Para criança','Para dieta','Para festa','Comfort food'. Regras gerais: se tem vegetais sem carne → 'Vegetariana'. Se menciona 'air fryer' → 'Air Fryer'. Se menciona 'forno'/'assar' → 'Forno'. Se não tem farinha de trigo/farinha comum → 'Sem glúten'. Se o tempo total ≤ 30 min → 'Rápido — até 30 min'. Se tem carne moída → 'Carne moída'. IMPORTANTE PARA SOBREMESAS E PÃES E BOLOS: se a receita for das categorias 'Sobremesas' ou 'Pães e Bolos', sugira APENAS tags da lista restrita: 'Sem Glúten', 'Sem Lactose', 'Air Fryer', 'Forno'. Nunca sugira 'Vegetariana', 'Vegana', 'Low carb' ou outras tags fora dessa lista para essas categorias."
            }
          }
        }
      });
      // Strip brands from AI-parsed ingredient names (safety net)
      (result.ingredientes || []).forEach(ing => {
        if (ing.tipo === "grupo") return;
        if (ing.nome_banco) ing.nome_banco = removerMarca(ing.nome_banco);
        if (ing.nome_original) ing.nome_original = removerMarca(ing.nome_original);
      });

      // Auto-categorize based on ingredient names
      const ingNomes = (result.ingredientes || []).filter(i => i.tipo !== "grupo").map(i => i.nome_banco || i.nome_original);
      const catAuto = categorizarPorIngredientes(ingNomes);
      if (catAuto.length > 0 && (!result.categorias || result.categorias.length === 0)) result.categorias = catAuto;
      
      // Post-process: check if any nome_banco matches a receita básica even without the flag
      (result.ingredientes || []).forEach((ing, i) => {
        if (ing.tipo === "grupo" || ing.eh_receita_basica) return;
        if (ing.nome_banco) {
          const recMatch = receitasBasicas.find(r => r.nome?.toUpperCase() === ing.nome_banco?.toUpperCase());
          if (recMatch && !ingredientes.find(bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase())) {
            ing.eh_receita_basica = true;
          }
        }
      });

      // Post-process: detect "X ou Y" ambiguous ingredients
      (result.ingredientes || []).forEach((ing) => {
        if (ing.tipo === "grupo") return;
        const nome = (ing.nome_banco || ing.nome_original || "").toLowerCase();
        const match = nome.match(/\b(.+?)\s+ou\s+(.+)/i);
        if (match) {
          ing.ambiguo_opcoes = [match[1].trim(), match[2].trim()];
          ing.ambiguo_selecionado = null;
        }
      });

      setParsed(result);
      
      // Match suggested tags to actual tag IDs — filter for Sobremesas/Pães e Bolos
      const allTags = await base44.entities.Tag.list("nome", 200);
      const sugestoes = result.tags_sugeridas || [];
      const categoriasResult = catAuto.length > 0 ? catAuto : (result.categorias || []);
      const isDoce = categoriasResult.some(c => c === "Sobremesas" || c === "Pães e Bolos");
      const TAGS_PERMITIDAS_DOCES = ["Sem Glúten", "Sem Lactose", "Air Fryer", "Forno"];
      const matchedIds = [];
      for (const nome of sugestoes) {
        if (isDoce && !TAGS_PERMITIDAS_DOCES.includes(nome)) continue;
        const tag = allTags.find(t => t.nome === nome);
        if (tag) matchedIds.push(tag.id);
      }
      setSelectedTagIds(matchedIds);
      
      // Run similarity search for ingredients AND receitas básicas without exact match
      const newSugs = {};
      const newRecSugs = {}; // separate suggestions for receitas básicas
      (result.ingredientes || []).forEach((ing, i) => {
        if (ing.tipo === "grupo") return;
        if (ing.nome_banco) return; // already matched
        const busca = (ing.nome_original || "").toLowerCase();
        if (!busca) return;
        // Search ingredients (ranked: exact > startsWith > whole word > contains)
        const similares = buscarIngredientesRanqueado(busca, ingredientes, 5);
        if (similares.length > 0 && !similares.some(s => s.nome?.toLowerCase() === busca)) {
          newSugs[i] = similares;
        }
        // Search receitas básicas too
        const palavras = busca.replace(/[,\/\(\)]/g, " ").split(/\s+/).filter(p => p.length >= 3 && !["com", "sem", "para", "dos", "das", "aos", "de"].includes(p));
        if (palavras.length > 0) {
          const recSimilares = receitasBasicas.filter(r => {
            const rNome = (r.nome || "").toLowerCase();
            return palavras.some(p => rNome.includes(p));
          }).slice(0, 3);
          if (recSimilares.length > 0) {
            newRecSugs[i] = recSimilares;
          }
        }
      });
      setSimilarSuggestions({ ingredientes: newSugs, receitas: newRecSugs });

      // Detect DOCES category ambiguity: >2 ingredients from DOCES → "Sobremesas" or "Pães e Bolos"
      const docesCount = (result.ingredientes || []).filter(ing => {
        if (ing.tipo === "grupo" || ing.eh_receita_basica) return false;
        if (!ing.nome_banco) return false;
        const dbIng = ingredientes.find(bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase());
        return dbIng?.categoria === "DOCES";
      }).length;
      if (docesCount > 2) {
        // Restrict categories to only Sobremesas/Pães e Bolos — never Prato Principal, etc.
        const docesCats = ["Sobremesas", "Pães e Bolos"];
        result.categorias = (result.categorias || []).filter(c => docesCats.includes(c));
        if (result.categorias.length === 0) result.categorias = [];
        setParsed({ ...result });
      }
      setDocesAmbiguo(docesCount > 2);
    } catch (err) {
      toast.error("Erro ao processar: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const updateIngrediente = (idx, field, value) => {
    const novos = [...(parsed.ingredientes || [])];
    novos[idx] = { ...novos[idx], [field]: value };
    setParsed({ ...parsed, ingredientes: novos });
  };

  const removeIngrediente = (idx) => {
    const novos = (parsed.ingredientes || []).filter((_, i) => i !== idx);
    setParsed({ ...parsed, ingredientes: novos });
  };

  const handleAddGrupo = () => {
    if (!novoGrupoTitulo.trim()) return;
    setParsed({ ...parsed, ingredientes: [...(parsed.ingredientes || []), { tipo: "grupo", titulo_grupo: novoGrupoTitulo.trim().toUpperCase() }] });
    setNovoGrupoTitulo("");
    setShowAddGrupo(false);
  };

  const temZero = (parsed?.ingredientes || []).some(ing => ing.tipo !== "grupo" && (ing.quantidade_g || 0) === 0);
  const temAmbiguo = (parsed?.ingredientes || []).some(ing => ing.ambiguo_opcoes && !ing.ambiguo_selecionado);

  const pendencias = useMemo(() => {
    if (!parsed?.ingredientes) return [];
    const lista = [];
    (parsed.ingredientes || []).forEach((ing, idx) => {
      if (ing.tipo === "grupo") return;
      const nome = ing.nome_banco || ing.nome_original || "(sem nome)";
      if ((ing.quantidade_g || 0) === 0) {
        lista.push({ idx, nome, tipo: "quantidade", mensagem: `"${nome}" está sem quantidade` });
      }
      if (ing.ambiguo_opcoes && !ing.ambiguo_selecionado) {
        lista.push({ idx, nome, tipo: "ambiguo", mensagem: `"${nome}" é ambíguo (${ing.ambiguo_opcoes.join(" ou ")}) — escolha um` });
      }
    });
    return lista;
  }, [parsed?.ingredientes]);

  const temPendencias = pendencias.length > 0;

  const doSave = async () => {
    const p = parsedRef.current;
    if (!p) return;
    setSaving(true);
    try {
      const passosFormatados = formatarModoPreparo(p.modo_preparo);
      const modoPreparoFinal = juntarPassos(passosFormatados);

      // Calculate rendimento from ingredients
      const rendimentoCalc = (p.ingredientes || []).reduce((acc, ing) => acc + (ing.tipo === "grupo" ? 0 : (ing.quantidade_g || 0)), 0);
      
      // Auto-categorize if not set
      const ingNomes = (p.ingredientes || []).filter(i => i.tipo !== "grupo").map(i => i.nome_banco || i.nome_original);
      const catAuto = p.categorias?.length > 0 ? p.categorias : categorizarPorIngredientes(ingNomes);
      
      const porcoes = normalizarPorcoesBase(p.porcoes_base, 0);
      const semCategoria = !catAuto || catAuto.length === 0;
      
      const receita = await criarReceitaSegura({
        nome: p.nome?.toUpperCase(),
        categorias: semCategoria ? [] : catAuto,
        revisar: false,
        porcoes_base: porcoes,
        unidade_base: p.unidade_base || "g",
        modo_preparo: modoPreparoFinal,
        rendimento_total: rendimentoCalc,
        custo_total: 0,
        custo_por_porcao: 0,
      });
      await confirmarPorcoesBase(base44.entities.Receita, receita.id, porcoes);

      // Save tags
      for (const tagId of selectedTagIds) {
        const tag = await base44.entities.Tag.get(tagId);
        if (tag) {
          await criarReceitaTag({
            receita_id: receita.id,
            tag_id: tag.id,
            tag_nome: tag.nome,
            tag_grupo: tag.grupo,
            tag_cor: tag.cor,
          });
        }
      }

      // ── Estimate prices for new ingredients in batch ──
      const novosNomes = [];
      for (const ing of (p.ingredientes || [])) {
        if (ing.tipo === "grupo") continue;
        const nomeBusca = ing.nome_banco || ing.nome_original;
        if (!nomeBusca) continue;
        const found = ingredientes.find(bi => bi.nome?.toLowerCase() === nomeBusca.toLowerCase());
        if (!found) novosNomes.push(nomeBusca);
      }
      const precosEstimados = {};
      if (novosNomes.length > 0) {
        try {
          const resultado = await base44.integrations.Core.InvokeLLM({
            prompt: `Estime o preço médio de mercado no Brasil (em R$) para cada ingrediente abaixo, na unidade de compra indicada. Busque preços atuais (2025-2026) em supermercados e atacadistas brasileiros.\n\n${novosNomes.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
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
              // Normalize key: strip parenthetical text to match against nomeCriar lookup
              const key = pe.nome.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
              precosEstimados[key] = pe;
              // Also store with the original name as fallback
              precosEstimados[pe.nome.toLowerCase()] = pe;
            }
          });
        } catch { /* segue sem preços estimados */ }
      }

      // Link ingredients
      for (let i = 0; i < (p.ingredientes || []).length; i++) {
        const ing = p.ingredientes[i];

        // Group header
        if (ing.tipo === "grupo") {
          await criarIngredienteReceita({
            receita_id: receita.id,
            tipo: "grupo",
            titulo_grupo: ing.titulo_grupo,
            ordem: i,
          });
          continue;
        }

        // Check if it's a receita básica
        let matchedRecBasica = null;
        if (ing.eh_receita_basica && ing.nome_banco) {
          matchedRecBasica = receitasBasicas.find(
            r => r.nome?.toUpperCase() === ing.nome_banco?.toUpperCase()
          );
        }

        // If receita básica matched, create as subreceita
        if (matchedRecBasica) {
          const qtdPorPorcao = (ing.quantidade_g || 0) / (p.porcoes_base || 1);
          await criarIngredienteReceita({
            receita_id: receita.id,
            tipo: "subreceita",
            subreceita_id: matchedRecBasica.id,
            subreceita_nome: matchedRecBasica.nome,
            quantidade_por_porcao: qtdPorPorcao,
            ordem: i,
          });
          continue;
        }

        // Find matching ingredient in bank — exact match only
        let matchedIng = null;
        if (ing.nome_banco) {
          matchedIng = ingredientes.find(
            bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase()
          );
        }
        // If not found, create it with nome_original
        if (!matchedIng) {
          const nomeCriar = ing.nome_banco || ing.nome_original;
          // Check if it already exists in the DB (maybe created since fetch)
          const existente = await base44.entities.Ingrediente.filter({ nome: nomeCriar });
          if (existente.length > 0) {
            matchedIng = existente[0];
          } else {
            const unidade = sugerirUnidadeCompra(nomeCriar);
            // Normalize lookup key: strip parenthetical text for matching
            const lookupKey = nomeCriar.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
            const estimado = precosEstimados[lookupKey] || precosEstimados[nomeCriar.toLowerCase()];
            const precoEmb = estimado?.preco_embalagem_rs || 0;
            const pesoEmb = estimado?.peso_embalagem_g || unidade.peso_embalagem_g;
            const precoPorG = pesoEmb > 0 ? precoEmb / pesoEmb : 0;
            matchedIng = await base44.entities.Ingrediente.create({
              nome: toSentenceCaseName(nomeCriar),
              categoria: "A Revisar",
              unidade_compra: unidade.unidade_compra,
              peso_embalagem_g: pesoEmb,
              preco_embalagem_rs: precoEmb,
              preco_por_g_rs: precoPorG,
              fator_correcao: 1.0,
              preco_estimado: true,
              fonte_preco: precoEmb > 0 ? "IA web" : "Manual",
            });
          }
        }
        const qtdPorPorcao = (ing.quantidade_g || 0) / (p.porcoes_base || 1);
        await criarIngredienteReceita({
          receita_id: receita.id,
          ingrediente_id: matchedIng.id,
          ingrediente_nome: matchedIng.nome,
          pre_preparo: ing.pre_preparo || "",
          quantidade_por_porcao: qtdPorPorcao,
          medida_caseira: ing.medida_original || "",
          ordem: i,
        });
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      if (duplicateWarning) toast.warning("Receita salva com nome similar");
      else toast.success("Receita importada com sucesso!");
      receitaSalvaRef.current = receita;
      setShowVariations(true);
    } catch (err) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
      setDuplicateWarning(null);
    }
  };

  const handleSave = async () => {
    const p = parsedRef.current;
    if (!p) return;
    if (temZero) { toast.error("Preencha a quantidade de todos os ingredientes antes de salvar."); return; }
    if (temAmbiguo) { toast.error("Escolha um produto específico para cada ingrediente ambíguo (X ou Y) antes de salvar."); return; }

    const todas = await base44.entities.Receita.list("-nome", 1000);
    const fuzzy = buscarFuzzy(p.nome, todas);

    if (fuzzy) {
      setDuplicateWarning(fuzzy.receita);
    } else {
      doSave();
    }
  };

  const handleGenerateVariations = async () => {
    const receita = receitaSalvaRef.current;
    const p = parsedRef.current;
    if (!receita || !p) return;
    setGeneratingVariations(true);
    try {
      const ingsList = (p.ingredientes || []).filter(i => i.tipo !== "grupo");
      const ingsPrompt = ingsList.map((ing, j) =>
        `${j}. ${ing.nome_banco || ing.nome_original} (${ing.quantidade_g || 0}g)`
      ).join("\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Receita original: "${p.nome}"

Ingredientes (índice, nome, quantidade, tipo):
${ingsPrompt}

Sugira ${variationsQty} variações temáticas trocando APENAS o ingrediente principal (proteína ou elemento central) por alternativas culinárias coerentes. O restante (base, modo de preparo, temperos) permanece igual.

Para cada variação, retorne:
- novo_nome: nome completo da receita com o ingrediente trocado. Ex: "PASTELÃO DE FRANGO" → "PASTELÃO DE CARNE MOÍDA", "PASTELÃO DE LEGUMES"
- indice_ingrediente: índice numérico (0-based) do ingrediente principal a ser trocado na lista acima
- novo_ingrediente: nome do ingrediente substituto (use nomes que já existam no banco ou nomes comuns de mercado)
- nova_categoria: uma categoria do sistema que melhor se encaixa (ex: "Carne Bovina", "Aves", "Peixes e Frutos do Mar", "Leguminosas", "Massas, Pastelão e Quiches", "Acompanhamento")`,
        response_json_schema: {
          type: "object",
          properties: {
            variacoes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  novo_nome: { type: "string" },
                  indice_ingrediente: { type: "number" },
                  novo_ingrediente: { type: "string" },
                  nova_categoria: { type: "string" }
                }
              }
            }
          }
        }
      });

      setVariationResults(result.variacoes || []);
    } catch (err) {
      toast.error("Erro ao gerar variações: " + err.message);
      setShowVariations(false);
    } finally {
      setGeneratingVariations(false);
    }
  };

  const handleSaveVariations = async () => {
    if (!variationResults?.length) return;
    const p = parsedRef.current;
    if (!p) return;
    setGeneratingVariations(true);
    try {
      const ingsOriginal = (p.ingredientes || []).filter(i => i.tipo !== "grupo");
      const modoPreparoFinal = juntarPassos(formatarModoPreparo(p.modo_preparo));

      let criadas = 0;
      for (const variacao of variationResults) {
        if (!variacao.novo_nome) continue;

        // Build ingredients: copy original, swap the target ingredient
        const novosIngredientes = ingsOriginal.map((ing, j) => {
          if (j === variacao.indice_ingrediente) {
            return { ...ing, nome_banco: variacao.novo_ingrediente, nome_original: variacao.novo_ingrediente };
          }
          return { ...ing };
        });

        // Match new ingredient in DB or create it
        const ingNomesFinais = [];
        for (const ing of novosIngredientes) {
          const nomeBusca = ing.nome_banco || ing.nome_original;
          if (!nomeBusca) continue;
          let found = ingredientes.find(bi => bi.nome?.toLowerCase() === nomeBusca.toLowerCase());
          if (!found) {
            const existente = await base44.entities.Ingrediente.filter({ nome: nomeBusca });
            if (existente.length > 0) {
              found = existente[0];
            } else {
              const unidade = sugerirUnidadeCompra(nomeBusca);
              found = await base44.entities.Ingrediente.create({
                nome: toSentenceCaseName(nomeBusca),
                categoria: "A Revisar",
                unidade_compra: unidade.unidade_compra,
                peso_embalagem_g: unidade.peso_embalagem_g,
                preco_embalagem_rs: 0,
                preco_por_g_rs: 0,
                fator_correcao: 1.0,
                preco_estimado: true,
              });
            }
          }
          ingNomesFinais.push({ ...ing, matched: found });
        }

        const rendimentoCalc = novosIngredientes.reduce((acc, ing) => acc + (ing.quantidade_g || 0), 0);
        const novaReceita = await criarReceitaSegura({
          nome: variacao.novo_nome.toUpperCase(),
          categorias: variacao.nova_categoria ? [variacao.nova_categoria] : (p.categorias || []),
          revisar: false,
          porcoes_base: p.porcoes_base || 0,
          unidade_base: p.unidade_base || "g",
          modo_preparo: modoPreparoFinal,
          rendimento_total: rendimentoCalc,
          custo_total: 0,
          custo_por_porcao: 0,
        });

        for (let i = 0; i < ingNomesFinais.length; i++) {
          const ing = ingNomesFinais[i];
          if (!ing.matched) continue;
          await criarIngredienteReceita({
            receita_id: novaReceita.id,
            ingrediente_id: ing.matched.id,
            ingrediente_nome: ing.matched.nome,
            pre_preparo: ing.pre_preparo || "",
            quantidade_por_porcao: (ing.quantidade_g || 0) / (p.porcoes_base || 1),
            medida_caseira: ing.medida_original || "",
            ordem: i,
            tipo: "ingrediente",
          });
        }
        criadas++;
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success(`${criadas} variações criadas`);
    } catch (err) {
      toast.error("Erro ao salvar variações: " + err.message);
    } finally {
      setGeneratingVariations(false);
      setShowVariations(false);
      if (receitaSalvaRef.current) onCreated(receitaSalvaRef.current.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Colar receita (IA estrutura)
          </DialogTitle>
          <DialogDescription>
            Cole o texto da receita (da internet, PDF ou suas anotações) e a IA organiza ingredientes, quantidades e modo de preparo automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          <div className="space-y-4">
            <Textarea
              rows={10}
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setValidacaoErro(""); }}
              placeholder="Cole aqui o texto da receita..."
              className={`text-sm ${validacaoErro ? "border-red-400 focus-visible:ring-red-400" : ""}`}
            />
            {validacaoErro && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{validacaoErro}</span>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleParse} disabled={processing}>
                {processing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Processando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Estruturar Receita</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-accent rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">Revise os dados antes de salvar</p>
            </div>

            {/* Banner de pendências */}
            {temPendencias && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1.5">
                <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  {pendencias.length} {pendencias.length === 1 ? "pendência impede" : "pendências impedem"} o salvamento:
                </p>
                <ul className="space-y-0.5">
                  {pendencias.map((p) => (
                    <li key={`pend-${p.idx}-${p.tipo}`} className="text-xs text-red-600 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span>
                      <span>{p.mensagem}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={parsed.nome || ""} onChange={(e) => setParsed({ ...parsed, nome: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <CategoriaPicker value={parsed.categorias || []} onChange={(v) => setParsed({ ...parsed, categorias: v })} />
                {docesAmbiguo && (
                  <div className="mt-2 p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-700 mb-2">
                      🍰 Vários ingredientes da categoria <strong>DOCES</strong> detectados — esta receita pode ser <strong>Sobremesas</strong> ou <strong>Pães e Bolos</strong>:
                    </p>
                    <div className="flex gap-1.5">
                      <button
                        className="text-xs px-2.5 py-1 rounded bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 transition-colors font-medium"
                        onClick={() => setParsed({ ...parsed, categorias: ["Sobremesas"] })}
                      >
                        🍮 Sobremesas
                      </button>
                      <button
                        className="text-xs px-2.5 py-1 rounded bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 transition-colors font-medium"
                        onClick={() => setParsed({ ...parsed, categorias: ["Pães e Bolos"] })}
                      >
                        🍞 Pães e Bolos
                      </button>
                      <button
                        className="text-xs px-2.5 py-1 rounded bg-white border border-purple-300 hover:bg-purple-100 text-purple-800 transition-colors font-medium"
                        onClick={() => setParsed({ ...parsed, categorias: ["Sobremesas", "Pães e Bolos"] })}
                      >
                        Ambos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porções</Label>
                <Input 
                  type="number" 
                  value={parsed.porcoes_base || ""} 
                  placeholder="<a definir>" 
                  onChange={(e) => setParsed({ ...parsed, porcoes_base: parseInt(e.target.value) || 0 })} 
                />
              </div>
              <div>
                <Label>Unidade base</Label>
                <Select value={parsed.unidade_base || "g"} onValueChange={(v) => setParsed({ ...parsed, unidade_base: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Gramas</SelectItem>
                    <SelectItem value="ml">Mililitros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs text-muted-foreground -mt-2">
              {(() => {
                const totalG = (parsed.ingredientes || []).reduce((acc, ing) => acc + (ing.tipo === "grupo" ? 0 : (ing.quantidade_g || 0)), 0);
                return (
                  <span>
                    Rendimento estimado: <strong>{totalG}g</strong> · Porções: <strong>{parsed.porcoes_base ? parsed.porcoes_base : "<a definir>"}</strong>
                  </span>
                );
              })()}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Ingredientes identificados</Label>
                <div className="flex items-center gap-2">
                  {temZero && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Preencha as quantidades faltantes
                    </span>
                  )}
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setShowAddGrupo(!showAddGrupo)}>
                    <Plus className="w-3 h-3 mr-1" /> Sub-título
                  </Button>
                </div>
              </div>

              {showAddGrupo && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-accent/50 rounded-lg">
                  <Input
                    placeholder="Nome do grupo (ex: MOLHO PROVOLONE)"
                    value={novoGrupoTitulo}
                    onChange={(e) => setNovoGrupoTitulo(e.target.value)}
                    className="h-8 text-sm flex-1"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddGrupo(); if (e.key === "Escape") { setShowAddGrupo(false); setNovoGrupoTitulo(""); } }}
                  />
                  <Button size="sm" onClick={handleAddGrupo} disabled={!novoGrupoTitulo.trim()}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowAddGrupo(false); setNovoGrupoTitulo(""); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {(parsed.ingredientes || []).map((ing, idx) => {
                  if (ing.tipo === "grupo") {
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/30 border-dashed rounded-lg text-sm">
                        <span className="flex-1 font-bold text-xs text-primary uppercase tracking-wide">{ing.titulo_grupo}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeIngrediente(idx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  }
                  const found = ingredientes.find(bi => bi.nome?.toLowerCase() === ing.nome_banco?.toLowerCase());
                  const isRecBasica = ing.eh_receita_basica && receitasBasicas.find(r => r.nome?.toUpperCase() === ing.nome_banco?.toUpperCase());
                  const isZero = (ing.quantidade_g || 0) === 0;
                  const sugs = (similarSuggestions.ingredientes || {})[idx] || [];
                  const recSugs = (similarSuggestions.receitas || {})[idx] || [];
                  const hasSuggestion = !found && !isRecBasica && (sugs.length > 0 || recSugs.length > 0);
                  const conv = converterMedida(ing.medida_original || "", ing.nome_banco || ing.nome_original || "");
                  
                  const isAmbiguo = ing.ambiguo_opcoes && !ing.ambiguo_selecionado;

                  const acceptAmbiguo = (opcao) => {
                    updateIngrediente(idx, "ambiguo_selecionado", opcao);
                    updateIngrediente(idx, "nome_original", opcao);
                  };

                  const acceptSimilar = (sugIng) => {
                    const novos = [...(parsed.ingredientes || [])];
                    novos[idx] = { ...novos[idx], nome_banco: sugIng.nome, eh_receita_basica: false };
                    setParsed({ ...parsed, ingredientes: novos });
                    const newSugs = { ingredientes: { ...(similarSuggestions.ingredientes || {}) }, receitas: { ...(similarSuggestions.receitas || {}) } };
                    delete newSugs.ingredientes[idx];
                    delete newSugs.receitas[idx];
                    setSimilarSuggestions(newSugs);
                  };

                  const acceptRecBasica = (rec) => {
                    const novos = [...(parsed.ingredientes || [])];
                    novos[idx] = { ...novos[idx], nome_banco: rec.nome, eh_receita_basica: true };
                    setParsed({ ...parsed, ingredientes: novos });
                    const newSugs = { ingredientes: { ...(similarSuggestions.ingredientes || {}) }, receitas: { ...(similarSuggestions.receitas || {}) } };
                    delete newSugs.ingredientes[idx];
                    delete newSugs.receitas[idx];
                    setSimilarSuggestions(newSugs);
                  };
                  
                  return (
                    <div key={idx} className={`p-2 rounded-lg border text-sm ${isZero ? "bg-amber-50 border-amber-300" : "bg-card"}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {isRecBasica ? <ChefHat className="w-3.5 h-3.5 text-green-600 shrink-0" /> : found ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : hasSuggestion ? <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            <span className="font-medium truncate">{ing.nome_banco || ing.nome_original}</span>
                            {isRecBasica && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 bg-green-100 text-green-700">Receita</Badge>}
                          </div>
                          {isAmbiguo && (
                            <div className="ml-5 mt-1.5 p-2 bg-amber-50 rounded border border-amber-300">
                              <p className="text-xs text-amber-700 mb-1.5 font-medium">
                                Ingrediente ambíguo — escolha um:
                              </p>
                              <div className="flex gap-1.5">
                                {ing.ambiguo_opcoes.map((opcao, oi) => (
                                  <button
                                    key={oi}
                                    className="text-xs px-2.5 py-1 rounded bg-white border border-amber-400 hover:bg-amber-100 text-amber-900 transition-colors font-medium"
                                    onClick={() => acceptAmbiguo(opcao)}
                                  >
                                    {opcao}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-1 ml-5 mt-1">
                            {conv.displayText && (
                              <span className={`text-xs ${conv.alerta ? "text-amber-600" : "text-muted-foreground"}`}>
                                {conv.displayText}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                className={`h-6 w-20 text-xs text-center ${isZero ? "border-amber-400" : ""}`}
                                value={ing.quantidade_g || ""}
                                placeholder="0"
                                onChange={(e) => updateIngrediente(idx, "quantidade_g", parseFloat(e.target.value) || 0)}
                              />
                              <span className="text-xs text-muted-foreground">g</span>
                            </div>
                            {isZero && (
                              <span className="text-xs text-amber-600 font-medium">
                                {isRecBasica ? "Quantidade a usar (g)" : "Informe a quantidade"}
                              </span>
                            )}
                            {ing.pre_preparo && <span className="text-xs text-muted-foreground">· {ing.pre_preparo}</span>}
                          </div>
                          {/* Similarity suggestion */}
                          {hasSuggestion && (
                            <div className="ml-5 mt-1.5 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs text-blue-700 mb-1">
                                Encontramos no banco. É esse?
                              </p>
                              {sugs.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  {sugs.map((sug, si) => (
                                    <button
                                      key={`ing-${si}`}
                                      className="text-xs px-2 py-1 rounded bg-white border border-blue-300 hover:bg-blue-100 text-blue-800 transition-colors"
                                      onClick={() => acceptSimilar(sug)}
                                    >
                                      {sug.nome}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {recSugs.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-1.5">
                                  {recSugs.map((rec, si) => (
                                    <button
                                      key={`rec-${si}`}
                                      className="text-xs px-2 py-1 rounded bg-white border border-green-300 hover:bg-green-100 text-green-800 transition-colors flex items-center gap-1"
                                      onClick={() => acceptRecBasica(rec)}
                                    >
                                      <ChefHat className="w-3 h-3" /> {rec.nome}
                                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Receita</Badge>
                                    </button>
                                  ))}
                                </div>
                              )}
                              <button
                                className="text-xs px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                onClick={() => {
                                  const newSugs = { ingredientes: { ...(similarSuggestions.ingredientes || {}) }, receitas: { ...(similarSuggestions.receitas || {}) } };
                                  delete newSugs.ingredientes[idx];
                                  delete newSugs.receitas[idx];
                                  setSimilarSuggestions(newSugs);
                                }}
                              >
                                Cadastrar "{ing.nome_original}" novo
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!found && !isRecBasica && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{hasSuggestion ? "?" : "Novo"}</span>}
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeIngrediente(idx)}>
                            <AlertCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Tags sugeridas</Label>
              <TagSelector
                selectedIds={selectedTagIds}
                onToggle={(tag) => {
                  setSelectedTagIds(prev =>
                    prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                  );
                }}
                triggerLabel="Adicionar/editar tags"
              />
              {selectedTagIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedTagIds.length} tag(s) selecionada(s)</p>
              )}
            </div>

            <div>
              <Label>Modo de preparo</Label>
              <Textarea rows={4} value={parsed.modo_preparo || ""} onChange={(e) => setParsed({ ...parsed, modo_preparo: e.target.value })} placeholder={"Lista numerada. Verbos no infinitivo. Sem marcas, sem dicas. Ex:\n1. Derreter o chocolate em banho-maria. Reservar.\n2. Bater os ovos com o açúcar até formar creme fofo.\n3. Assar a 180 °C por 25 minutos."} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setParsed(null); setDocesAmbiguo(false); }}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving || temZero || temAmbiguo}>
                {saving ? "Salvando..." : "Salvar Receita"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {duplicateWarning && (
        <Dialog open={true} onOpenChange={() => setDuplicateWarning(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Receita similar encontrada</DialogTitle>
              <DialogDescription className="text-sm">
                Já existe uma receita cadastrada com este nome: <strong>"{duplicateWarning.nome}"</strong>.
                Deseja mesmo salvar como uma nova receita, ou prefere editar a receita existente?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => {
                setDuplicateWarning(null);
                onClose();
                navigate(`/receita/${duplicateWarning.id}`);
              }}>
                Editar existente
              </Button>
              <Button onClick={doSave}>
                Salvar mesmo assim
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {showVariations && (
        <Dialog open={true} onOpenChange={() => { setShowVariations(false); onCreated(receitaSalvaRef.current?.id); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Criar variações temáticas
              </DialogTitle>
              <DialogDescription className="text-sm">
                A receita <strong>"{receitaSalvaRef.current?.nome}"</strong> foi salva. Quer gerar variações trocando o ingrediente principal?
              </DialogDescription>
            </DialogHeader>

            {!variationResults ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Label className="shrink-0">Quantas variações?</Label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          variationsQty === n
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent"
                        }`}
                        onClick={() => setVariationsQty(n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => { setShowVariations(false); onCreated(receitaSalvaRef.current?.id); }}>
                    Pular
                  </Button>
                  <Button onClick={handleGenerateVariations} disabled={generatingVariations}>
                    {generatingVariations ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Gerando...</> : <><Sparkles className="w-4 h-4 mr-1" /> Gerar {variationsQty} variações</>}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {variationResults.length} variações sugeridas:
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {variationResults.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-sm">
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-medium truncate">{v.novo_nome?.toUpperCase() || `Variação ${i + 1}`}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">↳ {v.novo_ingrediente}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => { setShowVariations(false); onCreated(receitaSalvaRef.current?.id); }}>
                    Pular
                  </Button>
                  <Button onClick={handleSaveVariations} disabled={generatingVariations}>
                    {generatingVariations ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Salvando...</> : <>Salvar {variationResults.length} variações</>}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}