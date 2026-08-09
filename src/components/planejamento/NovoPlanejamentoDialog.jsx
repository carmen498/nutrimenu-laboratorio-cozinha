import { useState, useMemo, useEffect, useRef } from "react";
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
import EtapaDocesBebidas from "./EtapaDocesBebidas";
import { salvarRascunhoEvento, lerRascunhoEvento, limparRascunhoEvento } from "@/lib/eventoRascunho";

const TIPOS_PLANEJAMENTO = ["Almoço", "Jantar", "Coquetel", "Data Comemorativa", "Confraternização", "Outro"];
const TIPOS_SERVICO = ["Bufê", "Empratado", "À La Carte", "Refeição Familiar", "Self-Service", "Outro"];

const PADROES = { homens: 600, mulheres: 400, criancas: 300 };
const NOMES_SECAO_PADRAO = ["Entrada", "Prato Principal", "Guarnição", "Arroz/Massas", "Saladas", "Sobremesa"];

function initGrupos(config) {
  if (config?.grupos?.length) {
    return config.grupos.map(g => ({
      nome: g.nome,
      itens: (g.itens || []).map(i => ({
        receita_id: i.receita_id,
        receita_nome: i.receita_nome,
        pc_g: i.pc_g,
        qtd_kg_manual: i.qtd_kg_manual ?? null,
      })),
    }));
  }
  return NOMES_SECAO_PADRAO.map(nome => ({ nome, itens: [] }));
}

export default function NovoPlanejamentoDialog({ open, onClose, onSaved, planejamentoEdicao }) {
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const hydratedRef = useRef(false);

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

  // Etapa 3 — Cardápio (grupos = estado bruto dos pratos, controlado aqui para
  // sobreviver a uma navegação de página inteira, ex: abrir uma receita)
  const [grupos, setGrupos] = useState(() => initGrupos(null));
  const [margemEvento, setMargemEvento] = useState(0);
  // Etapa 4 — Doces & Bebidas (estado lifted — compartilhado entre Etapa 3 e 4)
  const [docesBebidas, setDocesBebidas] = useState([]);
  // Snapshot calculado dos grupos (vindo da EtapaCardapio), usado para montar o
  // cardapio_config ao salvar a partir de qualquer etapa
  const [gruposConfig, setGruposConfig] = useState([]);
  const navigate = useNavigate();

  // Carregar dados ao abrir — prioriza um rascunho salvo (retomada após navegação
  // para uma receita), senão carrega do planejamento em edição ou começa vazio.
  useEffect(() => {
    if (!open) return;
    const targetId = planejamentoEdicao?.id || null;
    const draft = lerRascunhoEvento();
    const draftMatches = draft && (draft.planejamentoId || null) === targetId;

    if (draftMatches) {
      setEtapa(draft.etapa || (planejamentoEdicao ? 3 : 1));
      setNome(draft.nome || "");
      setTipoPlanejamento(draft.tipoPlanejamento || "");
      setTipoServico(draft.tipoServico || "");
      setHorario(draft.horario || "");
      setDuracao(draft.duracao || "");
      setHomens(draft.homens || 0);
      setMulheres(draft.mulheres || 0);
      setCriancas(draft.criancas || 0);
      setPcHomens(draft.pcHomens || 600);
      setPcMulheres(draft.pcMulheres || 400);
      setPcCriancas(draft.pcCriancas || 300);
      setMargem(draft.margem ?? 20);
      setMargemEvento(draft.margemEvento || 0);
      setGrupos(draft.grupos && draft.grupos.length ? draft.grupos : initGrupos(null));
      setDocesBebidas(draft.docesBebidas || []);
      setGruposConfig(draft.gruposConfig || []);
      hydratedRef.current = true;
      return;
    }

    if (planejamentoEdicao) {
      const hasCardapio = !!planejamentoEdicao.cardapio_config;
      setEtapa(hasCardapio ? 3 : 2);
      setGruposConfig([]);
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
      setMargemEvento(planejamentoEdicao.margem_seguranca_evento_pct || 0);
      let config = null;
      if (planejamentoEdicao.cardapio_config) {
        try {
          config = typeof planejamentoEdicao.cardapio_config === "string"
            ? JSON.parse(planejamentoEdicao.cardapio_config)
            : planejamentoEdicao.cardapio_config;
        } catch (e) { config = null; }
      }
      setGrupos(initGrupos(config));
      setDocesBebidas(config?.doces_bebidas || []);
    } else {
      setEtapa(1);
      setNome(""); setTipoPlanejamento(""); setTipoServico("");
      setHorario(""); setDuracao("");
      setHomens(0); setMulheres(0); setCriancas(0);
      setPcHomens(600); setPcMulheres(400); setPcCriancas(300); setMargem(20);
      setMargemEvento(0);
      setGrupos(initGrupos(null));
      setDocesBebidas([]);
      setGruposConfig([]);
    }
    hydratedRef.current = true;
  }, [open, planejamentoEdicao]);

  // Persiste o rascunho continuamente (sessionStorage) enquanto o diálogo está
  // aberto, para sobreviver a uma navegação de página inteira e voltar intacto.
  useEffect(() => {
    if (!open || !hydratedRef.current) return;
    salvarRascunhoEvento({
      planejamentoId: planejamentoEdicao?.id || null,
      etapa, nome, tipoPlanejamento, tipoServico, horario, duracao,
      homens, mulheres, criancas, pcHomens, pcMulheres, pcCriancas, margem, margemEvento,
      grupos, docesBebidas, gruposConfig,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planejamentoEdicao, etapa, nome, tipoPlanejamento, tipoServico, horario, duracao,
      homens, mulheres, criancas, pcHomens, pcMulheres, pcCriancas, margem, margemEvento,
      grupos, docesBebidas, gruposConfig]);

  const handleClose = (v) => {
    if (!v) {
      limparRascunhoEvento();
      onClose();
    }
  };

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

  // Ajusta o total de pessoas (mesmo dado da Etapa 2), cascateando homens > mulheres > crianças ao reduzir
  const ajustarPessoas = (delta) => {
    if (!delta) return;
    if (delta > 0) {
      setHomens(homens + delta);
      return;
    }
    let restante = -delta;
    const tirarHomens = Math.min(homens, restante);
    restante -= tirarHomens;
    const tirarMulheres = Math.min(mulheres, restante);
    restante -= tirarMulheres;
    const tirarCriancas = Math.min(criancas, restante);
    setHomens(homens - tirarHomens);
    setMulheres(mulheres - tirarMulheres);
    setCriancas(criancas - tirarCriancas);
  };

  // Config atual (bruto + calculado) para gravar em cardapio_config a partir de qualquer etapa
  const buildConfigFromState = () => ({
    grupos: gruposConfig.length > 0 ? gruposConfig : grupos.map(g => ({ nome: g.nome, itens: g.itens })),
    doces_bebidas: docesBebidas,
  });

  const buildDados = (configOverride) => ({
    nome: nome.trim(),
    tipo_planejamento: tipoPlanejamento,
    tipo_servico: tipoServico || "Outro",
    horario_inicio: horario || undefined,
    duracao_horas: duracao ? parseFloat(duracao.replace(",", ".")) : undefined,
    qtd_homens: homens,
    qtd_mulheres: mulheres,
    qtd_criancas: criancas,
    per_capita_homens_g: pcHomens,
    per_capita_mulheres_g: pcMulheres,
    per_capita_criancas_g: pcCriancas,
    margem_seguranca_pct: margem,
    margem_seguranca_evento_pct: margemEvento,
    total_base_kg: parseFloat(totalBaseKg.toFixed(2)),
    total_com_margem_kg: parseFloat(totalComMargemKg.toFixed(2)),
    total_pessoas: totalPessoas,
    cardapio_config: JSON.stringify(configOverride || buildConfigFromState()),
  });

  const handleSalvar = async (configOverride) => {
    setSalvando(true);
    try {
      const dados = buildDados(configOverride);
      if (planejamentoEdicao) {
        await base44.entities.Planejamento.update(planejamentoEdicao.id, dados);
        toast.success("Evento atualizado!");
      } else {
        await base44.entities.Planejamento.create(dados);
        toast.success("Evento salvo!");
      }
      limparRascunhoEvento();
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao salvar evento");
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
      limparRascunhoEvento();
      onClose();
      onSaved?.();
      navigate(`/lista-compras?planejamento=${savedId}`);
    } catch (e) {
      toast.error("Erro ao salvar evento");
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
        <input
          type="text" inputMode="numeric"
          className="w-12 text-center text-lg font-semibold tabular-nums bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-ring rounded"
          value={value}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange(digits === "" ? 0 : Math.max(0, parseInt(digits, 10)));
          }}
          onFocus={(e) => e.target.select()}
        />
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
      <DialogContent className={`${(etapa === 3 || etapa === 4) ? "max-w-6xl w-[95vw]" : "max-w-2xl"} max-h-[95vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="font-display">
            {planejamentoEdicao ? "Editar Evento" : "Novo Evento"}
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
            <div className={`flex-1 h-0.5 ${etapa >= 4 ? "bg-primary" : "bg-muted"}`} />
            <button type="button" onClick={() => etapa1Valida && setEtapa(4)}
              className={`flex items-center gap-2 ${etapa >= 4 ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${etapa >= 4 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                4
              </div>
              <span className="text-sm font-medium hidden sm:inline">Doces & Bebidas</span>
            </button>
          </div>
        </div>

        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Nome do evento *</Label>
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

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => handleSalvar()} disabled={!etapa1Valida || salvando}>
                {salvando ? "Salvando..." : "Salvar Evento"}
              </Button>
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

            <div className="flex justify-between items-center pt-2 gap-2">
              <Button variant="outline" onClick={() => setEtapa(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button variant="secondary" onClick={() => handleSalvar()} disabled={!etapa1Valida || salvando}>
                {salvando ? "Salvando..." : "Salvar Evento"}
              </Button>
              <Button onClick={() => setEtapa(3)} disabled={!etapa1Valida} className="gap-1">
                Cardápio <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {etapa === 3 && (
          <EtapaCardapio
            totalPessoas={totalPessoas}
            grupos={grupos}
            onGruposUpdate={setGrupos}
            margemEvento={margemEvento}
            onMargemEventoChange={setMargemEvento}
            onSalvar={handleSalvar}
            onGerarListaCompras={handleGerarListaCompras}
            onVoltar={() => setEtapa(2)}
            onAvancar={() => setEtapa(4)}
            docesBebidas={docesBebidas}
            onGruposChange={setGruposConfig}
            onAjustarPessoas={ajustarPessoas}
            salvando={salvando}
          />
        )}

        {etapa === 4 && (
          <EtapaDocesBebidas
            totalPessoas={totalPessoas}
            docesBebidas={docesBebidas}
            onDocesBebidasChange={setDocesBebidas}
            gruposConfig={gruposConfig}
            onSalvar={handleSalvar}
            onVoltar={() => setEtapa(3)}
            salvando={salvando}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}