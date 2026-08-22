import { useSearchParams, Navigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ClipboardCheck, PieChart, Copy, Sparkles, ListMinus, DatabaseZap, Scale, GitBranch } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import AuditoriaRendimento from "./AuditoriaRendimento";
import AuditoriaReceitas from "./AuditoriaReceitas";
import AuditoriaComposicaoReceita from "./AuditoriaComposicaoReceita";
import AuditoriaMedidasCaseiras from "./AuditoriaMedidasCaseiras";
import AuditoriaSubreceitas from "./AuditoriaSubreceitas";
import HistoricoSaneamentoMedidas from "@/components/auditoria/HistoricoSaneamentoMedidas";
import RelatorioCategorias from "./RelatorioCategorias";
import RelatorioDuplicados from "./RelatorioDuplicados";
import RelatorioFaxinaCategorias from "./RelatorioFaxinaCategorias";
import RelatorioPoucosIngredientes from "./RelatorioPoucosIngredientes";

const TABS = ["rendimento", "composicao", "subreceitas", "medidas", "receitas", "categorias", "duplicados", "faxina", "poucos"];

export default function Auditorias() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (user && user.role !== "admin") return <Navigate to="/" replace />;
  const tabParam = searchParams.get("tab");
  const tab = TABS.includes(tabParam) ? tabParam : "rendimento";
  const handleTabChange = (value) => setSearchParams({ tab: value }, { replace: true });

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <h1 className="font-display text-2xl font-bold" style={{ color: "#2A4E3D" }}>Auditorias</h1>
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="rendimento" className="gap-1.5"><AlertTriangle className="w-4 h-4" /> Rendimento</TabsTrigger>
          <TabsTrigger value="composicao" className="gap-1.5"><DatabaseZap className="w-4 h-4" /> Composição</TabsTrigger>
          <TabsTrigger value="subreceitas" className="gap-1.5"><GitBranch className="w-4 h-4" /> Sub-receitas</TabsTrigger>
          <TabsTrigger value="medidas" className="gap-1.5"><Scale className="w-4 h-4" /> Medidas</TabsTrigger>
          <TabsTrigger value="receitas" className="gap-1.5"><ClipboardCheck className="w-4 h-4" /> Receitas</TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5"><PieChart className="w-4 h-4" /> Categorias</TabsTrigger>
          <TabsTrigger value="duplicados" className="gap-1.5"><Copy className="w-4 h-4" /> Duplicados</TabsTrigger>
          <TabsTrigger value="faxina" className="gap-1.5"><Sparkles className="w-4 h-4" /> Faxina Categorias</TabsTrigger>
          <TabsTrigger value="poucos" className="gap-1.5"><ListMinus className="w-4 h-4" /> Poucos Ingredientes</TabsTrigger>
        </TabsList>
        <TabsContent value="rendimento" className="mt-4"><AuditoriaRendimento /></TabsContent>
        <TabsContent value="composicao" className="mt-4"><AuditoriaComposicaoReceita /></TabsContent>
        <TabsContent value="subreceitas" className="mt-4"><AuditoriaSubreceitas /></TabsContent>
        <TabsContent value="medidas" className="mt-4 space-y-4">
          <AuditoriaMedidasCaseiras />
          <HistoricoSaneamentoMedidas />
        </TabsContent>
        <TabsContent value="receitas" className="mt-4"><AuditoriaReceitas /></TabsContent>
        <TabsContent value="categorias" className="mt-4"><RelatorioCategorias /></TabsContent>
        <TabsContent value="duplicados" className="mt-4"><RelatorioDuplicados /></TabsContent>
        <TabsContent value="faxina" className="mt-4"><RelatorioFaxinaCategorias /></TabsContent>
        <TabsContent value="poucos" className="mt-4"><RelatorioPoucosIngredientes /></TabsContent>
      </Tabs>
    </div>
  );
}
