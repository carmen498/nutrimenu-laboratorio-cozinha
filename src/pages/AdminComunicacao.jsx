import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { computeStatusUsuario } from "@/lib/statusAssinaturaUsuario";
import { fetchAllPages, withTimeout } from "@/lib/fetchAllPages";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsuariosTab from "@/components/comunicacao/UsuariosTab";
import TransacionaisTab from "@/components/comunicacao/TransacionaisTab";
import CampanhasTab from "@/components/comunicacao/CampanhasTab";
import WhatsappReativoTab from "@/components/comunicacao/WhatsappReativoTab";
import TemplateWascriptTab from "@/components/comunicacao/TemplateWascriptTab";
import ConfiguracoesEmailTab from "@/components/comunicacao/ConfiguracoesEmailTab";
import PlanosTab from "@/components/comunicacao/PlanosTab";
import AcessosCustosTab from "@/components/comunicacao/AcessosCustosTab";

export default function AdminComunicacao() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aba, setAba] = useState("usuarios");
  const [tipoTemplateEdicao, setTipoTemplateEdicao] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());

  const { data: usuarios = [], isLoading, isError, error } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: () => withTimeout(
      fetchAllPages(base44.entities.User, "-created_date", 500),
      30000,
      "Não foi possível carregar todos os usuários. Tente novamente."
    ),
    enabled: user?.role === "admin",
    retry: false,
  });

  if (user && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const irParaTemplate = (tipoTemplate) => {
    setTipoTemplateEdicao(tipoTemplate);
    setAba("editor-whatsapp");
  };

  // Usuários desativados nunca podem entrar em listas de campanha, mesmo se selecionados por engano.
  const destinatariosSelecionados = usuarios.filter(
    (u) => selecionados.has(u.id) && computeStatusUsuario(u).label !== "Inativo"
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-12">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-2">
        <MessageSquare className="w-6 h-6" style={{ color: "#2A4E3D" }} />
        <h1 className="font-display text-xl font-bold" style={{ color: "#2A4E3D" }}>Administração</h1>
      </div>

      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="acessos-custos">Acessos Custos</TabsTrigger>
          <TabsTrigger value="planos">Planos</TabsTrigger>
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
            isError={isError}
            error={error}
            selecionados={selecionados}
            setSelecionados={setSelecionados}
            onDispararEmail={() => setAba("campanhas")}
          />
        </TabsContent>
        <TabsContent value="acessos-custos" className="pt-4">
          <AcessosCustosTab usuarios={usuarios} />
        </TabsContent>
        <TabsContent value="planos" className="pt-4">
          <PlanosTab />
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
          <TemplateWascriptTab tipoInicial={tipoTemplateEdicao} />
        </TabsContent>
        <TabsContent value="config-email" className="pt-4">
          <ConfiguracoesEmailTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}