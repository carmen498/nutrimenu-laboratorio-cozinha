import { lazy, Suspense, useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminRoute from '@/components/AdminRoute';
import CustosRoute from '@/components/CustosRoute';
import RouteFallback from '@/components/RouteFallback';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Termos from '@/pages/Termos';
import Privacidade from '@/pages/Privacidade';
import AceitarTermos from '@/pages/AceitarTermos';
import SobrePublico from '@/pages/SobrePublico';
import Contato from '@/pages/Contato';
import Produto from '@/pages/Produto';
import LandingOrRedirect from '@/components/LandingOrRedirect';
import AppLoginRedirect from '@/components/auth/AppLoginRedirect';
import { getCanonicalAppRedirectUrl } from '@/lib/publicUrls';

// Rotas protegidas carregadas sob demanda: a rota pública "/" não pode pagar
// pelo bundle do app inteiro (jspdf, html2canvas, recharts etc.). Eager ficam
// apenas Landing (via LandingOrRedirect), autenticação e páginas legais acima.
const AppLayout = lazy(() => import('@/components/layout/AppLayout'));
const CustosLayout = lazy(() => import('@/components/custos/CustosLayout'));
const Home = lazy(() => import('@/pages/Home'));
const Receitas = lazy(() => import('@/pages/Receitas'));
const MinhasReceitas = lazy(() => import('@/pages/MinhasReceitas'));
const ReceitaAberta = lazy(() => import('@/pages/ReceitaAberta'));
const Cardapios = lazy(() => import('@/pages/Cardapios'));
const MeusCardapios = lazy(() => import('@/pages/MeusCardapios'));
const CardapioAberto = lazy(() => import('@/pages/CardapioAberto'));
const FichaCardapio = lazy(() => import('@/pages/FichaCardapio'));
const OrcamentoCardapio = lazy(() => import('@/pages/OrcamentoCardapio'));
const Ingredientes = lazy(() => import('@/pages/Ingredientes'));
const MeusIngredientes = lazy(() => import('@/pages/MeusIngredientes'));
const IngredienteAberto = lazy(() => import('@/pages/IngredienteAberto'));
const DossieIngrediente = lazy(() => import('@/pages/DossieIngrediente'));
const ListaCompras = lazy(() => import('@/pages/ListaCompras'));
const ExportarReceita = lazy(() => import('@/pages/ExportarReceita'));
const ReceitaListaCompras = lazy(() => import('@/pages/ReceitaListaCompras'));
const FichaTecnicaReceita = lazy(() => import('@/pages/FichaTecnicaReceita'));
const FichaCustosReceita = lazy(() => import('@/pages/FichaCustosReceita'));
const PerCapita = lazy(() => import('@/pages/PerCapita'));
const RelatorioCategorias = lazy(() => import('@/pages/RelatorioCategorias'));
const MedidasCaseiras = lazy(() => import('@/pages/MedidasCaseiras'));
const AuditoriaRendimento = lazy(() => import('@/pages/AuditoriaRendimento'));
const AuditoriaReceitas = lazy(() => import('@/pages/AuditoriaReceitas'));
const Auditorias = lazy(() => import('@/pages/Auditorias'));
const PrePreparosPlanejamento = lazy(() => import('@/pages/PrePreparosPlanejamento'));
const DossieEvento = lazy(() => import('@/pages/DossieEvento'));
const OrcamentoEvento = lazy(() => import('@/pages/OrcamentoEvento'));
const PrePreparosCardapio = lazy(() => import('@/pages/PrePreparosCardapio'));
const FichaCustosCardapio = lazy(() => import('@/pages/FichaCustosCardapio'));
const ReceitasCardapio = lazy(() => import('@/pages/ReceitasCardapio'));
const InsumosEmbalagens = lazy(() => import('@/pages/InsumosEmbalagens'));
const Configuracoes = lazy(() => import('@/pages/Configuracoes'));
const Historico = lazy(() => import('@/pages/Historico'));
const RelatorioReceitasPDF = lazy(() => import('@/pages/RelatorioReceitasPDF'));
const Suporte = lazy(() => import('@/pages/Suporte'));
const Sobre = lazy(() => import('@/pages/Sobre'));
const Conta = lazy(() => import('@/pages/Conta'));
const AdminComunicacao = lazy(() => import('@/pages/AdminComunicacao'));
const Planos = lazy(() => import('@/pages/Planos'));
const DicasCarmen = lazy(() => import('@/pages/DicasCarmen'));
const DicaCarmenDetalhe = lazy(() => import('@/pages/DicaCarmenDetalhe'));
const NovaDicaCarmen = lazy(() => import('@/pages/NovaDicaCarmen'));
const CustosInicio = lazy(() => import('@/pages/CustosInicio'));
const CustosDespesas = lazy(() => import('@/pages/CustosDespesas'));
const CustosCalcular = lazy(() => import('@/pages/CustosCalcular'));
const CustosFicha = lazy(() => import('@/pages/CustosFicha'));
const CustosHistorico = lazy(() => import('@/pages/CustosHistorico'));
const CustosConfiguracoes = lazy(() => import('@/pages/CustosConfiguracoes'));
const CustosBloqueado = lazy(() => import('@/pages/CustosBloqueado')); 

// Routes reachable without a valid session — these must keep rendering even
// when the app-level check reports 'auth_required', otherwise a genuinely
// fresh visitor (no token yet) gets redirected to /login and then hits a
// permanent blank screen, since the error never clears on that same page.
const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/termos', '/privacidade', '/aceitar-termos', '/sobre', '/contato', '/produto'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  const canonicalAppRedirectUrl = getCanonicalAppRedirectUrl(window.location);

  useEffect(() => {
    if (canonicalAppRedirectUrl) window.location.replace(canonicalAppRedirectUrl);
  }, [canonicalAppRedirectUrl]);

  // Redirect is a side effect — must run in an effect, not during render. Doing it in
  // render body fired again on every re-render while authError stayed 'auth_required',
  // each time nesting a new from_url into the already-redirected URL.
  useEffect(() => {
    if (authError?.type === 'auth_required' && !isPublicPath) {
      navigateToLogin();
    }
  }, [authError, isPublicPath, navigateToLogin]);

  if (canonicalAppRedirectUrl) return null;

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError && !isPublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return null;
    }
  }

  return (
    <Suspense fallback={<RouteFallback fullScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/termos" element={<Termos />} />
        <Route path="/privacidade" element={<Privacidade />} />
        <Route path="/aceitar-termos" element={<AceitarTermos />} />
        <Route path="/sobre" element={<SobrePublico />} />
        <Route path="/SobrePublico" element={<Navigate to="/sobre" replace />} />
        <Route path="/contato" element={<Contato />} />
        <Route path="/produto" element={<Produto />} />
        <Route path="/" element={<LandingOrRedirect />} />
        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route element={<ProtectedRoute unauthenticatedElement={<AppLoginRedirect />} />}>
          <Route element={<AppLayout />}>
            <Route path="/app" element={<Home />} />
            <Route path="/Home" element={<Navigate to="/app" replace />} />
            <Route path="/receitas" element={<Receitas />} />
            <Route path="/minhas-receitas" element={<MinhasReceitas />} />
            <Route path="/MinhasReceitas" element={<Navigate to="/minhas-receitas" replace />} />
            <Route path="/receita/:id" element={<ReceitaAberta />} />
            <Route path="/cardapios" element={<Cardapios />} />
            <Route path="/meus-cardapios" element={<MeusCardapios />} />
            <Route path="/cardapio/:id" element={<CardapioAberto />} />
            <Route path="/cardapio/:id/ficha" element={<FichaCardapio />} />
            <Route path="/cardapio/:id/orcamento" element={<OrcamentoCardapio />} />
            <Route path="/cardapio/:id/pre-preparos" element={<PrePreparosCardapio />} />
            <Route path="/cardapio/:id/ficha-custos" element={<FichaCustosCardapio />} />
            <Route path="/cardapio/:id/receitas" element={<ReceitasCardapio />} />
            <Route path="/ingredientes" element={<Ingredientes />} />
            <Route path="/meus-ingredientes" element={<MeusIngredientes />} />
            <Route path="/ingrediente/:id" element={<IngredienteAberto />} />
            <Route path="/ingrediente/:id/dossie" element={<DossieIngrediente />} />
            <Route path="/lista-compras" element={<ListaCompras />} />
            <Route path="/receita/:id/lista-compras" element={<ReceitaListaCompras />} />
            <Route path="/exportar/:id" element={<ExportarReceita />} />
            <Route path="/ficha-tecnica/:id" element={<FichaTecnicaReceita />} />
            <Route path="/ficha-custos-receita/:id" element={<FichaCustosReceita />} />
            <Route path="/percapita" element={<PerCapita />} />
            <Route path="/relatorio-categorias" element={<RelatorioCategorias />} />
            <Route path="/medidas-caseiras" element={<MedidasCaseiras />} />
            <Route path="/insumos-embalagens" element={<InsumosEmbalagens />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/suporte" element={<Suporte />} />
            <Route path="/sobre-carmen" element={<Sobre />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/planos" element={<Planos />} />
            <Route path="/dicas-carmen" element={<DicasCarmen />} />
            <Route path="/dicas-carmen/:id" element={<DicaCarmenDetalhe />} />
            <Route path="/relatorio-receitas-pdf" element={<RelatorioReceitasPDF />} />
            <Route path="/custos/adicionar-ao-plano" element={<CustosBloqueado />} />
            <Route path="/CustosBloqueado" element={<Navigate to="/custos/adicionar-ao-plano" replace />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/usuarios" element={<Navigate to="/admin/comunicacao" replace />} />
              <Route path="/admin/comunicacao" element={<AdminComunicacao />} />
              <Route path="/dicas-carmen/nova" element={<NovaDicaCarmen />} />
              <Route path="/auditoria-rendimento" element={<AuditoriaRendimento />} />
              <Route path="/auditoria-receitas" element={<AuditoriaReceitas />} />
              <Route path="/auditorias" element={<Auditorias />} />
            </Route>
            <Route path="/planejamento/:id/pre-preparos" element={<PrePreparosPlanejamento />} />
            <Route path="/planejamento/:id/dossie" element={<DossieEvento />} />
            <Route path="/planejamento/:id/orcamento" element={<OrcamentoEvento />} />
          </Route>
          <Route element={<CustosRoute />}>
            <Route element={<CustosLayout />}>
              <Route path="/custos" element={<CustosInicio />} />
              <Route path="/custos/despesas" element={<CustosDespesas />} />
              <Route path="/custos/calcular" element={<CustosCalcular />} />
              <Route path="/custos/ficha/:id" element={<CustosFicha />} />
              <Route path="/custos/historico" element={<CustosHistorico />} />
              <Route path="/custos/configuracoes" element={<CustosConfiguracoes />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
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