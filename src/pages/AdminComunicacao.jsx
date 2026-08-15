import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransacionaisTab from "@/components/comunicacao/TransacionaisTab";
import CampanhasTab from "@/components/comunicacao/CampanhasTab";
import WhatsappReativoTab from "@/components/comunicacao/WhatsappReativoTab";
import TemplateWhatsappTab from "@/components/comunicacao/TemplateWhatsappTab";

export default function AdminComunicacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aba, setAba] = useState("transacionais");
  const [nomeTemplateEdicao, setNomeTemplateEdicao] = useState(null);

  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const irParaTemplate = (nomeTemplate) => {
    setNomeTemplateEdicao(nomeTemplate);
    setAba("editor-whatsapp");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2">
        <MessageSquare className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Central de Comunicação</h1>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="transacionais">Transacionais</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="whatsapp-reativo">WhatsApp reativo</TabsTrigger>
          <TabsTrigger value="editor-whatsapp">Editor de template WhatsApp</TabsTrigger>
        </TabsList>
        <TabsContent value="transacionais" className="pt-4">
          <TransacionaisTab />
        </TabsContent>
        <TabsContent value="campanhas" className="pt-4">
          <CampanhasTab />
        </TabsContent>
        <TabsContent value="whatsapp-reativo" className="pt-4">
          <WhatsappReativoTab onEditarTemplate={irParaTemplate} />
        </TabsContent>
        <TabsContent value="editor-whatsapp" className="pt-4">
          <TemplateWhatsappTab nomeInicial={nomeTemplateEdicao} />
        </TabsContent>
      </Tabs>
    </div>
  );
}