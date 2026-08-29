import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, User, Phone, Eye, EyeOff } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { consoleErrorSeguro } from "@/lib/securityHardening";
import { formatarTelefone } from "@/lib/formatarTelefone";
import PasswordRequirements from "@/components/auth/PasswordRequirements";
import { mensagemErroCadastro, validarSenhaForte, validarTelefoneBrasileiro } from "@/lib/registerValidation";


export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setResendCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const nomeLimpo = fullName.trim();
    const emailLimpo = email.trim().toLowerCase();
    const telefoneDigitos = telefone.replace(/\D/g, "");
    if (!aceitaTermos) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    if (nomeLimpo.length < 2) {
      setError("Informe seu nome completo.");
      return;
    }
    if (!validarTelefoneBrasileiro(telefoneDigitos)) {
      setError("Informe um telefone com DDD válido.");
      return;
    }
    if (!validarSenhaForte(password)) {
      setError("Crie uma senha com 8 caracteres, letras maiúsculas, minúsculas e um número.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    setFullName(nomeLimpo);
    setEmail(emailLimpo);
    setLoading(true);
    try {
      await base44.auth.register({ email: emailLimpo, password });
      setShowOtp(true);
      setResendCooldown(30);
    } catch (err) {
      setError(mensagemErroCadastro(err, "Não foi possível criar a conta. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    // O token é obtido já no verifyOtp. As etapas seguintes (perfil, termos,
    // trial) são best-effort: uma falha transitória nelas nunca deve impedir
    // a entrada no app nem exibir "Código de verificação inválido", porque
    // o código na verdade estava certo e o usuário já está autenticado.
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
    } catch (err) {
      setError(mensagemErroCadastro(err, "Não foi possível verificar o código. Tente novamente."));
      setLoading(false);
      return;
    }

    // Mantém um marcador efêmero até o backend confirmar o aceite. Se esta
    // chamada falhar, o AuthContext repete a tentativa após o redirecionamento.
    sessionStorage.setItem("base44_pending_terms_acceptance", "true");

    const perfilCadastro = { nome_completo: fullName, telefone_whatsapp: telefone };
    sessionStorage.setItem("base44_pending_registration_profile", JSON.stringify(perfilCadastro));
    try {
      await base44.auth.updateMe(perfilCadastro);
      sessionStorage.removeItem("base44_pending_registration_profile");
    } catch (e) {
      consoleErrorSeguro("Falha ao salvar perfil pós-OTP", e);
    }

    // Aceite dos Termos: falha aqui não bloqueia o app — o AuthContext tenta
    // registrar o aceite pendente ao revalidar a sessão.
    try {
      await base44.functions.invoke("registrarAceiteTermos", {
        aceitou_termos: true,
        aceitou_privacidade: true,
      });
      sessionStorage.removeItem("base44_pending_terms_acceptance");
    } catch (e) {
      consoleErrorSeguro("Falha ao registrar aceite de termos pós-OTP", e);
    }

    // Trial: best-effort. 409 significa que o trial já existe (outra aba/
    // AuthContext já inicializou) — tratar como sucesso. Outros erros não
    // impedem a entrada: a janela de carência do ProtectedRoute libera o
    // /app para recém-cadastrados enquanto o trial é inicializado.
    try {
      await base44.functions.invoke("inicializarTrialUsuario", {});
    } catch (e) {
      const status = e?.response?.status || e?.status;
      if (status !== 409) {
        consoleErrorSeguro("Falha ao inicializar trial pós-OTP", e);
      }
    }

    window.location.href = "/app";
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setResending(true);
    try {
      await base44.auth.resendOtp(email);
      setResendCooldown(30);
      toast({
        title: "Código enviado",
        description: "Verifique seu e-mail para o novo código.",
      });
    } catch (err) {
      setError(mensagemErroCadastro(err, "Não foi possível reenviar o código. Tente novamente."));
    } finally {
      setResending(false);
    }
  };

  const handleGoogle = async () => {
    if (!aceitaTermos) {
      setError("Aceite os Termos de Uso e a Política de Privacidade para continuar com Google.");
      return;
    }
    setError("");
    setGoogleLoading(true);
    // O OAuth interrompe esta página. O marcador de sessão prova que o fluxo foi
    // iniciado após a ação explícita na checkbox; o aceite é persistido pelo backend
    // somente depois que o Google devolver uma sessão autenticada.
    sessionStorage.setItem("base44_pending_terms_acceptance", "true");
    try {
      await base44.auth.loginWithProvider("google", new URL("/app", window.location.origin).toString());
    } catch (err) {
      sessionStorage.removeItem("base44_pending_terms_acceptance");
      setGoogleLoading(false);
      setError("Não foi possível iniciar o cadastro com Google. Tente novamente.");
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verifique seu e-mail"
        subtitle={`Enviamos um código para ${email}`}
      >
        {error && (
          <div role="alert" aria-live="polite" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <p className="mb-3 text-center text-sm text-muted-foreground">Digite o código de 6 dígitos.</p>
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || resending || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Não recebeu o código?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            className="text-primary font-medium hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resending ? "Reenviando..." : resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar"}
          </button>
        </p>
        <button
          type="button"
          onClick={() => { setShowOtp(false); setOtpCode(""); setError(""); }}
          disabled={loading}
          className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
        >
          Alterar e-mail
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Crie sua conta"
      subtitle="Cadastre-se para começar"
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Entrar
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
        <div role="alert" aria-live="polite" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder="Seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone/WhatsApp</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="telefone"
              type="tel"
              autoComplete="tel"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
              inputMode="numeric"
              maxLength={15}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              minLength={8}
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
          <PasswordRequirements password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 h-12"
              minLength={8}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-start gap-2 pt-1">
          <Checkbox
            id="aceitaTermos"
            checked={aceitaTermos}
            onCheckedChange={(checked) => setAceitaTermos(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="aceitaTermos" className="text-sm font-normal leading-snug text-muted-foreground">
            Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline"
            >
              Política de Privacidade
            </a>{" "}
            do Laboratório de Cozinha
          </Label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !aceitaTermos}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar conta"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}