import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calculator, Check, ChefHat, Clock3, History, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const BENEFICIOS = [
  { icon: WalletCards, titulo: "Custo do negócio", texto: "Distribua despesas da atividade entre as receitas produzidas, sem transformar o módulo em sistema contábil." },
  { icon: Calculator, titulo: "Formação do preço", texto: "Trabalhe com custo por receita, margem, markup e preço de venda em um único fluxo." },
  { icon: History, titulo: "Histórico preservado", texto: "Cada ficha salva mantém os valores daquele momento, mesmo que preços ou receitas mudem depois." },
  { icon: ShieldCheck, titulo: "Dados preservados", texto: "Se o acesso terminar, as fichas permanecem guardadas para uma futura reativação." },
];

const MENSAGEM_MOTIVO = {
  comercial_indisponivel: "A contratação comercial deste complemento ainda não foi liberada.",
  addon_nao_contratado: "Seu plano atual não inclui o Laboratório de Custos.",
  addon_ainda_nao_iniciado: "Seu acesso ao Laboratório de Custos ainda não iniciou.",
  addon_expirado: "O acesso ao Laboratório de Custos expirou.",
  addon_suspenso: "O acesso ao Laboratório de Custos está suspenso.",
  addon_cancelado: "O acesso ao Laboratório de Custos foi cancelado.",
  addon_pendente: "O acesso ao Laboratório de Custos está pendente.",
  feature_desligada: "O Laboratório de Custos está temporariamente indisponível.",
};

function dinheiro(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function PlanoCard({ plano, admin }) {
  const trial = plano.plano_id === "custos_trial";
  const anual = plano.plano_id === "custos_anual";
  return (
    <Card className={`p-5 flex flex-col relative ${anual ? "border-primary shadow-sm" : ""}`}>
      {anual && <Badge className="absolute right-4 top-4">Melhor valor</Badge>}
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">{trial ? "Experimente" : "Plano"}</p>
      <h3 className="font-display text-xl font-bold mt-2">{plano.nome}</h3>
      <p className="text-sm text-muted-foreground mt-1 min-h-10">{plano.subtitulo}</p>
      <div className="mt-5">
        <span className="text-3xl font-bold">{trial ? "Grátis" : dinheiro(plano.preco_exibido)}</span>
        {!trial && <span className="text-xs text-muted-foreground ml-1">{plano.periodo_exibido === "ano" ? "/ano" : "/30 dias"}</span>}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{plano.preco_detalhe}</p>
      <div className="mt-5 pt-4 border-t space-y-2 flex-1">
        {(plano.beneficios || []).map((beneficio) => (
          <div key={beneficio} className="flex gap-2 text-sm"><Check className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span>{beneficio}</span></div>
        ))}
      </div>
      <Button disabled className="mt-5 w-full" variant={trial ? "default" : anual ? "default" : "outline"}>
        <LockKeyhole className="w-4 h-4 mr-2" />
        {trial ? "Começar 7 dias grátis" : "Escolher este plano"}
      </Button>
      {admin && <p className="text-[11px] text-center text-amber-700 mt-2">Homologação: ação comercial desativada</p>}
    </Card>
  );
}

function FluxoTrial() {
  const passos = [
    ["1", "Ativar teste", "O usuário escolhe 7 dias grátis. O trial poderá ser utilizado uma única vez."],
    ["2", "Usar o módulo", "Durante 7 dias, o acesso ao Laboratório de Custos fica ativo junto ao Laboratório de Cozinha."],
    ["3", "Aviso de término", "O sistema poderá avisar quando o trial estiver perto de terminar, usando o e-mail transacional preparado."],
    ["4", "Encerramento", "Ao final do período, o acesso ao módulo termina, mas fichas e histórico permanecem preservados."],
    ["5", "Escolher plano", "Quando a venda for liberada, o usuário poderá contratar 30 dias ou anual sem perder o histórico."],
  ];
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><Clock3 className="w-5 h-5" /></div>
        <div><p className="text-xs font-semibold text-primary uppercase tracking-wide">Fluxo visual do trial</p><h2 className="font-display text-xl font-bold mt-1">Como os 7 dias grátis funcionarão</h2></div>
      </div>
      <div className="grid md:grid-cols-5 gap-3 mt-6">
        {passos.map(([n, titulo, texto]) => (
          <div key={n} className="rounded-xl border p-4 bg-muted/15">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{n}</div>
            <p className="font-semibold text-sm mt-3">{titulo}</p>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function CustosBloqueado() {
  const { user } = useAuth();
  const location = useLocation();
  const { data: configs = [] } = useQuery({
    queryKey: ["custos-config-addon"],
    queryFn: () => base44.entities.ConfiguracaoAddonCustos.filter({ chave: "laboratorio_custos" }, "-updated_date", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });
  const { data: planos = [] } = useQuery({
    queryKey: ["custos-planos-oferta"],
    queryFn: () => base44.entities.ConfiguracaoPlano.filter({ produto: "laboratorio_custos" }, "ordem", 10),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const config = configs[0] || null;
  const admin = user?.role === "admin";
  const motivo = location.state?.motivo || (config?.modulo_habilitado ? "addon_nao_contratado" : "comercial_indisponivel");

  if (!admin && !config?.venda_habilitada && !config?.trial_habilitado) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-1">
        <Card className="p-6 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto"><LockKeyhole className="w-6 h-6" /></div>
          <h1 className="font-display text-2xl font-bold mt-4">Laboratório de Custos</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">Este módulo ainda não está disponível para sua conta. Seu acesso ao Laboratório de Cozinha continua funcionando normalmente.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2"><Button asChild><Link to="/app"><ChefHat className="w-4 h-4 mr-2" /> Voltar ao Laboratório de Cozinha</Link></Button><Button asChild variant="outline"><Link to="/suporte"><MessageCircle className="w-4 h-4 mr-2" /> Falar com suporte</Link></Button></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-7 pb-24 md:pb-10">
      {admin && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-amber-950">Prévia de homologação</p><p className="text-xs text-amber-900 mt-1">Esta tela está sendo exibida para administração. Trial público, venda e checkout continuam desligados.</p></div>
          <Badge variant="outline" className="border-amber-400 text-amber-900 bg-white">Não publicado</Badge>
        </div>
      )}

      <Card className="p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -right-16 -top-16 w-52 h-52 rounded-full bg-primary/5" />
        <div className="relative grid lg:grid-cols-[1.1fr_.9fr] gap-8 items-center">
          <div>
            <Badge variant="outline" className="gap-1"><Sparkles className="w-3 h-3" /> Complemento do Laboratório de Cozinha</Badge>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-5">Da receita ao preço de venda, com os seus números.</h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-3 max-w-2xl">O Laboratório de Custos aproveita as receitas, ingredientes e custos técnicos que você já mantém no Laboratório de Cozinha e organiza o próximo passo: entender quanto custa produzir e apoiar a decisão de quanto cobrar.</p>
            <div className="flex flex-wrap gap-2 mt-6"><Badge variant="secondary">7 dias grátis</Badge><Badge variant="secondary">30 dias · R$ 8,90</Badge><Badge variant="secondary">Anual · R$ 87,00</Badge></div>
          </div>
          <div className="rounded-2xl border bg-muted/20 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Antes de contratar</p>
            <h2 className="font-display text-xl font-bold mt-2">Seu Laboratório de Cozinha continua sendo a base</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /><span>Não é um produto independente: funciona como complemento.</span></div>
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /><span>Receitas e ingredientes continuam sendo administrados na Cozinha.</span></div>
              <div className="flex gap-2"><Check className="w-4 h-4 text-primary mt-0.5" /><span>Fichas de custo permanecem preservadas mesmo se o acesso ao complemento terminar.</span></div>
            </div>
          </div>
        </div>
      </Card>

      <section>
        <div className="text-center max-w-2xl mx-auto"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Escolha como começar</p><h2 className="font-display text-2xl font-bold mt-2">Três formas de acessar o Laboratório de Custos</h2><p className="text-sm text-muted-foreground mt-2">A contratação ainda não está liberada. Esta é a prévia da experiência que será anexada ao Laboratório de Cozinha.</p></div>
        <div className="grid md:grid-cols-3 gap-4 mt-6">{planos.map((plano) => <PlanoCard key={plano.id} plano={plano} admin={admin} />)}</div>
      </section>

      <FluxoTrial />

      <section>
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">O que está incluído</p>
        <h2 className="font-display text-xl font-bold mt-1">Um fluxo de custos feito para a produção</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {BENEFICIOS.map(({ icon: Icon, titulo, texto }) => (
            <Card key={titulo} className="p-5"><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon className="w-5 h-5" /></div><h3 className="font-semibold mt-4">{titulo}</h3><p className="text-xs text-muted-foreground mt-2 leading-relaxed">{texto}</p></Card>
          ))}
        </div>
      </section>

      <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0"><ChefHat className="w-5 h-5" /></div>
        <div className="flex-1"><h2 className="font-semibold">{MENSAGEM_MOTIVO[motivo] || "O Laboratório de Custos ainda não está liberado comercialmente."}</h2><p className="text-sm text-muted-foreground mt-1">Nenhuma alteração foi feita no seu plano principal do Laboratório de Cozinha.</p></div>
        <div className="flex gap-2"><Button asChild variant="outline"><Link to="/app">Laboratório de Cozinha</Link></Button>{admin && <Button asChild><Link to="/custos">Abrir módulo</Link></Button>}</div>
      </Card>
    </div>
  );
}