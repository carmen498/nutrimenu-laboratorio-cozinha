import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { avaliarAcessoLaboratorioCustos } from "@/lib/laboratorioCustosAccess";

export default function CustosRoute() {
  const { user } = useAuth();
  const admin = user?.role === "admin";

  const { data: configs = [], isLoading: loadingConfig } = useQuery({
    queryKey: ["custos-config-addon"],
    queryFn: () => base44.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }, "-updated_date", 10),
    enabled: !!user?.id && !admin,
    staleTime: 0,
  });
  const config = configs[0] || null;
  const consultarEntitlement = !!user?.id && !admin && !!config?.modulo_habilitado;

  const { data: acessos = [], isLoading: loadingEntitlement } = useQuery({
    queryKey: ["custos-entitlement", user?.id],
    queryFn: () => base44.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: "laboratorio_custos" }, "-updated_date", 10),
    enabled: consultarEntitlement,
    staleTime: 0,
  });

  if (!admin && (loadingConfig || (consultarEntitlement && loadingEntitlement))) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Verificando acesso ao Laboratório de Custos...</div>;
  }

  const entitlement = acessos.find((a) => a.status === "ativo") || acessos[0] || null;
  const acesso = avaliarAcessoLaboratorioCustos(user, config, entitlement);

  if (!acesso.temAcesso) {
    return <Navigate to="/custos/adicionar-ao-plano" replace state={{ motivo: acesso.motivo }} />;
  }

  return <Outlet />;
}
