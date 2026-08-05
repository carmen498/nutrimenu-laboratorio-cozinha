import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle, ClipboardCheck, PieChart, Copy } from "lucide-react";
import AuditoriaRendimento from "./AuditoriaRendimento";
import AuditoriaReceitas from "./AuditoriaReceitas";
import RelatorioCategorias from "./RelatorioCategorias";
import RelatorioDuplicados from "./RelatorioDuplicados";

const TABS = ["rendimento", "receitas", "categorias", "duplicados"];

export default function Auditorias() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState(TABS.includes(tabParam) ? tabParam : "rendimento");

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <h1 className="font-display text-2xl font-bold" style={{ color: "#2A4E3D" }}>
        Auditorias
      </h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rendimento" className="gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Rendimento
          </TabsTrigger>
          <TabsTrigger value="receitas" className="gap-1.5">
            <ClipboardCheck className="w-4 h-4" /> Receitas
          </TabsTrigger>
          <TabsTrigger value="categorias" className="gap-1.5">
            <PieChart className="w-4 h-4" /> Categorias
          </TabsTrigger>
          <TabsTrigger value="duplicados" className="gap-1.5">
            <Copy className="w-4 h-4" /> Duplicados
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rendimento" className="mt-4">
          <AuditoriaRendimento />
        </TabsContent>
        <TabsContent value="receitas" className="mt-4">
          <AuditoriaReceitas />
        </TabsContent>
        <TabsContent value="categorias" className="mt-4">
          <RelatorioCategorias />
        </TabsContent>
        <TabsContent value="duplicados" className="mt-4">
          <RelatorioDuplicados />
        </TabsContent>
      </Tabs>
    </div>
  );
}