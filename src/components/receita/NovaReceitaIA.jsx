import { useState, useRef } from "react";
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
import CategoriaPicker, { CATEGORIAS } from "@/components/receita/CategoriaPicker";
import TagSelector from "@/components/tags/TagSelector";
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import { normalizarNome } from "@/lib/normalizarNome";
import { converterMedida, gerarTabelaPrompt } from "@/lib/conversorMedidas";

// ── Auto-category from ingredients ──
const categorizarPorIngredientes = (ingredientesNomes) => {
  const all = (ingredientesNomes || []).join(" ").toLowerCase();
  if (!all) return "";
  const has = (words) => words.some(w => all.includes(w));
  if (has(["chocolate", "cacau", "açúcar", "acucar", "baunilha", "chantilly", "doce", "brigadeiro", "beijinho", "pavê", "pave", "mousse"])) return "Confeitaria, Sobremesas";
  if (has(["farinha", "manteiga", "margarina", "fermento"]) && has(["açúcar", "acucar"])) return "Confeitaria, Sobremesas";
  if (has(["bovin", "contrafilé", "contrafile", "picanha", "alcatra", "maminha", "patinho", "coxão", "coxao", "costela bovina", "fraldinha", "cupim", "músculo", "musculo"])) return "Carnes, Bovina";
  if (has(["frango", "peru", "ave", "galinha", "chester"])) return "Carnes, Aves";
  if (has(["bacalhau", "camarão", "camarao", "peixe", "salmão", "salmao", "atum", "sardinha", "lula", "polvo", "marisco", "mexilhão", "mexilhao"])) return "Carnes, Peixes";
  if (has(["camarão", "camarao", "lula", "polvo", "marisco", "mexilhão", "mexilhao", "lagosta", "siri", "caranguejo"])) return "Carnes, Frutos do mar";
  if (has(["arroz", "risoto"])) return "Acompanhamentos, Arroz e Risotos";
  return "";
};

export default function NovaReceitaIA({ open, onClose, onCreated }) {
  const [texto, setTexto] = useState("");
  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const parsedRef = useRef(null);
  parsedRef.current = parsed;
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showAddGrupo, setShowAddGrupo] = useState(false);
  const [novoGrupoTitulo, setNovoGrupoTitulo] = useState("");
  const navigate = useNavigate();
  const [similarSuggestions, setSimilarSuggestions] = useState({});

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: () => base44.entities.Ingrediente.list("-nome", 500),
  });

  const { data: receitasBasicas = [] } = useQuery({
    queryKey: ["receitas-basicas"],
    queryFn: () => base44.entities.Receita.filter({ categoria: "Receitas Básicas" }),
  });

  const handleParse = async () => {
    if (!texto.trim()) { toast.error("Cole o texto da receita"); return; }
    setProcessing(true);
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
- CORRIJA erros de digitação ÓBVIOS nos nomes dos ingredientes (ex: "perito" → "peito", "frago" → "frango", "açucar" → "açúcar", "farinah" → "farinha"). Use o nome CORRIGIDO no campo nome_banco.
- NÃO substitua um ingrediente por outro DIFERENTE (ex: "Ovo" NÃO é "Gema", "Filé de frango" NÃO é "Peito de frango"). Só corrija erros de grafia.
- Se NENHUM ingrediente do banco corresponder (mesmo após correção), deixe nome_banco VAZIO.
- Se o ingrediente parecer ser uma RECEITA BÁSICA (ex: "Molho Bechamel", "Massa de pizza", "Calda de chocolate"), marque eh_receita_basica=true e coloque o nome da receita em nome_banco MESMO que não seja uma correspondência exata — o sistema confirmará depois.
- Se não conseguir identificar DE FORMA ALGUMA o ingrediente, tente INFERIR pelo contexto do modo de preparo. Ex: se o modo de preparo diz "grelhar o filé de frango" e há um ingrediente sem nome claro, sugira "Filé de peito de frango" no nome_original. NUNCA retorne nome_original VAZIO — sempre preencha com sua melhor inferência.
- Converta SEMPRE medidas caseiras para gramas usando a tabela acima
- NÃO invente porções: se o texto mencionar explicitamente quantas porções rende, use esse valor. Se NÃO mencionar, deixe porcoes_base = 0 (zero).
- NÃO invente categoria — a categoria será determinada pelo sistema com base nos ingredientes
- O modo de preparo deve ser REWRITTEN seguindo ESTRITAMENTE este padrão:
  * Uma ação por linha, numerada
  * Verbo no imperativo direto (ex: "Derreta", "Acrescente", "Bata")
  * Sem repetir ingredientes desnecessariamente
  * Temperatura, tempo e ponto crítico na mesma linha da ação
  * Sem explicações óbvias ou instruções alternativas extensas — quando houver alternativa, usar parênteses curtos: (ou microondas)
  Exemplo correto:
  1. Derreta o chocolate picado em banho-maria ou microondas.
  2. Acrescente a manteiga (ou margarina), mexa. Reserve.
  3. Bata os ovos e o açúcar até formar creme fofo e esbranquiçado.
  4. Adicione o chocolate derretido até homogeneizar.
  5. Acrescente a farinha de trigo por último.
  6. Despeje em forma untada e polvilhada com cacau em pó.
  7. Asse a 180°C por 20 minutos.
  8. Retire do forno e aguarde esfriar para cortar.
- ORDENE os ingredientes na sequência exata em que aparecem no modo de preparo (primeiro ingrediente mencionado primeiro, etc.). Ingredientes não mencionados no modo de preparo devem ficar no final da lista.
- CLASSIFIQUE cada ingrediente como estrutural (true=escala) ou 'a gosto' (false=independente):
  * ESTRUTURAL (true): ingredientes estruturais de massa/base (farinha, ovos, açúcar, manteiga, margarina, fermento, bicarbonato, amido, leite, água quando base, óleo quando base), proteínas principais (carne, frango, peixe, camarão, bacalhau), base de molhos estruturais (bechamel, caldo base, extrato de tomate quando base), arroz, macarrão, batata quando ingrediente principal.
  * A GOSTO (false): temperos e condimentos (sal, pimenta, colorau, páprica, orégano, ervas, alho, cebola quando tempero), finalizadores (azeite para finalizar, flor de sal, ervas frescas para decorar), ingredientes opcionais/complementares (creme de leite quando complemento, queijo para gratinar, azeitonas, alcaparras), líquidos de ajuste (água para ajustar consistência, caldo para deglaçar).`,
        response_json_schema: {
          type: "object",
          properties: {
            nome: { type: "string", description: "Nome da receita" },
            categoria: { type: "string", enum: CATEGORIAS },
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
                  medida_original: { type: "string", description: "Medida como aparece no texto (ex: 2 xícaras)" },
                  proporcional: { type: "boolean", description: "Classificação: true=estrutural (escala), false='a gosto' (independente). Ver regras no prompt." }
                }
              }
            },
            tags_sugeridas: {
              type: "array",
              items: { type: "string" },
              description: "Tags sugeridas para a receita. Use APENAS tags desta lista: 'Molho vermelho','Molho branco','Molho escuro','Molho agridoce','Molho de manteiga','Sem molho','Carne moída','Carne desfiada','Frango desfiado','Ovo','Prato único','Vegetariana','Vegana','Funcional','Low carb','Proteica','Integral','Sem glúten','Sem lactose','Sem pimentão','Sem pimenta','Sem alho','Sem cebola','Sem ovos','Sem açúcar','Air Fryer','Forno','Vapor','Grelhado','Frito','Cozido','Sem fogo / Cru','Freezer','Rende muito','Rápido — até 30 min','Para criança','Para dieta','Para festa','Comfort food'. Regras: se tem vegetais sem carne → 'Vegetariana'. Se menciona 'air fryer' → 'Air Fryer'. Se menciona 'forno'/'assar' → 'Forno'. Se não tem farinha de trigo/farinha comum → 'Sem glúten'. Se o tempo total ≤ 30 min → 'Rápido — até 30 min'. Se tem carne moída → 'Carne moída'."
            }
          }
        }
      });
      // Auto-categorize based on ingredient names
      const ingNomes = (result.ingredientes || []).filter(i => i.tipo !== "grupo").map(i => i.nome_banco || i.nome_original);
      const catAuto = categorizarPorIngredientes(ingNomes);
      if (catAuto) result.categoria = catAuto;
      
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

      setParsed(result);
      
      // Match suggested tags to actual tag IDs
      const allTags = await base44.entities.Tag.list("nome", 200);
      const sugestoes = result.tags_sugeridas || [];
      const matchedIds = [];
      for (const nome of sugestoes) {
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
        const palavras = busca.replace(/[,\/\(\)]/g, " ").split(/\s+/).filter(p => p.length >= 3 && !["com", "sem", "para", "dos", "das", "aos", "de"].includes(p));
        if (palavras.length > 0) {
          // Search ingredients
          const similares = ingredientes.filter(bi => {
            const biNome = (bi.nome || "").toLowerCase();
            return palavras.some(p => biNome.includes(p));
          }).slice(0, 5);
          if (similares.length > 0 && !similares.some(s => s.nome?.toLowerCase() === busca)) {
            newSugs[i] = similares;
          }
          // Search receitas básicas too
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
      const catFinal = p.categoria || categorizarPorIngredientes(ingNomes) || "A Revisar";
      
      const porcoes = p.porcoes_base || 0;
      
      const receita = await base44.entities.Receita.create({
        nome: p.nome?.toUpperCase(),
        categoria: catFinal,
        revisar: duplicateWarning != null,
        porcoes_base: porcoes,
        unidade_base: p.unidade_base || "g",
        modo_preparo: modoPreparoFinal,
        rendimento_total: rendimentoCalc,
        custo_total: 0,
        custo_por_porcao: 0,
      });

      // Save tags
      for (const tagId of selectedTagIds) {
        const tag = await base44.entities.Tag.get(tagId);
        if (tag) {
          await base44.entities.ReceitaTag.create({
            receita_id: receita.id,
            tag_id: tag.id,
            tag_nome: tag.nome,
            tag_grupo: tag.grupo,
            tag_cor: tag.cor,
          });
        }
      }

      // Link ingredients
      for (let i = 0; i < (p.ingredientes || []).length; i++) {
        const ing = p.ingredientes[i];

        // Group header
        if (ing.tipo === "grupo") {
          await base44.entities.IngredienteReceita.create({
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
          await base44.entities.IngredienteReceita.create({
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
            matchedIng = await base44.entities.Ingrediente.create({
              nome: nomeCriar,
              categoria: "A Revisar",
              unidade_compra: "KG",
              peso_embalagem_g: 1000,
              preco_embalagem_rs: 0,
              preco_por_g_rs: 0,
              fator_correcao: 1.0,
            });
          }
        }
        const qtdPorPorcao = (ing.quantidade_g || 0) / (p.porcoes_base || 1);
        await base44.entities.IngredienteReceita.create({
          receita_id: receita.id,
          ingrediente_id: matchedIng.id,
          ingrediente_nome: matchedIng.nome,
          pre_preparo: ing.pre_preparo || "",
          quantidade_por_porcao: qtdPorPorcao,
          medida_caseira: ing.medida_original || "",
          ordem: i,
          proporcional: ing.proporcional !== false,
        });
      }

      qc.invalidateQueries({ queryKey: ["receitas"] });
      qc.invalidateQueries({ queryKey: ["receitas-count-total"] });
      qc.invalidateQueries({ queryKey: ["ingredientes"] });
      if (duplicateWarning) toast.warning("Receita salva com nome similar — marcada para revisão");
      else toast.success("Receita importada com sucesso!");
      onCreated(receita.id);
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

    const todas = await base44.entities.Receita.list("-nome", 1000);
    const normForm = normalizarNome(p.nome);
    const similar = todas.find(r => normalizarNome(r.nome) === normForm);

    if (similar) {
      setDuplicateWarning(similar);
    } else {
      doSave();
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
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o texto da receita..."
              className="text-sm"
            />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={parsed.nome || ""} onChange={(e) => setParsed({ ...parsed, nome: e.target.value })} />
              </div>
              <div>
                <Label>Categoria</Label>
                <CategoriaPicker value={parsed.categoria} onChange={(v) => setParsed({ ...parsed, categoria: v })} />
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
                  <span className="text-[10px] text-muted-foreground">🔗 Estrutural = escala · 📌 A gosto = independente</span>
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
                      <div key={idx} className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 border-dashed rounded-lg text-sm">
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
                            <button
                              className="text-xs px-1 py-0 rounded hover:bg-accent shrink-0 ml-auto"
                              onClick={() => updateIngrediente(idx, "proporcional", ing.proporcional !== false ? false : true)}
                              title={ing.proporcional !== false ? "Ingrediente estrutural — escala com a receita. Clique para marcar como 'a gosto'." : "Ingrediente a gosto — quantidade fixa, não escala. Clique para marcar como estrutural."}
                            >
                              {ing.proporcional !== false ? <span className="text-green-600">🔗</span> : <span className="text-gray-400">📌</span>}
                            </button>
                          </div>
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
              <Textarea rows={4} value={parsed.modo_preparo || ""} onChange={(e) => setParsed({ ...parsed, modo_preparo: e.target.value })} />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setParsed(null)}>Voltar</Button>
              <Button onClick={handleSave} disabled={saving || temZero}>
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
    </Dialog>
  );
}