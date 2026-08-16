import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";
import { computeStatusUsuario } from "@/lib/statusAssinaturaUsuario";
import { contarReceitasPorUsuario } from "@/lib/receitasPorUsuario";
import UsuariosFiltros from "@/components/admin/UsuariosFiltros";
import UsuariosTable from "@/components/admin/UsuariosTable";
import AcoesEmMassa from "@/components/admin/AcoesEmMassa";

export default function UsuariosTab({ usuarios, isLoading, selecionados, setSelecionados, onDispararEmail }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [segmentoFiltro, setSegmentoFiltro] = useState("todos");
  const [origemFiltro, setOrigemFiltro] = useState("todos");

  const { data: receitasPorUsuario = {} } = useQuery({
    queryKey: ["receitas-por-usuario"],
    queryFn: contarReceitasPorUsuario,
    staleTime: 5 * 60 * 1000,
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
      if (segmentoFiltro !== "todos" && u.segmento !== segmentoFiltro) return false;
      if (origemFiltro !== "todos" && u.origem !== origemFiltro) return false;
      return true;
    });
  }, [usuarios, busca, planoFiltro, statusFiltro, segmentoFiltro, origemFiltro]);

  const handleToggle = (id) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleAll = (checked) => {
    setSelecionados((prev) => {
      const next = new Set(prev);
      usuariosFiltrados.forEach((u) => (checked ? next.add(u.id) : next.delete(u.id)));
      return next;
    });
  };

  const quantidadeSelecionada = usuarios.filter((u) => selecionados.has(u.id)).length;

  const handleDispararWhatsapp = () => {
    toast({ title: "Em breve", description: "O disparo de WhatsApp em massa ainda está em desenvolvimento." });
  };

  const aplicarStatus = async (novoStatus, labelSucesso) => {
    const ids = Array.from(selecionados);
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => base44.entities.User.update(id, { status_assinatura: novoStatus })));
      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      setSelecionados(new Set());
      toast({ title: labelSucesso });
    } catch (err) {
      toast({ title: "Erro ao atualizar usuários", description: err.message, variant: "destructive" });
    }
  };

  const handleAtivar = () => aplicarStatus("ativo", "Usuários ativados");
  const handleDesativar = () => aplicarStatus("inativo", "Usuários desativados");

  return (
    <div className="space-y-4">
      <UsuariosFiltros
        busca={busca} setBusca={setBusca}
        planoFiltro={planoFiltro} setPlanoFiltro={setPlanoFiltro}
        statusFiltro={statusFiltro} setStatusFiltro={setStatusFiltro}
        segmentoFiltro={segmentoFiltro} setSegmentoFiltro={setSegmentoFiltro}
        origemFiltro={origemFiltro} setOrigemFiltro={setOrigemFiltro}
      />

      <AcoesEmMassa
        quantidade={quantidadeSelecionada}
        onDispararEmail={onDispararEmail}
        onDispararWhatsapp={handleDispararWhatsapp}
        onAtivar={handleAtivar}
        onDesativar={handleDesativar}
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <UsuariosTable
          usuarios={usuariosFiltrados}
          selecionados={selecionados}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          receitasPorUsuario={receitasPorUsuario}
        />
      )}
    </div>
  );
}