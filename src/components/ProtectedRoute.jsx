import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { avaliarAcessoAssinatura, rotaLiberadaSemAssinatura } from '@/lib/acessoAssinatura';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

export default function ProtectedRoute({ fallback = <DefaultFallback />, unauthenticatedElement }) {
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  const acesso = avaliarAcessoAssinatura(user);
  const rotaLiberada = rotaLiberadaSemAssinatura(location.pathname);

  if (!acesso.temAcesso && !rotaLiberada) {
    return (
      <Navigate
        to="/planos"
        replace
        state={{
          acessoBloqueado: true,
          motivo: acesso.motivo,
          from: location.pathname,
        }}
      />
    );
  }

  return <Outlet />;
}
