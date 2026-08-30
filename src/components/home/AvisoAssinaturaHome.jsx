import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { hojeSaoPauloISO, statusAssinaturaEfetivo } from "@/lib/acessoAssinatura";
import { formatarDataBrasilia } from "@/lib/fusoBrasilia";

const formatarData = (dataStr) => formatarDataBrasilia(dataStr);

const diasEntreHoje = (dataStr) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataStr || "")) return null;
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const [anoHoje, mesHoje, diaHoje] = hojeSaoPauloISO().split("-").map(Number);
  return Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(anoHoje, mesHoje - 1, diaHoje)) / 86400000);
};

export default function AvisoAssinaturaHome({ user }) {
  // Admins nunca veem banners de expiração — a conta administradora não
  // depende de trial/plano e o status persistido pode estar desatualizado.
  if (user?.role === "admin") return null;

  const status = statusAssinaturaEfetivo(user);
  const diasParaExpiracao = diasEntreHoje(user?.data_expiracao);

  // Um status atrasado não pode anunciar como vencida uma assinatura cuja
  // data final ainda está no futuro; isso afeta somente o aviso visual.
  if (status === "vencido" && diasParaExpiracao != null && diasParaExpiracao < 0) {
    return (
      <div className="mb-4 flex flex-col sm:flex-row items-center gap-3 justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
        <div className="flex items-center gap-2 text-destructive text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Sua assinatura venceu em {formatarData(user?.data_expiracao) || "—"}. Renove para
            continuar usando o Laboratório de Cozinha.
          </span>
        </div>
        <Link
          to="/planos"
          className="shrink-0 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground text-sm font-medium px-3 py-1.5 hover:bg-destructive/90"
        >
          Renovar agora
        </Link>
      </div>
    );
  }

  if (status === "trial") {
    const diasRestantes = diasParaExpiracao;
    if (diasRestantes != null && diasRestantes <= 3) {
      return (
        <Link
          to="/planos"
          className="mb-4 flex items-center gap-2 justify-center rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-800 text-sm font-medium hover:bg-amber-100 transition-colors"
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            Trial expira em {Math.max(diasRestantes, 0)} {diasRestantes === 1 ? "dia" : "dias"} · Assinar agora
          </span>
        </Link>
      );
    }
  }

  return null;
}