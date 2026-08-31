import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ListaPlanejamentos from "@/components/planejamento/ListaPlanejamentos";

export default function Eventos() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Eventos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planeje convidados, quantidades, cardápio e produção.
          </p>
        </div>
      </div>

      <ListaPlanejamentos />
    </div>
  );
}
