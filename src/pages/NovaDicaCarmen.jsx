import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2 } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMAS = ["Fritura", "Congelamento", "Per Capita", "Precificação", "Ingredientes", "Rendimento", "Geral"];
const AUTOR_FIXO = "Carmen Reinstein, Nutricionista";

export default function NovaDicaCarmen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState("");
  const [perguntaGatilho, setPerguntaGatilho] = useState("");
  const [tema, setTema] = useState("Geral");
  const [status, setStatus] = useState("rascunho");
  const [conteudo, setConteudo] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [imagemCapa, setImagemCapa] = useState("");
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

  const handleSalvar = async (statusFinal) => {
    setSalvando(true);
    const payload = {
      titulo,
      pergunta_gatilho: perguntaGatilho || undefined,
      tema,
      conteudo,
      imagem_capa: imagemCapa || undefined,
      destaque,
      status: statusFinal,
      autor: AUTOR_FIXO,
    };
    if (statusFinal === "publicado") {
      payload.data_publicacao = new Date().toISOString();
    }
    const dica = await base44.entities.DicaCarmen.create(payload);
    queryClient.invalidateQueries({ queryKey: ["dicas-carmen"] });
    setSalvando(false);
    navigate(`/dicas-carmen/${dica.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <h1 className="font-display text-2xl font-bold mb-6" style={{ color: "#2A4E3D" }}>
        Nova dica da Carmen
      </h1>

      <Card className="p-6 bg-white border" style={{ borderColor: "#E8E0D5" }}>
        <div className="space-y-5">
          {/* Imagem de capa */}
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
              <input
                type="file"
                accept="image/*"
                onChange={handleUploadImagem}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Título */}
          <div>
            <Label htmlFor="titulo" className="mb-2 block">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da dica" />
          </div>

          {/* Pergunta gatilho */}
          <div>
            <Label htmlFor="pergunta" className="mb-2 block">Pergunta que originou a dica (opcional)</Label>
            <Input
              id="pergunta"
              value={perguntaGatilho}
              onChange={(e) => setPerguntaGatilho(e.target.value)}
              placeholder="Ex: Quanto óleo o alimento absorve na fritura?"
            />
          </div>

          {/* Tema + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Tema</Label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMAS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
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

          {/* Conteúdo */}
          <div>
            <Label htmlFor="conteudo" className="mb-2 block">Conteúdo</Label>
            <Textarea
              id="conteudo"
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              placeholder="Teoria, valores e exemplo — tudo junto, sem estrutura fixa"
              className="min-h-[220px]"
            />
          </div>

          {/* Destaque */}
          <div className="flex items-center gap-2">
            <Checkbox id="destaque" checked={destaque} onCheckedChange={setDestaque} />
            <Label htmlFor="destaque" className="cursor-pointer">Destacar no carrossel da Início</Label>
          </div>

          {/* Autor e data fixos, informativo */}
          <p className="text-xs text-muted-foreground">
            Autor: {AUTOR_FIXO} · Data de publicação preenchida automaticamente ao publicar.
          </p>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              disabled={!titulo || !conteudo || salvando}
              onClick={() => handleSalvar("rascunho")}
              className="flex-1"
            >
              Salvar rascunho
            </Button>
            <Button
              disabled={!titulo || !conteudo || salvando}
              onClick={() => handleSalvar("publicado")}
              className="flex-1"
              style={{ background: "#2A4E3D" }}
            >
              Publicar dica
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}