import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { computeStatusUsuario } from "@/lib/statusAssinaturaUsuario";
import CampanhaFiltros from "./CampanhaFiltros";
import CampanhaListaUsuarios from "./CampanhaListaUsuarios";
import CampanhaConfirmacaoDialog from "./CampanhaConfirmacaoDialog";

export default function CampanhasTab() {
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [selecionados, setSelecionados] = useState(new Set());
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [enviandoTeste, setEnviandoTeste] = useState(false);
  const [disparando, setDisparando] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
  });

  const usuariosFiltrados = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (buscaNorm) {
        const alvo = `${u.nome_completo || u.full_name || ""} ${u.email || ""} ${u.telefone_whatsapp || ""}`.toLowerCase();
        if (!alvo.includes(buscaNorm)) return false;
      }
      if (planoFiltro !== "todos" && u.plano_atual !== planoFiltro) return false;
      if (statusFiltro !== "todos" && computeStatusUsuario(u).label !== statusFiltro) return false;
      return true;
    });
  }, [usuarios, busca, planoFiltro, statusFiltro]);

  useEffect(() => {
    setSelecionados(new Set(usuariosFiltrados.map((u) => u.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, planoFiltro, statusFiltro, usuarios]);

  const handleToggle = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const destinatariosSelecionados = usuariosFiltrados.filter((u) => selecionados.has(u.id));
  const podeEnviar = assunto.trim() && corpo.trim() && destinatariosSelecionados.length > 0;

  const handleTeste = async () => {
    setEnviandoTeste(true);
    try {
      const res = await base44.functions.invoke("campanhaEmail", { acao: "teste", assunto, corpo });
      if (res.data?.success) {
        toast({ title: "E-mail de teste enviado" });
      } else {
        toast({ title: "Falha ao enviar teste", description: res.data?.error, variant: "destructive" });
      }
    } finally {
      setEnviandoTeste(false);
    }
  };

  const handleConfirmarDisparo = async () => {
    setDisparando(true);
    try {
      const destinatarios = destinatariosSelecionados.map((u) => u.email).filter(Boolean);
      const res = await base44.functions.invoke("campanhaEmail", { acao: "disparar", destinatarios, assunto, corpo });
      toast({ title: "Campanha disparada", description: `${res.data?.enviados ?? 0} de ${res.data?.total ?? 0} e-mails enviados.` });
      setConfirmacaoAberta(false);
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <CampanhaFiltros
        busca={busca} setBusca={setBusca}
        planoFiltro={planoFiltro} setPlanoFiltro={setPlanoFiltro}
        statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <CampanhaListaUsuarios usuarios={usuariosFiltrados} selecionados={selecionados} onToggle={handleToggle} />
      )}

      <p className="text-sm font-medium">{destinatariosSelecionados.length} destinatário(s) selecionado(s)</p>

      <div className="space-y-1.5">
        <Label htmlFor="campanha-assunto">Assunto</Label>
        <Input id="campanha-assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="campanha-corpo">Corpo</Label>
        <Textarea id="campanha-corpo" rows={8} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={handleTeste} disabled={!assunto.trim() || !corpo.trim() || enviandoTeste}>
          {enviandoTeste && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Enviar teste para mim
        </Button>
        <Button onClick={() => setConfirmacaoAberta(true)} disabled={!podeEnviar}>
          Revisar e disparar
        </Button>
      </div>

      <CampanhaConfirmacaoDialog
        open={confirmacaoAberta}
        onOpenChange={setConfirmacaoAberta}
        destinatarios={destinatariosSelecionados}
        enviando={disparando}
        onConfirmar={handleConfirmarDisparo}
      />
    </div>
  );
}