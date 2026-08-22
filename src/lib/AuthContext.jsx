import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      let currentUser = await base44.auth.me();

      // No cadastro via Google, a checkbox de Termos é confirmada antes do redirect
      // e deixa apenas um marcador efêmero nesta aba. O aceite real é persistido
      // somente agora, já com usuário autenticado, pela function server-side.
      const aceiteTermosPendente = typeof sessionStorage !== 'undefined'
        && sessionStorage.getItem('base44_pending_terms_acceptance') === 'true';
      if (aceiteTermosPendente) {
        try {
          if (!currentUser?.termos_aceitos_em || !currentUser?.termos_versao_aceita) {
            await base44.functions.invoke('registrarAceiteTermos', {});
            currentUser = await base44.auth.me();
          }
          sessionStorage.removeItem('base44_pending_terms_acceptance');
        } catch (termsError) {
          console.error('Terms acceptance registration after OAuth failed:', termsError);
        }
      }

      // OAuth (ex.: Google) não passa pelo fluxo de OTP do Register. Para que
      // toda conta realmente nova receba o mesmo trial, independentemente do
      // provedor de autenticação, inicializamos aqui quando não há qualquer
      // histórico de plano. A função server-side é idempotente e rejeita
      // reutilização de trial.
      const semHistoricoDePlano = currentUser?.role !== 'admin' && !(
        currentUser?.plano_atual ||
        currentUser?.status_assinatura ||
        currentUser?.data_inicio ||
        currentUser?.data_expiracao ||
        Number(currentUser?.ciclo_renovacao || 0) > 0
      );

      if (semHistoricoDePlano) {
        try {
          await base44.functions.invoke('inicializarTrialUsuario', {});
          currentUser = await base44.auth.me();
        } catch (trialError) {
          // 409 significa que outra aba/requisição já inicializou o trial.
          // Recarrega o usuário e segue; demais erros são registrados, mas não
          // transformam uma falha transitória de e-mail em falha de login.
          if (trialError?.response?.status === 409 || trialError?.status === 409) {
            currentUser = await base44.auth.me();
          } else {
            console.error('Trial initialization after auth failed:', trialError);
          }
        }
      }

      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      base44.auth.updateMe({ data_login: new Date().toISOString() }).catch(() => {});
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  // Builds the current URL but strips any pre-existing "from_url" param — passing it
  // through as-is would nest the already-encoded URL inside itself on every redirect,
  // growing without end. Read once, never accumulated.
  const cleanUrlForRedirect = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('from_url');
    return url.toString();
  };

  const logout = (redirectTarget = '/') => {
    setUser(null);
    setIsAuthenticated(false);

    // Remove somente dados efêmeros pertencentes a este app. Isso evita que um
    // segundo usuário na mesma aba herde rascunhos ou marcadores da sessão anterior.
    try {
      for (const key of [
        'labcozinha_evento_rascunho_v1',
        'base44_pending_terms_acceptance',
        'base44_pending_return_to',
        'base44_pending_password_reset_token',
      ]) {
        sessionStorage.removeItem(key);
      }
    } catch {}

    if (redirectTarget) {
      base44.auth.logout(redirectTarget);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Already on /login — redirecting again would just re-append from_url and nest it.
    if (window.location.pathname === '/login') return;
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(cleanUrlForRedirect());
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};