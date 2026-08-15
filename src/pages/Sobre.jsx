import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Sobre() {
  const navigate = useNavigate();

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
          <div className="w-28 h-28 rounded-full bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground/60" />
          </div>
        </div>

        <h1 className="font-display text-2xl font-bold text-center mb-6">Sobre a Carmen</h1>

        <div className="space-y-4">
          {paragrafos.map((p, idx) => (
            <p key={idx} className="text-sm leading-relaxed text-foreground/90">{p}</p>
          ))}
        </div>
      </Card>
    </div>
  );
}