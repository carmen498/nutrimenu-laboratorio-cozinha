// Roteador: /lista-compras é usado por dois fluxos independentes.
// - Sem parâmetro "planejamento": Carrinho de ingredientes (novo, ingredient-centric).
// - Com "?planejamento=ID": lista de compras do EVENTO (fluxo próprio, intacto).
import { useSearchParams } from "react-router-dom";
import Carrinho from "@/pages/Carrinho";
import EventoListaCompras from "@/components/planejamento/EventoListaCompras";

export default function ListaCompras() {
  const [searchParams] = useSearchParams();
  const planejamentoId = searchParams.get("planejamento");

  if (planejamentoId) return <EventoListaCompras />;
  return <Carrinho />;
}