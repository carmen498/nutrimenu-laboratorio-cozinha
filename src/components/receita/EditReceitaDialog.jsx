import { criarReceitaTag } from '@/lib/secureChildEntities';
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Sparkles, Loader2, Wand2 } from "lucide-react";
import CategoriaPicker from "@/components/receita/CategoriaPicker";
import CorPredominantePicker from "@/components/receita/CorPredominantePicker";
import TagSelector from "@/components/tags/TagSelector";
import TagList from "@/components/tags/TagList";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import { registrarHistorico } from "@/lib/registrarHistorico";
import { garantirReceitaEditavel } from "@/lib/forkReceita";
import { calcularPesoPrePreparo, formatarStatusRendimento } from "@/lib/rendimentoReceita";
import { calcularMetricasReceita } from "@/lib/motorReceita";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { uploadImagemSeguro } from "@/lib/securityHardening";
import { invalidarCustosDependentesSeguro } from "@/lib/invalidacaoCusto";

const CAMPO_LABELS = {
  nome: "Nome",
  categorias: "Categorias",
  porcoes_base: "Nº de Porções",
  peso_pos_preparo_total: "Peso pós-preparo (PDP)",
  unidade_base: "Unidade",
  modo_preparo: "Modo de preparo",
  foto_url: "Foto",
  per_capita_g: "Per capita",
  cor_predominante: "Cor predominante",
  destaque: "Destaque",
};

function isEmpty(v) {
  return v === undefined || v === null || v === "" || v === false;
}
function valuesEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return JSON.stringify(a || []) === JSON.stringify(b || []);
  if (isEmpty(a) && isEmpty(b)) return true;
  return a === b;
}

export default function EditReceitaDialog({ open, onClose, receita, itens = [] }) {
  const campoRendimentoAlteradoRef = useRef(null);
  const [form, setForm] = useState({
    ...receita,
    peso_pos_preparo_total: receita?.peso_pos_preparo_total || receita?.rendimento_total || 0,
  });
  const [saving, setSaving] = useState(false);
  const [receitaTags, setReceitaTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const navigate = useNavigate();

  useEffect(() => {
    const pdp = receita?.peso_pos_preparo_total || receita?.rendimento_total || 0;
    const metricas = calcularMetricasReceita({
      receita,
      itens,
      perCapitaAlvo: receita?.per_capita_g || 0,
      pesoPosPreparoAlvo: pdp,
    });
    campoRendimentoAlteradoRef.current = null;
    setForm({
      ...receita,
      peso_pos_preparo_total: pdp,
      rendimento_total: pdp,
      porcoes_base: metricas.porcoes || receita?.porcoes_base || 1,
    });
  }, [receita?.id, open, itens]);

  useEffect(() => {
    if (!receita?.id || !open) return;
    (async () => {
      const [rt, at] = await Promise.all([
        base44.entities.ReceitaTag.filter({ receita_id: receita.id }, "created_date", 200),
        base44.entities.Tag.list("nome", 200),
      ]);
      setReceitaTags(rt || []);
      setAllTags(at || []);
    })();
  }, [receita?.id, open]);

  const [generatingPhoto, setGeneratingPhoto] = useState(false);
  const [rewritingPrep, setRewritingPrep] = useState(false);
  const qc = useQueryClient();

  const forkedIdRef = useRef(null);
  const forkedMapItemIdRef = useRef((x) => x);
  const tagsRef = useRef(receitaTags);
  useEffect(() => { tagsRef.current = receitaTags; }, [receitaTags]);

  const ensureFork = async () => {
    if (isAdmin || receita.is_base === false) return { rid: receita.id, mapTagId: (x) => x, mapItemId: (x) => x };
    if (forkedIdRef.current) return { rid: forkedIdRef.current, mapTagId: (x) => x, mapItemId: forkedMapItemIdRef.current };
    const result = await garantirReceitaEditavel({
      receita,
      itens,
      receitaTags: tagsRef.current,
      isAdmin,
      userId: user?.id,
    });
    if (result.forked) {
      forkedIdRef.current = result.receitaId;
      forkedMapItemIdRef.current = result.mapItemId || ((x) => x);
      const rt = await base44.entities.ReceitaTag.filter({ receita_id: result.receitaId }, "created_date", 200);
      setReceitaTags(rt || []);
    }
    return {
      rid: result.receitaId,
      mapTagId: result.mapTagId || ((x) => x),
      mapItemId: result.mapItemId || ((x) => x),
    };
  };

  const atualizarParametroRendimento = (campo, valor) => {
    campoRendimentoAlteradoRef.current = campo;
    setForm((atual) => {
      const proximo = { ...atual, [campo]: valor };
      const pc = Number(proximo.per_capita_g) || 0;
      const metricas = calcularMetricasReceita({
        receita: proximo,
        itens,
        perCapitaAlvo: pc,
        porcoesAlvo: campo === "porcoes_base" ? valor : 0,
        pesoPosPreparoAlvo: campo === "porcoes_base" ? 0 : proximo.peso_pos_preparo_total,
      });
      proximo.porcoes_base = metricas.porcoes || Number(proximo.porcoes_base) || 0;
      proximo.peso_pos_preparo_total = metricas.pesoPosPreparo;
      proximo.rendimento_total = metricas.pesoPosPreparo;
      return proximo;
    });
  };

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome"); return; }
    await salvarReceita();
  };

  const salvarReceita = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, is_base, forked_from_id, ...rest } = form;
      rest.nome = rest.nome?.toUpperCase();
      const passos = formatarModoPreparo(rest.modo_preparo);
      if (passos.length > 0) rest.modo_preparo = juntarPassos(passos);

      // PC ou PDP alterados mudam a quantidade de porções, sem mudar o lote.
      // Alterar porções diretamente representa uma nova escala do lote.
      const preservarLote = campoRendimentoAlteradoRef.current !== "porcoes_base";
      const pesoPre = calcularPesoPrePreparo(preservarLote ? receita : rest, itens);
      const pdp = Number(rest.peso_pos_preparo_total) || 0;
      const pdpOriginal = Number(receita?.peso_pos_preparo_total || receita?.rendimento_total) || 0;
      const pdpFoiAlterado = Math.abs(pdp - pdpOriginal) > 0.001;

      rest.peso_pre_preparo_total = pesoPre;
      rest.peso_pos_preparo_total = pdp;
      rest.rendimento_total = pdp; // cache legado durante a transição

      if (pdp > 0 && pdpFoiAlterado) {
        rest.rendimento_origem = "medido";
        rest.rendimento_status = "confirmado";
        rest.rendimento_medido_em = new Date().toISOString();
      } else if (pdp > 0) {
        rest.rendimento_origem = receita?.rendimento_origem || (receita?.peso_pos_preparo_total ? "medido" : "legado");
        rest.rendimento_status = receita?.rendimento_status || (receita?.peso_pos_preparo_total ? "a_validar" : "a_validar");
      } else {
        rest.rendimento_origem = "estimado";
        rest.rendimento_status = "pendente";
      }

      const { rid: receitaId, mapItemId } = await ensureFork();
      const forked = receitaId !== receita.id;
      const porcoesAnteriores = Number(receita?.porcoes_base) || 1;
      const novasPorcoes = Number(rest.porcoes_base) || porcoesAnteriores;
      if (preservarLote && novasPorcoes > 0 && Math.abs(novasPorcoes - porcoesAnteriores) > 0.0001) {
        const updates = itens
          .filter((item) => item.tipo !== "grupo")
          .map((item) => ({
            id: mapItemId(item.id),
            quantidade_por_porcao: (Number(item.quantidade_por_porcao) || 0) * porcoesAnteriores / novasPorcoes,
          }));
        if (updates.length > 0) await base44.entities.IngredienteReceita.bulkUpdate(updates);
      }
      await base44.entities.Receita.update(receitaId, rest);
      const camposCusto = ["porcoes_base", "peso_pos_preparo_total", "rendimento_total", "per_capita_g", "unidade_base"];
      const custoMudou = forked || camposCusto.some((campo) => !valuesEqual(rest[campo], receita?.[campo]));
      if (custoMudou) {
        await invalidarCustosDependentesSeguro({
          receitaIds: [receitaId],
          motivo: "parametros_receita_alterados",
          origem: "editar_receita",
        });
      }
      const alterados = Object.entries(CAMPO_LABELS)
        .filter(([field]) => !valuesEqual(rest[field], receita[field]))
        .map(([, label]) => label);
      if (alterados.length > 0) registrarHistorico(receitaId, rest.nome, alterados);
      qc.invalidateQueries({ queryKey: ["receita", receitaId] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      if (forked) {
        toast.success("Uma cópia editável desta receita foi criada para você.");
        onClose();
        navigate(`/receita/${receitaId}`, { replace: true });
      } else {
        toast.success("Receita atualizada!");
        onClose();
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fileUrl = await uploadImagemSeguro(base44, file);
      setForm({ ...form, foto_url: fileUrl });
    } catch {
      toast.error("Erro ao enviar foto");
    }
  };

  const handleGeneratePhoto = async () => {
    setGeneratingPhoto(true);
    try {
      const { url } = await base44.integrations.Core.GenerateImage({
        prompt: `Professional food photography of "${form.nome}", Brazilian cuisine, beautifully plated, natural lighting, top-down view, warm colors`
      });
      setForm({ ...form, foto_url: url });
    } catch {
      toast.error("Erro ao gerar foto");
    } finally {
      setGeneratingPhoto(false);
    }
  };

  const handleRewritePrep = async () => {
    if (!form.modo_preparo?.trim()) { toast.error("Preencha o modo de preparo primeiro"); return; }
    setRewritingPrep(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Reescreva este modo de preparo seguindo ESTRITAMENTE estas regras:

FORMATO:
- Lista numerada (1. 2. 3.), um passo por linha.
- Cada passo COMEÇA com verbo no INFINITIVO (Derreter, Bater, Acrescentar, Assar, Reservar, Levar, Retirar, Mexer, etc.).
- Ações consecutivas na mesma linha são permitidas se curtas (ex: "Reservar.").

PROIBIDO:
- Verbos no imperativo (Derreta, Bata, Acrescente) — use SEMPRE infinitivo.
- Repetir ingredientes já mencionados.
- Marcas de equipamentos (Batedeira KitchenAid, Processador X, etc.).
- Texto narrativo ou descritivo (ex: "Este passo é importante porque...").
- Dicas ou sugestões (ex: "Se preferir, use...").
- Explicações óbvias (ex: "Cuidado para não queimar").
- Instruções alternativas extensas — se necessário, use parênteses curtos: (ou micro-ondas).

EXEMPLO CORRETO:
1. Derreter o chocolate picado em banho-maria com a manteiga. Reservar.
2. Bater os ovos com o açúcar até formar creme fofo e esbranquiçado.
3. Adicionar o chocolate derretido e mexer até homogeneizar.
4. Acrescentar a farinha de trigo peneirada e misturar delicadamente.
5. Despejar em forma untada e polvilhada com cacau em pó.
6. Assar a 180 °C por 20 minutos.
7. Retirar do forno e aguardar esfriar para cortar.

Texto original:
${form.modo_preparo}`,
        response_json_schema: {
          type: "object",
          properties: {
            modo_preparo: { type: "string", description: "Modo de preparo reescrito no padrão solicitado" }
          }
        }
      });
      if (result.modo_preparo) {
        setForm({ ...form, modo_preparo: result.modo_preparo });
        toast.success("Modo de preparo reescrito!");
      }
    } catch {
      toast.error("Erro ao reescrever");
    } finally {
      setRewritingPrep(false);
    }
  };

  const pesoPreAtual = calcularPesoPrePreparo(form, itens);
  const statusAtual = form.rendimento_status || (form.peso_pos_preparo_total > 0 ? "a_validar" : "pendente");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Editar Receita</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <CategoriaPicker value={form.categorias || []} onChange={(v) => setForm({ ...form, categorias: v })} />
            </div>
            <div>
              <Label>Porções base</Label>
              <Input type="number" min={0.01} step="0.01" value={form.porcoes_base || ""} onChange={(e) => atualizarParametroRendimento("porcoes_base", parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label>Rendimento técnico</Label>
                <p className="text-xs text-muted-foreground">Pré-preparo líquido → peso pós-preparo (PDP)</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-background border">{formatarStatusRendimento(statusAtual)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Peso pré-preparo</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm font-medium">
                  {pesoPreAtual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {form.unidade_base || "g"}
                </div>
              </div>
              <div>
                <Label className="text-xs">Peso pós-preparo (PDP)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.peso_pos_preparo_total || ""}
                  onChange={(e) => atualizarParametroRendimento("peso_pos_preparo_total", parseFloat(e.target.value) || 0)}
                  placeholder="Pesar depois de pronto"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ao alterar o PDP, o valor é registrado como medido/confirmado. O Peso Bruto com FC não participa deste cálculo.
            </p>
          </div>

          <div>
            <Label>Unidade</Label>
            <Select value={form.unidade_base || "g"} onValueChange={(v) => setForm({ ...form, unidade_base: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="g">Gramas</SelectItem>
                <SelectItem value="ml">Mililitros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PC recomendado (g/porção)</Label>
            <Input type="number" min={1} value={form.per_capita_g || ""} onChange={(e) => atualizarParametroRendimento("per_capita_g", parseFloat(e.target.value) || 0)} placeholder="Ex: 150" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Modo de preparo</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRewritePrep} disabled={rewritingPrep || !form.modo_preparo?.trim()}>
                {rewritingPrep ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                Reescrever com IA
              </Button>
            </div>
            <Textarea rows={5} value={form.modo_preparo || ""} onChange={(e) => setForm({ ...form, modo_preparo: e.target.value })} placeholder={"Lista numerada. Verbos no infinitivo. Sem marcas, sem dicas. Ex:\n1. Derreter o chocolate em banho-maria com a manteiga. Reservar.\n2. Bater os ovos com o açúcar até formar creme fofo.\n3. Acrescentar a farinha e mexer até homogeneizar.\n4. Assar a 180 °C por 25 minutos."} />
          </div>
          <div>
            <Label>Tags</Label>
            <div className="mt-1 mb-2">
              <TagList
                receitaTags={receitaTags}
                allTags={allTags}
                onRemove={async (rt) => {
                  const { rid, mapTagId } = await ensureFork();
                  await base44.entities.ReceitaTag.delete(mapTagId(rt.id));
                  const updated = await base44.entities.ReceitaTag.filter({ receita_id: rid }, "created_date", 200);
                  setReceitaTags(updated || []);
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TagSelector
                selectedIds={receitaTags.map(rt => rt.tag_id)}
                onToggle={async (tag) => {
                  const { rid, mapTagId } = await ensureFork();
                  const exists = tagsRef.current.find(rt => rt.tag_id === tag.id);
                  if (exists) {
                    await base44.entities.ReceitaTag.delete(mapTagId(exists.id));
                  } else {
                    await criarReceitaTag({
                      receita_id: rid,
                      tag_id: tag.id,
                      tag_nome: tag.nome,
                      tag_grupo: tag.grupo,
                      tag_cor: tag.cor,
                    });
                  }
                  const updated = await base44.entities.ReceitaTag.filter({ receita_id: rid }, "created_date", 200);
                  setReceitaTags(updated || []);
                }}
              />
            </div>
          </div>

          <div>
            <Label>Cor predominante</Label>
            <p className="text-xs text-muted-foreground mb-1.5">Para análise visual do cardápio do evento</p>
            <CorPredominantePicker
              value={form.cor_predominante || ""}
              onChange={(v) => setForm({ ...form, cor_predominante: v || undefined })}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: "#E8E0D5" }}>
            <div>
              <Label className="mb-0.5 block">Destaque na Início</Label>
              <p className="text-xs text-muted-foreground">Exibir esta receita na vitrine "Fichas Técnicas em Destaque" da tela Início</p>
            </div>
            <Switch checked={!!form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} />
          </div>

          <div>
            <Label>Foto</Label>
            <div className="flex items-center gap-3 mt-1">
              {form.foto_url && (
                <img src={form.foto_url} alt="" className="w-[60px] h-[60px] object-cover rounded-lg shadow-sm shrink-0" />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    <Camera className="w-4 h-4 mr-1" /> Enviar
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                  </label>
                </Button>
                <Button variant="outline" size="sm" onClick={handleGeneratePhoto} disabled={generatingPhoto}>
                  {generatingPhoto ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
                  Gerar IA
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}