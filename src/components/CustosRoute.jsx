import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { avaliarAcessoLaboratorioCustos, LABORATORIO_CUSTOS_COMERCIAL_ENABLED } from "@/lib/laboratorioCustosAccess";

export default function CustosRoute() {
  const { user } = useAuth();
  const deveConsultarEntitlement = LABORATORIO_CUSTOS_COMERCIAL_ENABLED && user?.role !== "admin" && !!user?.id;

  const { data: acessos = [], isLoading } = useQuery({
    queryKey: ["custos-entitlement", user?.id],
    queryFn: () => base44.entities.AcessoLaboratorioCustosUsuario.filter({ user_id: user.id, modulo: "laboratorio_custos" }, "-updated_date", 10),
    enabled: deveConsultarEntitlement,
    staleTime: 0,
  });

  if (deveConsultarEntitlement && isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Verificando acesso ao Laboratório de Custos...</div>;
  }

  const entitlement = acessos.find((a) => a.status === "ativo") || acessos[0] || null;
  const acesso = avaliarAcessoLaboratorioCustos(user, entitlement);

  if (!acesso.temAcesso) {
    return <Navigate to="/custos/adicionar-ao-plano" replace state={{ motivo: acesso.motivo }} />;
  }

  return <Outlet />;
}
