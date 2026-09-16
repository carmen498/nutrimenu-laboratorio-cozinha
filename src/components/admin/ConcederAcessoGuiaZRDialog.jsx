import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const FAIXAS = [
  { value: "tin", label: "TIN" },
  { value: "full", label: "Full" },
  { value: "arquitetura-do-rotulo", label: "Arquitetura do Rótulo" },
];

export default function ConcederAcessoGuiaZRDialog({ open, onOpenChange, usuarios = [] }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [faixa, setFaixa] = useState("full");
  const [vitalicio, setVitalicio] = useState(true);
  const [fimEm, setFimEm] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const usuariosFiltrados = busca.trim()
    ? usuarios.filter((u) => {
        const alvo = `${u.email || ""} ${u.nome_completo || u.full_name || ""}`.toLowerCase();
        return alvo.includes(busca.trim().toLowerCase());
      })
    : usuarios;

  const reset = () => {
    setBusca("");
    setUsuarioSelecionado(null);
    setFaixa("full");
    setVitalicio(true);
    setFimEm("");
    setObservacao("");
  };

  const handleClose = (open) => {
    if (!open) reset();
    onOpenChange(open);
  };

  const handleConceder = async () => {
    if (!usuarioSelecionado) {
      toast.error("Selecione um usuário.");
      return;
    }
    if (!vitalicio && !fimEm) {
      toast.error("Defina a data de validade ou marque como vitalício.");
      return;
    }

    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const payload = {
        user_id: usuarioSelecionado.id,
        faixa,
        status: "ativo",
        vitalicio,
        modalidade: "admin",
        origem: "admin",
        inicio_em: agora,
        fim_em: vitalicio ? null : new Date(fimEm + "T23:59:59Z").toISOString(),
        observacao: observacao || `Concessão interna — ${faixa} vitalício`,
      };

      await base44.entities.AcessoGuiaTecnicoZR.create(payload);

      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success(`Acesso ${faixa} concedido a ${usuarioSelecionado.email}`);
      handleClose(false);
    } catch (err) {
      toast.error(err?.message || "Não foi possível conceder o acesso.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Conceder acesso ao Guia ZR</DialogTitle>
          <DialogDescription>
            Concessão interna — não é venda e não entra nos números de faturamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca + seleção de usuário */}
          <div className="space-y-2">
            <Label>Usuário</Label>
            {!usuarioSelecionado ? (
              <>
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  {usuariosFiltrados.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground text-center">Nenhum usuário encontrado.</p>
                  ) : (
                    usuariosFiltrados.slice(0, 20).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => setUsuarioSelecionado(u)}
                        className="w-full text-left px-3 py-2 hover:bg-accent transition-colors border-b last:border-0"
                      >
                        <p className="text-sm font-medium">{u.nome_completo || u.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{usuarioSelecionado.nome_completo || usuarioSelecionado.full_name}</p>
                  <p className="text-xs text-muted-foreground">{usuarioSelecionado.email}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setUsuarioSelecionado(null)}>Trocar</Button>
              </div>
            )}
          </div>

          {/* Faixa */}
          <div className="space-y-2">
            <Label>Faixa</Label>
            <div className="grid grid-cols-3 gap-2">
              {FAIXAS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFaixa(f.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    faixa === f.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vitalício */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="vitalicio" className="cursor-pointer">Vitalício</Label>
              <p className="text-xs text-muted-foreground">Sem data de vencimento.</p>
            </div>
            <Switch id="vitalicio" checked={vitalicio} onCheckedChange={setVitalicio} />
          </div>

          {/* Validade (se não vitalício) */}
          {!vitalicio && (
            <div className="space-y-2">
              <Label htmlFor="fimEm">Validade (vence em)</Label>
              <Input id="fimEm" type="date" value={fimEm} onChange={(e) => setFimEm(e.target.value)} />
            </div>
          )}

          {/* Observação */}
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Input
              id="observacao"
              placeholder="Ex: Concessão interna de trabalho"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleConceder} disabled={salvando || !usuarioSelecionado}>
            {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Conceder acesso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}