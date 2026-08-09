import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Receitas from '@/pages/Receitas';
import ReceitaAberta from '@/pages/ReceitaAberta';
import Cardapios from '@/pages/Cardapios';
import CardapioAberto from '@/pages/CardapioAberto';
import FichaCardapio from '@/pages/FichaCardapio';
import Ingredientes from '@/pages/Ingredientes';
import IngredienteAberto from '@/pages/IngredienteAberto';
import DossieIngrediente from '@/pages/DossieIngrediente';
import ListaCompras from '@/pages/ListaCompras';
import ExportarReceita from '@/pages/ExportarReceita';
import ReceitaListaCompras from '@/pages/ReceitaListaCompras';
import FichaTecnicaReceita from '@/pages/FichaTecnicaReceita';
import PerCapita from '@/pages/PerCapita';
import RelatorioCategorias from '@/pages/RelatorioCategorias';
import MedidasCaseiras from '@/pages/MedidasCaseiras';
import AuditoriaRendimento from '@/pages/AuditoriaRendimento';
import AuditoriaReceitas from '@/pages/AuditoriaReceitas';
import Auditorias from '@/pages/Auditorias';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/receitas" element={<Receitas />} />
          <Route path="/receita/:id" element={<ReceitaAberta />} />
          <Route path="/cardapios" element={<Cardapios />} />
          <Route path="/cardapio/:id" element={<CardapioAberto />} />
          <Route path="/cardapio/:id/ficha" element={<FichaCardapio />} />
          <Route path="/ingredientes" element={<Ingredientes />} />
          <Route path="/ingrediente/:id" element={<IngredienteAberto />} />
          <Route path="/ingrediente/:id/dossie" element={<DossieIngrediente />} />
          <Route path="/lista-compras" element={<ListaCompras />} />
          <Route path="/receita/:id/lista-compras" element={<ReceitaListaCompras />} />
          <Route path="/exportar/:id" element={<ExportarReceita />} />
          <Route path="/ficha-tecnica/:id" element={<FichaTecnicaReceita />} />
          <Route path="/percapita" element={<PerCapita />} />
          <Route path="/relatorio-categorias" element={<RelatorioCategorias />} />
          <Route path="/medidas-caseiras" element={<MedidasCaseiras />} />
          <Route path="/auditoria-rendimento" element={<AuditoriaRendimento />} />
          <Route path="/auditoria-receitas" element={<AuditoriaReceitas />} />
          <Route path="/auditorias" element={<Auditorias />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster richColors position="top-center" />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App