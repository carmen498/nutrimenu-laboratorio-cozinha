import { useState, useEffect } from "react";
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
import TagBadge from "@/components/tags/TagBadge";
import { toast } from "sonner";
import { formatarModoPreparo, juntarPassos } from "@/lib/formatarModoPreparo";
import { registrarHistorico } from "@/lib/registrarHistorico";

const CAMPO_LABELS = {
  nome: "Nome",
  categorias: "Categorias",
  porcoes_base: "Nº de Porções",
  rendimento_total: "Rendimento",
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

export default function EditReceitaDialog({ open, onClose, receita }) {
  const [form, setForm] = useState({ ...receita });
  const [saving, setSaving] = useState(false);
  const [receitaTags, setReceitaTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

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

  const handleSave = async () => {
    if (!form.nome?.trim()) { toast.error("Informe o nome"); return; }
    await salvarReceita();
  };

  const salvarReceita = async () => {
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = form;
      rest.nome = rest.nome?.toUpperCase();
      const passos = formatarModoPreparo(rest.modo_preparo);
      if (passos.length > 0) rest.modo_preparo = juntarPassos(passos);
      await base44.entities.Receita.update(receita.id, rest);
      const alterados = Object.entries(CAMPO_LABELS)
        .filter(([field]) => !valuesEqual(rest[field], receita[field]))
        .map(([, label]) => label);
      if (alterados.length > 0) registrarHistorico(receita.id, rest.nome, alterados);
      qc.invalidateQueries({ queryKey: ["receita", receita.id] });
      qc.invalidateQueries({ queryKey: ["receitas"] });
      toast.success("Receita atualizada!");
      onClose();
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
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, foto_url: file_url });
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
              <Input type="number" min={1} value={form.porcoes_base || ""} onChange={(e) => setForm({ ...form, porcoes_base: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rendimento total</Label>
              <Input type="number" value={form.rendimento_total || ""} onChange={(e) => setForm({ ...form, rendimento_total: parseFloat(e.target.value) || 0 })} />
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
          </div>
          <div>
            <Label>PC recomendado (g/porção)</Label>
            <Input type="number" min={1} value={form.per_capita_g || ""} onChange={(e) => setForm({ ...form, per_capita_g: parseFloat(e.target.value) || null })} placeholder="Ex: 150" />
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
                  await base44.entities.ReceitaTag.delete(rt.id);
                  setReceitaTags(prev => prev.filter(r => r.id !== rt.id));
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TagSelector
                selectedIds={receitaTags.map(rt => rt.tag_id)}
                onToggle={async (tag) => {
                  const exists = receitaTags.find(rt => rt.tag_id === tag.id);
                  if (exists) {
                    await base44.entities.ReceitaTag.delete(exists.id);
                    setReceitaTags(prev => prev.filter(r => r.id !== exists.id));
                  } else {
                    const novo = await base44.entities.ReceitaTag.create({
                      receita_id: receita.id,
                      tag_id: tag.id,
                      tag_nome: tag.nome,
                      tag_grupo: tag.grupo,
                      tag_cor: tag.cor,
                    });
                    setReceitaTags(prev => [...prev, novo]);
                  }
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