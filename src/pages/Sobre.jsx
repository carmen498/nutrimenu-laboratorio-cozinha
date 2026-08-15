import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

const BRUBINS_URL = "https://www.brubins.com.br/";
const linkClass = "text-blue-600 hover:underline font-medium";

function renderParagrafo(texto) {
  const partes = texto.split("BRUBINS");
  return partes.map((parte, idx) => (
    <span key={idx}>
      {parte}
      {idx < partes.length - 1 && (
        <a href={BRUBINS_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          BRUBINS
        </a>
      )}
    </span>
  ));
}

export default function Sobre() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: config } = useQuery({
    queryKey: ["configuracao-carmen"],
    queryFn: async () => {
      const list = await base44.entities.ConfiguracaoCarmen.list();
      return list[0] || null;
    },
  });

  const uploadFotoMut = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (config) {
        await base44.entities.ConfiguracaoCarmen.update(config.id, { foto_sobre_url: file_url });
      } else {
        await base44.entities.ConfiguracaoCarmen.create({ foto_sobre_url: file_url });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["configuracao-carmen"] });
      toast.success("Foto atualizada!");
    },
    onError: () => toast.error("Erro ao enviar foto"),
  });

  const paragrafos = [
    "Tudo começou numa cozinha a lenha, na fronteira com o Uruguai — Carmen tinha 5 anos quando já \"cuidava das panelas\" da família. Cresceu vendo geleias, escabeches e galinha ao molho pardo ganharem forma nas mãos das mulheres da casa. Ali nasceu o fascínio por transformar alimento em conhecimento.",
    "Anos depois, um manual caseiro sobre congelamento — feito pra resolver o próprio dia a dia — virou curso, virou livro, e em 1984 virou a BRUBINS: fundada vendendo o próprio apartamento, começou na cozinha de casa e se tornou uma indústria de alimentos congelados que segue ativa até hoje, sob gestão do filho de Carmen, Bruno.",
    "Foi cuidando da produção da BRUBINS que Carmen percebeu que fichas técnicas feitas à mão não davam mais conta — e foi assim, ainda nos anos 80, que ela começou a programar o primeiro sistema de gestão de produção da própria empresa. Anos depois, formou-se em Nutrição e levou essa mesma inquietação para a área da rotulagem, criando o Nutrimenu.",
    "O Laboratório de Cozinha nasce dessa mesma raiz: décadas calculando rendimento, custo e produção na prática — da cozinha industrial da BRUBINS até a tecnologia de hoje. Não é teoria. É o caderno de receitas de uma vida inteira, transformado em ferramenta.",
    "Essa mesma vivência também deu origem à coleção de eBooks \"Apaixonados Por\" (Empanados, Festas, Receitas que Inspiram, Cozinhe Hoje Festa Amanhã, entre outros), disponível no Hotmart Club.",
  ];

  return (
    <div className="space-y-4 pb-24 md:pb-8 max-w-2xl mx-auto">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-5 h-5" />
      </Button>

      <Card className="p-6 md:p-8">
        <div className="flex flex-col items-center mb-6">
          <label
            className={`relative w-28 h-28 rounded-full overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center ${isAdmin ? "cursor-pointer hover:border-primary/40 hover:bg-muted/80 transition-colors" : ""}`}
            title={isAdmin ? "Clique para adicionar foto" : ""}
          >
            {config?.foto_sobre_url ? (
              <img src={config.foto_sobre_url} alt="Carmen" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground/60" />
            )}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                <Camera className="w-6 h-6 text-white" />
              </div>
            )}
            {isAdmin && (
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) uploadFotoMut.mutate(file);
                }}
              />
            )}
          </label>
        </div>

        <h1 className="font-display text-2xl font-bold text-center mb-6">Sobre a Carmen</h1>

        <div className="space-y-4">
          {paragrafos.map((p, idx) => (
            <p key={idx} className="text-sm leading-relaxed text-foreground/90">{renderParagrafo(p)}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}