import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

// Checklist de primeiros passos do trial: desaparece sozinho quando os três
// passos estão concluídos, sem depender de flag manual.
export default function ChecklistPrimeirosPassos({ minhasReceitas = 0, meusCardapios = 0, meusEventos = 0 }) {
  const passos = [
    {
      titulo: "Escale sua primeira receita",
      descricao: "Abra uma receita, mude as porções e veja custo e lista se ajustarem.",
      to: "/receitas",
      feito: minhasReceitas > 0,
    },
    {
      titulo: "Monte sua primeira refeição",
      descricao: "Combine receitas em um cardápio e veja o custo por pessoa.",
      to: "/refeicoes",
      feito: meusCardapios > 0,
    },
    {
      titulo: "Planeje seu primeiro evento",
      descricao: "Calcule as quantidades por pessoa e gere o orçamento do cliente.",
      to: "/eventos",
      feito: meusEventos > 0,
    },
  ];

  const concluidos = passos.filter((p) => p.feito).length;
  if (concluidos === passos.length) return null;

  return (
    <Card className="p-4 border-2" style={{ borderColor: "#2A4E3D33", background: "linear-gradient(135deg, #F7FAF8 0%, #FFFFFF 100%)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold" style={{ color: "#2A4E3D" }}>Primeiros passos</h3>
        <span className="text-xs font-semibold text-muted-foreground">{concluidos} de {passos.length}</span>
      </div>
      <div className="space-y-2">
        {passos.map((passo) => (
          <Link
            key={passo.titulo}
            to={passo.to}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-accent/40 transition-colors"
          >
            {passo.feito
              ? <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: "#2A4E3D" }} />
              : <Circle className="w-5 h-5 shrink-0 text-muted-foreground/50" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${passo.feito ? "line-through text-muted-foreground" : ""}`}>
                {passo.titulo}
              </p>
              {!passo.feito && <p className="text-xs text-muted-foreground">{passo.descricao}</p>}
            </div>
            {!passo.feito && <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" />}
          </Link>
        ))}
      </div>
    </Card>
  );
}