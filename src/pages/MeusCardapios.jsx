import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChefHat, User } from "lucide-react";

const TIPO_MAP = {
  diario: { nome: "Diário", icone: "🏠", corPill: "#C8E6C9", corPillTexto: "#1B5E20" },
  semanal: { nome: "Semanal", icone: "📅", corPill: "#BBDEFB", corPillTexto: "#0D47A1" },
  fim_de_semana: { nome: "Fim de semana", icone: "🌅", corPill: "#FFD180", corPillTexto: "#BF360C" },
  especial: { nome: "Especial", icone: "⭐", corPill: "#FFF176", corPillTexto: "#E65100" },
  comemoracao: { nome: "Comemoração", icone: "🎉", corPill: "#F8BBD0", corPillTexto: "#880E4F" },
  marmitas: { nome: "Marmitas", icone: "📦", corPill: "#D7CCC8", corPillTexto: "#3E2723" },
  buffet: { nome: "Buffet", icone: "⚖️", corPill: "#E1BEE7", corPillTexto: "#4A148C" },
  happy_hour: { nome: "Happy Hour", icone: "🍹", corPill: "#B2DFDB", corPillTexto: "#004D40" },
  personalizado: { nome: "Personalizado", icone: "✏️", corPill: "#E0E0E0", corPillTexto: "#424242" },
};

const LABEL_UNIDADE = {
  diario: "pessoas", semanal: "pessoas", fim_de_semana: "pessoas",
  especial: "pessoas", comemoracao: "convidados", marmitas: "marmitas",
  buffet: "kg", happy_hour: "pessoas", personalizado: "pessoas",
};

export default function MeusCardapios() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cardapios, setCardapios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const lista = await base44.entities.Cardapio.filter({ usuario_dono_id: user.id }, "-data_personalizacao", 500);
        setCardapios(lista || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [user?.id]);

  const getNum = (c) => c.num_unidades || 1;
  const formatarData = (d) => (d ? new Date(d).toLocaleDateString("pt-BR") : "");

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-24 md:pb-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">
            Meus Cardápios <Badge className="ml-2 text-sm align-middle bg-primary text-primary-foreground px-2 py-0.5">{cardapios.length}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Suas cópias pessoais de cardápios do Laboratório, criadas automaticamente ao editar um cardápio original.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : cardapios.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-lg font-medium">Nenhum cardápio personalizado ainda</p>
          <p className="text-sm mt-1">Ao editar um cardápio do catálogo, sua cópia pessoal aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cardapios.map((c) => {
            const cfg = TIPO_MAP[c.tipo] || TIPO_MAP.diario;
            const num = getNum(c);
            const custoPorUnid = num > 0 && c.custo_total > 0 ? c.custo_total / num : 0;
            return (
              <Link
                key={c.id}
                to={`/cardapio/${c.id}`}
                className="block bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center p-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {c.nome?.toUpperCase?.() || c.nome}
                      </h3>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 shrink-0 gap-1">
                        <User className="w-2.5 h-2.5" /> Personalizado
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Badge className="text-xs border-0" style={{ backgroundColor: cfg.corPill, color: cfg.corPillTexto }}>
                        {cfg.icone} {cfg.nome}
                      </Badge>
                      {c.data && <span>{formatarData(c.data)}</span>}
                      <span>{num} {LABEL_UNIDADE[c.tipo] || "unidades"}</span>
                      {c.data_personalizacao && (
                        <span className="text-[11px]">personalizado em {formatarData(c.data_personalizacao)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {c.custo_total > 0 && (
                      <p className="font-semibold text-foreground text-sm">
                        R$ {Number(c.custo_total).toFixed(2)}
                      </p>
                    )}
                    {custoPorUnid > 0 && (
                      <p className="text-xs text-muted-foreground">
                        R$ {custoPorUnid.toFixed(2)}/{LABEL_UNIDADE[c.tipo] === "kg" ? "kg" : "un"}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}