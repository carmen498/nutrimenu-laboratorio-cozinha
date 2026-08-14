import { useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TEMAS = ["Fritura", "Congelamento", "Per Capita", "Precificação", "Ingredientes", "Rendimento", "Geral"];

export default function EditarDicaCarmenDialog({ open, onClose, dica, onSaved }) {
  const [titulo, setTitulo] = useState(dica?.titulo || "");
  const [perguntaGatilho, setPerguntaGatilho] = useState(dica?.pergunta_gatilho || "");
  const [tema, setTema] = useState(dica?.tema || "Geral");
  const [status, setStatus] = useState(dica?.status || "rascunho");
  const [conteudo, setConteudo] = useState(dica?.conteudo || "");
  const [destaque, setDestaque] = useState(!!dica?.destaque);
  const [imagemCapa, setImagemCapa] = useState(dica?.imagem_capa || "");
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleUploadImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviandoImagem(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImagemCapa(file_url);
    setEnviandoImagem(false);
  };

  const handleSalvar = async () => {
    setSalvando(true);
    const payload = {
      titulo,
      pergunta_gatilho: perguntaGatilho || undefined,
      tema,
      conteudo,
      imagem_capa: imagemCapa || undefined,
      destaque,
      status,
    };
    if (status === "publicado" && !dica.data_publicacao) {
      payload.data_publicacao = new Date().toISOString();
    }
    await base44.entities.DicaCarmen.update(dica.id, payload);
    setSalvando(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display" style={{ color: "#2A4E3D" }}>Editar dica</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">Imagem de capa (opcional)</Label>
            <div
              className="w-full aspect-[16/7] rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative"
              style={{ borderColor: "#E8E0D5", background: "#F9F6F0" }}
            >
              {imagemCapa ? (
                <img src={imagemCapa} alt="Capa da dica" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  {enviandoImagem ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                  <span className="text-xs">{enviandoImagem ? "Enviando..." : "Clique para enviar uma imagem"}</span>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleUploadImagem} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
          </div>

          <div>
            <Label htmlFor="titulo-edit" className="mb-2 block">Título</Label>
            <Input id="titulo-edit" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da dica" />
          </div>

          <div>
            <Label htmlFor="pergunta-edit" className="mb-2 block">Pergunta que originou a dica (opcional)</Label>
            <Input
              id="pergunta-edit"
              value={perguntaGatilho}
              onChange={(e) => setPerguntaGatilho(e.target.value)}
              placeholder="Ex: Quanto óleo o alimento absorve na fritura?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Tema</Label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="publicado">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="conteudo-edit" className="mb-2 block">Conteúdo</Label>
            <Textarea
              id="conteudo-edit"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="min-h-[220px]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="destaque-edit" checked={destaque} onCheckedChange={setDestaque} />
            <Label htmlFor="destaque-edit" className="cursor-pointer">Destacar no carrossel da Início</Label>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              disabled={!titulo || !conteudo || salvando}
              onClick={handleSalvar}
              style={{ background: "#2A4E3D" }}
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}