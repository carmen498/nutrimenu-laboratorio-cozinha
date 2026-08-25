import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Flame, Loader2, Package, UserRound, WalletCards } from "lucide-react";
import { toast } from "sonner";

export const GRUPOS_DESPESA_CUSTO = [
  { value: "gastos_negocio", label: "Gastos do negócio", icon: Building2, accent: "text-emerald-700", bg: "bg-emerald-50" },
  { value: "trabalho_ajudantes", label: "Despesas com pessoal", icon: UserRound, accent: "text-violet-700", bg: "bg-violet-50" },
  { value: "producao", label: "Despesas operacionais", icon: Flame, accent: "text-orange-600", bg: "bg-orange-50" },
  { value: "embalagem_outros", label: "Embalagem e outros", icon: Package, accent: "text-blue-700", bg: "bg-blue-50" },
];

const numero = (valor) => {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = String(valor ?? "").trim();
  if (!texto) return null;
  const normalizado = texto.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalizado);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function AdicionarDespesaDialog({ open, onClose, userId, grupoInicial = "", despesa = null }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [grupo, setGrupo] = useState("");
  const [valorMensal, setValorMensal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(despesa?.nome || "");
    setGrupo(despesa?.grupo || grupoInicial || "");
    setValorMensal(despesa?.valor_mensal != null ? String(despesa.valor_mensal).replace(".", ",") : "");
    setObservacao(despesa?.observacao || "");
    setAtivo(despesa?.ativo !== false);
  }, [open, despesa, grupoInicial]);

  const salvar = async () => {
    if (!userId) return;
    if (!nome.trim()) {
      toast.error("Informe o nome da despesa.");
      return;
    }
    if (!grupo) {
      toast.error("Selecione o grupo da despesa.");
      return;
    }
    const valor = numero(valorMensal);
    if (valor == null) {
      toast.error("Informe um valor mensal válido.");
      return;
    }
    if (valor < 0) {
      toast.error("O valor mensal não pode ser negativo.");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        user_id: userId,
        nome: nome.trim(),
        grupo,
        valor_mensal: valor,
        observacao: observacao.trim(),
        ativo,
      };

      if (despesa?.id) {
        await base44.entities.DespesaCustoUsuario.update(despesa.id, payload);
        toast.success("Despesa atualizada.");
      } else {
        await base44.entities.DespesaCustoUsuario.create(payload);
        toast.success("Despesa adicionada.");
      }

      await qc.invalidateQueries({ queryKey: ["custos-despesas", userId] });
      onClose();
    } catch (err) {
      toast.error("Não foi possível salvar a despesa: " + (err?.message || "erro inesperado"));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <WalletCards className="w-5 h-5 text-primary" />
            {despesa ? "Editar despesa" : "Adicionar despesa"}
          </DialogTitle>
          <DialogDescription>
            Cadastre um gasto mensal do seu negócio. Os grupos selecionados em Configurações de Rateio entram automaticamente nos cálculos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da despesa *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Aluguel, internet, material de limpeza" maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label>Grupo *</Label>
            <Select value={grupo} onValueChange={setGrupo}>
              <SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger>
              <SelectContent>
                {GRUPOS_DESPESA_CUSTO.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {GRUPOS_DESPESA_CUSTO.map((g) => {
                const Icon = g.icon;
                const selecionado = grupo === g.value;
                return (
                  <button
                    type="button"
                    key={g.value}
                    onClick={() => setGrupo(g.value)}
                    className={`rounded-lg border px-2 py-3 text-center transition-colors ${selecionado ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/60"}`}
                  >
                    <span className={`mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-lg ${g.bg} ${g.accent}`}><Icon className="w-5 h-5" /></span>
                    <span className="text-[11px] font-medium leading-tight block">{g.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor mensal (R$) *</Label>
            <div className="flex">
              <span className="h-9 px-3 inline-flex items-center rounded-l-md border border-r-0 bg-muted text-sm">R$</span>
              <Input className="rounded-l-none" inputMode="decimal" value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observação <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Detalhes sobre esta despesa..." maxLength={300} rows={3} />
            <p className="text-[11px] text-muted-foreground text-right">{observacao.length}/300</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Despesa ativa</p>
              <p className="text-xs text-muted-foreground">Despesas inativas ficam salvas, mas não entram nos cálculos nem nos totais ativos.</p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar despesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
