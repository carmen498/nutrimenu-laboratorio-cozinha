import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UsuariosTable from "@/components/admin/UsuariosTable";
import { computeStatusUsuario } from "@/lib/statusAssinaturaUsuario";

export default function AdminUsuarios() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busca, setBusca] = useState("");
  const [planoFiltro, setPlanoFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: user?.role === "admin",
  });

  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const buscaNorm = busca.trim().toLowerCase();
  const usuariosFiltrados = usuarios.filter((u) => {
    if (buscaNorm) {
      const alvo = `${u.nome_completo || u.full_name || ""} ${u.email || ""} ${u.telefone_whatsapp || ""}`.toLowerCase();
      if (!alvo.includes(buscaNorm)) return false;
    }
    if (planoFiltro !== "todos" && u.plano_atual !== planoFiltro) return false;
    if (statusFiltro !== "todos" && computeStatusUsuario(u).label !== statusFiltro) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-12">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2">
        <Users className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Usuários</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={planoFiltro} onValueChange={setPlanoFiltro}>
          <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os planos</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Trial expirando">Trial expirando</SelectItem>
            <SelectItem value="Vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <UsuariosTable usuarios={usuariosFiltrados} />
      )}
    </div>
  );
}