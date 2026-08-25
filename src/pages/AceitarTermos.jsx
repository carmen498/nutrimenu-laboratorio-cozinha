import React, { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { termosAtuaisAceitos } from "@/lib/termosVersao";

export default function AceitarTermos() {
  const { user, isAuthenticated, isLoadingAuth, checkUserAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [aceito, setAceito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isLoadingAuth) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (termosAtuaisAceitos(user)) return <Navigate to="/app" replace />;

  const concluir = async () => {
    if (!aceito) return;
    setError("");
    setLoading(true);
    try {
      await base44.functions.invoke("registrarAceiteTermos", {
        aceitou_termos: true,
        aceitou_privacidade: true,
      });
      await checkUserAuth();
      const destino = location.state?.from;
      navigate(typeof destino === "string" && destino.startsWith("/") ? destino : "/app", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Não foi possível registrar o aceite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={ShieldCheck}
      title="Termos de uso e privacidade"
      subtitle="Confirme o aceite para continuar no Laboratório de Cozinha"
    >
      {error && (
        <div role="alert" aria-live="polite" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
      )}
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Antes de acessar sua conta, leia os documentos vigentes. O aceite é registrado com data e versão para segurança da sua conta e da contratação.
        </p>
        <div className="flex items-start gap-2">
          <Checkbox id="aceite-termos-oauth" checked={aceito} onCheckedChange={(v) => setAceito(v === true)} className="mt-0.5" />
          <Label htmlFor="aceite-termos-oauth" className="text-sm font-normal leading-snug text-muted-foreground">
            Li e aceito os{" "}
            <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Termos de Uso</a>{" "}
            e a{" "}
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Política de Privacidade</a>.
          </Label>
        </div>
        <Button className="w-full h-12" disabled={!aceito || loading} onClick={concluir}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Aceitar e continuar
        </Button>
      </div>
    </AuthLayout>
  );
}