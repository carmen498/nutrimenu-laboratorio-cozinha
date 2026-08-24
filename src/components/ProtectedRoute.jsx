import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { avaliarAcessoAssinatura, rotaLiberadaSemAssinatura, dentroJanelaGracaRecemCadastrado } from '@/lib/acessoAssinatura';
import { termosAtuaisAceitos } from '@/lib/termosVersao';

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

  if (!termosAtuaisAceitos(user)) {
    return <Navigate to="/aceitar-termos" replace state={{ from: location.pathname }} />;
  }

  const acesso = avaliarAcessoAssinatura(user);
  const rotaLiberada = rotaLiberadaSemAssinatura(location.pathname);

  if (!acesso.temAcesso && !rotaLiberada) {
    // Recém-cadastrado dentro da janela de carência: o trial pode ainda não
    // ter sido confirmado por uma falha transitória. Liberamos o /app para
    // que ele não seja mandado para /planos nesta primeira sessão.
    if (dentroJanelaGracaRecemCadastrado(user)) {
      return <Outlet />;
    }
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