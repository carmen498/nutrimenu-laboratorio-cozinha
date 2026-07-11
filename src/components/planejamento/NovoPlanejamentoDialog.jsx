import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Plus, Minus, Clock, Info, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import EtapaCardapio from "./EtapaCardapio";

const TIPOS_PLANEJAMENTO = ["Almoço", "Jantar", "Coquetel", "Data Comemorativa", "Confraternização", "Outro"];
const TIPOS_SERVICO = ["Bufê", "Empratado", "À La Carte", "Refeição Familiar", "Self-Service", "Outro"];

const PADROES = { homens: 600, mulheres: 400, criancas: 300 };

export default function NovoPlanejamentoDialog({ open, onClose, onSaved, planejamentoEdicao }) {
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);

  // Etapa 1 — Contexto
  const [nome, setNome] = useState("");
  const [tipoPlanejamento, setTipoPlanejamento] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [horario, setHorario] = useState("");
  const [duracao, setDuracao] = useState("");

  // Etapa 2 — Clientes
  const [homens, setHomens] = useState(0);
  const [mulheres, setMulheres] = useState(0);
  const [criancas, setCriancas] = useState(0);
  const [pcHomens, setPcHomens] = useState(600);
  const [pcMulheres, setPcMulheres] = useState(400);
  const [pcCriancas, setPcCriancas] = useState(300);
  const [margem, setMargem] = useState(20);

  // Etapa 3 — Cardápio
  const [cardapioConfig, setCardapioConfig] = useState(null);
  const navigate = useNavigate();

  // Carregar dados ao abrir (useEffect — onOpenChange do Radix não dispara quando open é controlado externamente)
  useEffect(() => {
    if (!open) return;
    if (planejamentoEdicao) {
      // Edição: abre na última etapa relevante (3 se cardápio salvo, senão 2)
      const hasCardapio = !!planejamentoEdicao.cardapio_config;
      setEtapa(hasCardapio ? 3 : 2);
      setNome(planejamentoEdicao.nome || "");
      setTipoPlanejamento(planejamentoEdicao.tipo_planejamento || "");
      setTipoServico(planejamentoEdicao.tipo_servico || "");
      setHorario(planejamentoEdicao.horario_inicio || "");
      setDuracao(planejamentoEdicao.duracao_horas?.toString() || "");
      setHomens(planejamentoEdicao.qtd_homens || 0);
      setMulheres(planejamentoEdicao.qtd_mulheres || 0);
      setCriancas(planejamentoEdicao.qtd_criancas || 0);
      setPcHomens(planejamentoEdicao.per_capita_homens_g || 600);
      setPcMulheres(planejamentoEdicao.per_capita_mulheres_g || 400);
      setPcCriancas(planejamentoEdicao.per_capita_criancas_g || 300);
      setMargem(planejamentoEdicao.margem_seguranca_pct || 20);
      // Carregar cardápio salvo
      if (planejamentoEdicao.cardapio_config) {
        try {
          const config = typeof planejamentoEdicao.cardapio_config === "string"
            ? JSON.parse(planejamentoEdicao.cardapio_config)
            : planejamentoEdicao.cardapio_config;
          setCardapioConfig(config);
        } catch (e) { setCardapioConfig(null); }
      } else {
        setCardapioConfig(null);
      }
    } else {
      setEtapa(1);
      setNome(""); setTipoPlanejamento(""); setTipoServico("");
      setHorario(""); setDuracao("");
      setHomens(0); setMulheres(0); setCriancas(0);
      setPcHomens(600); setPcMulheres(400); setPcCriancas(300); setMargem(20);
      setCardapioConfig(null);
    }
  }, [open, planejamentoEdicao]);

  const handleClose = (v) => { if (!v) onClose(); };

  const totalPessoas = homens + mulheres + criancas;
  const totalBaseKg = useMemo(() =>
    (homens * pcHomens + mulheres * pcMulheres + criancas * pcCriancas) / 1000,
    [homens, mulheres, criancas, pcHomens, pcMulheres, pcCriancas]
  );
  const totalComMargemKg = useMemo(() =>
    totalBaseKg * (1 + margem / 100),
    [totalBaseKg, margem]
  );

  const etapa1Valida = nome.trim() && tipoPlanejamento;

  const buildDados = (configOverride) => ({
    nome: nome.trim(),
    tipo_planejamento: tipoPlanejamento,
    tipo_servico: tipoServico || undefined,
    horario_inicio: horario || undefined,
    duracao_horas: duracao ? parseFloat(duracao.replace(",", ".")) : undefined,
    qtd_homens: homens,
    qtd_mulheres: mulheres,
    qtd_criancas: criancas,
    per_capita_homens_g: pcHomens,
    per_capita_mulheres_g: pcMulheres,
    per_capita_criancas_g: pcCriancas,
    margem_seguranca_pct: margem,
    total_base_kg: parseFloat(totalBaseKg.toFixed(2)),
    total_com_margem_kg: parseFloat(totalComMargemKg.toFixed(2)),
    total_pessoas: totalPessoas,
    cardapio_config: configOverride ? JSON.stringify(configOverride) : (cardapioConfig ? JSON.stringify(cardapioConfig) : undefined),
  });

  const handleSalvar = async (configOverride) => {
    setSalvando(true);
    try {
      const dados = buildDados(configOverride);
      if (planejamentoEdicao) {
        await base44.entities.Planejamento.update(planejamentoEdicao.id, dados);
        toast.success("Planejamento atualizado!");
      } else {
        await base44.entities.Planejamento.create(dados);
        toast.success("Planejamento salvo!");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar planejamento");
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarListaCompras = async (configOverride) => {
    setSalvando(true);
    try {
      const dados = buildDados(configOverride);
      let savedId;
      if (planejamentoEdicao) {
        await base44.entities.Planejamento.update(planejamentoEdicao.id, dados);
        savedId = planejamentoEdicao.id;
      } else {
        const created = await base44.entities.Planejamento.create(dados);
        savedId = created.id;
      }
      setSalvando(false);
      onClose();
      onSaved?.();
      navigate(`/lista-compras?planejamento=${savedId}`);
    } catch (e) {
      toast.error("Erro ao salvar planejamento");
      setSalvando(false);
    }
  };

  const QuantidadeSelector = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-10 text-center text-lg font-semibold tabular-nums">{value}</span>
        <Button variant="outline" size="icon" className="h-8 w-8"
          onClick={() => onChange(value + 1)}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  const PerCapitaSlider = ({ label, value, onChange, min, max, padrao }) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{value}g</span>
          {value === padrao && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">padrão</span>
          )}
        </div>
      </div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={10} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {planejamentoEdicao ? "Editar Planejamento" : "Novo Planejamento"}
          </DialogTitle>
        </DialogHeader>

        {/* Barra de progresso */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <button type="button" onClick={() => etapa > 1 && setEtapa(1)}
              className={`flex items-center gap-2 ${etapa >= 1 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${etapa >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {etapa > 1 ? <Check className="w-4 h-4" /> : "1"}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Contexto</span>
            </button>
            <div className={`flex-1 h-0.5 ${etapa >= 2 ? "bg-primary" : "bg-muted"}`} />
            <button type="button" onClick={() => setEtapa(2)}
              className={`flex items-center gap-2 ${etapa >= 2 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${etapa >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                2
              </div>
              <span className="text-sm font-medium hidden sm:inline">Clientes</span>
            </button>
            <div className={`flex-1 h-0.5 ${etapa >= 3 ? "bg-primary" : "bg-muted"}`} />
            <button type="button" onClick={() => etapa1Valida && setEtapa(3)}
              className={`flex items-center gap-2 ${etapa >= 3 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${etapa >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {etapa > 3 ? <Check className="w-4 h-4" /> : "3"}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Cardápio</span>
            </button>
          </div>
        </div>

        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nome do planejamento *</Label>
              <Input placeholder="Ex: Almoço corporativo de dezembro" value={nome}
                onChange={e => setNome(e.target.value)} autoFocus />
            </div>

            <div>
              <Label>Tipo do Planejamento *</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_PLANEJAMENTO.map(t => (
                  <button key={t} type="button"
                    onClick={() => setTipoPlanejamento(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      tipoPlanejamento === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Tipo de Serviço</Label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_SERVICO.map(t => (
                  <button key={t} type="button"
                    onClick={() => setTipoServico(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      tipoServico === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-accent"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Horário de início</Label>
                <Input type="time" value={horario} onChange={e => setHorario(e.target.value)} />
              </div>
              <div>
                <Label>Duração (horas)</Label>
                <Input type="number" step="0.5" min="0" placeholder="0" value={duracao}
                  onChange={e => setDuracao(e.target.value)} />
              </div>
            </div>
            {duracao && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>A duração impacta no cálculo de bebidas e aperitivos.</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => setEtapa(2)} disabled={!etapa1Valida} className="gap-1">
                Próximo: Clientes <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Clientes</Label>
              <div className="space-y-2 mt-1.5">
                <QuantidadeSelector label="Homens" value={homens} onChange={setHomens} />
                <QuantidadeSelector label="Mulheres" value={mulheres} onChange={setMulheres} />
                <QuantidadeSelector label="Crianças" value={criancas} onChange={setCriancas} />
              </div>
              <div className="mt-2 text-center text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">{totalPessoas}</span> pessoas
              </div>
            </div>

            <div className="space-y-3 p-3 rounded-lg bg-muted/30">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Per capitas (g/pessoa)</Label>
              <PerCapitaSlider label="Homens" value={pcHomens} onChange={setPcHomens} min={500} max={700} padrao={PADROES.homens} />
              <PerCapitaSlider label="Mulheres" value={pcMulheres} onChange={setPcMulheres} min={300} max={500} padrao={PADROES.mulheres} />
              <PerCapitaSlider label="Crianças" value={pcCriancas} onChange={setPcCriancas} min={200} max={400} padrao={PADROES.criancas} />
            </div>

            <div className="space-y-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Margem de segurança</Label>
                <span className="text-sm font-semibold tabular-nums">{margem}%</span>
              </div>
              <Slider value={[margem]} onValueChange={([v]) => setMargem(v)} min={10} max={30} step={1} />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p>Use 10% para eventos controlados e empratados.</p>
                  <p>Use 20% para buffet livre ou público variado.</p>
                  <p>Ajuste conforme sua experiência com o evento.</p>
                </div>
              </div>
            </div>

            {/* Totais */}
            <div className="space-y-1.5 p-4 rounded-lg bg-muted/40">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total base (sem margem)</span>
                <span className="font-semibold tabular-nums">{totalBaseKg.toFixed(1).replace(".", ",")} kg</span>
              </div>
              <div className="flex items-center justify-between text-base pt-1 border-t border-border/50">
                <span className="font-bold">Total com margem</span>
                <span className="font-bold text-primary tabular-nums text-lg">{totalComMargemKg.toFixed(1).replace(".", ",")} kg</span>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setEtapa(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button onClick={() => setEtapa(3)} disabled={!etapa1Valida} className="gap-1">
                Cardápio <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {etapa === 3 && (
          <EtapaCardapio
            totalComMargemKg={totalComMargemKg}
            totalPessoas={totalPessoas}
            cardapioConfig={cardapioConfig}
            onSalvar={handleSalvar}
            onGerarListaCompras={handleGerarListaCompras}
            onVoltar={() => setEtapa(2)}
            salvando={salvando}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}