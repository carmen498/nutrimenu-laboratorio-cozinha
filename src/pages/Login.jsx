import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { readFreshReturnTo, safeReturnTo, validarReturnToInterno } from "@/lib/authReturnTo";
import { navegarAutenticacao } from "@/lib/authNavigation";
import { traduzirErroAutenticacao } from "@/lib/authErrors";
import { auditarErroDesconhecido } from "@/lib/auditoriaAuth";
import { APP_SITE_URLS, buildAppLoginUrl, isPublicSiteHost } from "@/lib/publicUrls";
import { withAuthTimeout } from "@/lib/authTimeout";

export default function Login() {
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get("email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [manterConectado, setManterConectado] = useState(true);
  const emailInputRef = useRef(null);
  // Captured once on mount, before the URL is cleaned up below — used for the
  // post-login redirect instead of re-reading window.location later.
  // safeReturnTo devolve "/" quando não há destino explícito. Para um login
  // bem-sucedido, "/" é a Landing Page pública — não faz sentido mandar um
  // usuário autenticado de volta à página de marketing. Redirecionamos para
  // /app como destino pós-login padrão.
  const [returnTo] = useState(() => {
    const dest = safeReturnTo();
    const retornoGuia = readFreshReturnTo(
      sessionStorage.getItem("base44_pending_guia_bridge")
    );
    const retornoGuiaSeguro = validarReturnToInterno(retornoGuia, "/");

    // A ponte do Guia tem precedência sobre o destino padrão /app. Assim, mesmo
    // que o SDK remova returnTo durante login/cadastro/Google, a sessão termina
    // novamente em /entrar-no-guia e de lá retorna ao produto ZR.
    if (retornoGuiaSeguro !== "/") return retornoGuiaSeguro;
    return dest === "/" ? new URL(APP_SITE_URLS.appHome).pathname : dest;
  });

  // O login possui um único endereço canônico no subdomínio do aplicativo.
  useEffect(() => {
    if (isPublicSiteHost()) {
      window.location.replace(buildAppLoginUrl(returnTo));
    }
  }, [returnTo]);

  // Handles browser-autofilled e-mail, which doesn't always fire a React onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      const autofilledEmail = emailInputRef.current?.value;
      if (autofilledEmail && autofilledEmail !== email) {
        setEmail(autofilledEmail);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };

  const registrarPreferenciaDeSessao = (persistir) => {
    sessionStorage.setItem("base44_remember_session", persistir ? "true" : "false");
  };

  const aplicarPersistenciaDoToken = (token) => {
    base44.auth.setToken(token);
    if (manterConectado) {
      localStorage.setItem("base44_access_token", token);
      sessionStorage.removeItem("base44_access_token");
    } else {
      sessionStorage.setItem("base44_access_token", token);
      localStorage.removeItem("base44_access_token");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    registrarPreferenciaDeSessao(manterConectado);
    try {
      const response = await withAuthTimeout(base44.auth.loginViaEmailPassword(email, password));
      aplicarPersistenciaDoToken(response.access_token);
      window.location.href = returnTo;
    } catch (err) {
      const traduzido = traduzirErroAutenticacao(err);
      auditarErroDesconhecido({ traduzido, error: err, tela: "login", email });
      setError(traduzido.mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setError("");
    setGoogleLoading(true);
    registrarPreferenciaDeSessao(manterConectado);
    try {
      const destinoOAuth = new URL(returnTo, window.location.origin).toString();
      await withAuthTimeout(base44.auth.loginWithProvider("google", destinoOAuth));
    } catch (err) {
      const traduzido = traduzirErroAutenticacao(err);
      auditarErroDesconhecido({ traduzido, error: err, tela: "google", email });
      setError(
        "Não foi possível entrar com o Google agora. Use seu e-mail e senha abaixo — se ainda não tem senha, clique em \"Esqueceu a senha?\" para criar uma."
      );
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta"
      footer={
        <>
          Não tem conta?{" "}
          <Link to={navegarAutenticacao("/register", { returnTo })} className="text-primary font-medium hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        disabled={googleLoading || loading}
      >
        {googleLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <GoogleIcon className="w-5 h-5 mr-2" />}
        {googleLoading ? "Conectando..." : "Continuar com Google"}
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">ou</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              ref={emailInputRef}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="seu@email.com"
              value={email}
              onChange={handleEmailChange}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to={navegarAutenticacao("/forgot-password", { returnTo, email })} className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="manter-conectado"
            type="checkbox"
            checked={manterConectado}
            onChange={(e) => setManterConectado(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <Label htmlFor="manter-conectado" className="text-sm font-normal cursor-pointer">
            Manter-me conectado neste dispositivo
          </Label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Entrando...
            </>
          ) : (
            "Entrar"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}