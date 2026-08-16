import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsuariosTab from "@/components/comunicacao/UsuariosTab";
import TransacionaisTab from "@/components/comunicacao/TransacionaisTab";
import CampanhasTab from "@/components/comunicacao/CampanhasTab";
import WhatsappReativoTab from "@/components/comunicacao/WhatsappReativoTab";
import TemplateWhatsappTab from "@/components/comunicacao/TemplateWhatsappTab";
import ConfiguracoesEmailTab from "@/components/comunicacao/ConfiguracoesEmailTab";

export default function AdminComunicacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aba, setAba] = useState("usuarios");
  const [nomeTemplateEdicao, setNomeTemplateEdicao] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: user?.role === "admin",
  });

  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const irParaTemplate = (nomeTemplate) => {
    setNomeTemplateEdicao(nomeTemplate);
    setAba("editor-whatsapp");
  };

  const destinatariosSelecionados = usuarios.filter((u) => selecionados.has(u.id));

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
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="transacionais">Transacionais</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
          <TabsTrigger value="whatsapp-reativo">WhatsApp reativo</TabsTrigger>
          <TabsTrigger value="editor-whatsapp">Editor de template WhatsApp</TabsTrigger>
          <TabsTrigger value="config-email">Configurações de e-mail</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios" className="pt-4">
          <UsuariosTab
            usuarios={usuarios}
            isLoading={isLoading}
            selecionados={selecionados}
            setSelecionados={setSelecionados}
            onDispararEmail={() => setAba("campanhas")}
          />
        </TabsContent>
        <TabsContent value="transacionais" className="pt-4">
          <TransacionaisTab />
        </TabsContent>
        <TabsContent value="campanhas" className="pt-4">
          <CampanhasTab destinatarios={destinatariosSelecionados} />
        </TabsContent>
        <TabsContent value="whatsapp-reativo" className="pt-4">
          <WhatsappReativoTab onEditarTemplate={irParaTemplate} />
        </TabsContent>
        <TabsContent value="editor-whatsapp" className="pt-4">
          <TemplateWhatsappTab nomeInicial={nomeTemplateEdicao} />
        </TabsContent>
        <TabsContent value="config-email" className="pt-4">
          <ConfiguracoesEmailTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}