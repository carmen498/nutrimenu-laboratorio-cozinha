import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { avaliarAcessoLaboratorioCustos } from "@/lib/laboratorioCustosAccess";

export default function CustosRoute() {
  const { user } = useAuth();
  const acesso = avaliarAcessoLaboratorioCustos(user);

  if (!acesso.temAcesso) {
    return <Navigate to="/app" replace state={{ laboratorioCustosBloqueado: true, motivo: acesso.motivo }} />;
  }

  return <Outlet />;
}
