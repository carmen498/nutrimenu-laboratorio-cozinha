import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

const CHAVES = {
  desconto: "guia_zr_desconto_pix_pct",
  parcelas: "guia_zr_parcelas_sem_juros",
};

export default function CondicoesComerciaisZR() {
  const [desconto, setDesconto] = useState("");
  const [parcelas, setParcelas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const { data: registros = [], isLoading, refetch } = useQuery({
    queryKey: ["condicoes-comerciais-zr"],
    queryFn: async () => {
      const [descontos, parcelasSemJuros] = await Promise.all([
        base44.entities.ConfiguracaoSistema.filter({ chave: CHAVES.desconto }),
        base44.entities.ConfiguracaoSistema.filter({ chave: CHAVES.parcelas }),
      ]);
      return [...(descontos || []), ...(parcelasSemJuros || [])];
    },
  });

  useEffect(() => {
    setDesconto(registros.find((r) => r.chave === CHAVES.desconto)?.valor ?? "");
    setParcelas(registros.find((r) => r.chave === CHAVES.parcelas)?.valor ?? "");
  }, [registros]);

  const salvarRegistro = async (chave, valor) => {
    const existente = registros.find((r) => r.chave === chave);
    if (existente) return base44.entities.ConfiguracaoSistema.update(existente.id, { valor: String(valor) });
    return base44.entities.ConfiguracaoSistema.create({ chave, valor: String(valor) });
  };

  const salvar = async () => {
    const pct = Number(desconto);
    const qtd = Number(parcelas);
    if (!Number.isFinite(pct) || pct < 0 || pct >= 100 || !Number.isInteger(qtd) || qtd < 1 || qtd > 12) {
      toast({ title: "Revise as condições comerciais", description: "Informe desconto entre 0 e 99,99% e parcelas entre 1 e 12.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      await Promise.all([
        salvarRegistro(CHAVES.desconto, pct),
        salvarRegistro(CHAVES.parcelas, qtd),
      ]);
      await refetch();
      toast({ title: "Condições comerciais do Guia ZR salvas" });
    } finally {
      setSalvando(false);
    }
  };

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <div>
        <h3 className="font-semibold">Condições comerciais do Guia ZR</h3>
        <p className="text-xs text-muted-foreground">Configuração única usada por compra, upgrade, renovação e ofertasGuiaZR.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Desconto no PIX (%)</Label>
          <Input type="number" min="0" max="99.99" step="0.01" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Parcelas sem juros</Label>
          <Input type="number" min="1" max="12" step="1" value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <p>Este número espelha o “parcelado vendedor” do painel do Mercado Pago. Mudar um sem mudar o outro fará a página informar uma condição diferente da realmente oferecida.</p>
      </div>
      <Button onClick={salvar} disabled={salvando}>
        {salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar condições
      </Button>
    </section>
  );
}
