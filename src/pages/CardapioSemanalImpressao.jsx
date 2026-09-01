import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Printer } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  listarCardapiosPeriodo,
  listarItensCardapioPeriodo,
  obterCardapioPeriodo,
} from "@/lib/cardapioPeriodo";
import { printarElementoIsolado } from "@/lib/printIsolado";

const NOMES_DIAS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const TIPOS = { refeicao: "Refeição", receita: "Receita", ingrediente: "Ingrediente" };
const CLASSIFICACOES = {
  entrada: "Entradas",
  salada: "Saladas",
  refeicao_completa: "Refeição completa",
  prato_principal: "Pratos principais",
  segundo_prato: "Segundo prato",
  acompanhamento: "Acompanhamentos",
  guarnicao: "Guarnição",
  sobremesa: "Sobremesas",
  bebida: "Bebidas",
  outro: "Outro",
};

function dataUtc(data) {
  return new Date(`${data}T00:00:00.000Z`);
}

function isoData(data) {
  return data.toISOString().slice(0, 10);
}

function adicionarDias(data, quantidade) {
  const valor = dataUtc(data);
  valor.setUTCDate(valor.getUTCDate() + quantidade);
  return isoData(valor);
}

function formatarData(data, formatoLongo = false) {
  return dataUtc(data).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: formatoLongo ? "long" : undefined,
    day: "2-digit",
    month: formatoLongo ? "long" : "2-digit",
    year: formatoLongo ? "numeric" : undefined,
  });
}

function identificacaoFaixa(valor) {
  if (valor === "almoco") return "Almoço";
  if (valor === "jantar") return "Jantar";
  return "Refeição";
}

function ordenarItens(lista) {
  return [...lista].sort((a, b) =>
    String(a.faixa || "").localeCompare(String(b.faixa || ""), "pt-BR") ||
    (a.ordem || 0) - (b.ordem || 0)
  );
}

function intervaloMes(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const inicio = `${ano}-${String(numeroMes).padStart(2, "0")}-01`;
  const fimData = new Date(Date.UTC(ano, numeroMes, 0));
  return { inicio, fim: isoData(fimData), totalDias: fimData.getUTCDate() };
}

export default function CardapioSemanalImpressao() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tipoSolicitado = searchParams.get("tipo");
  const tipo = ["diario", "semanal", "mensal"].includes(tipoSolicitado) ? tipoSolicitado : "semanal";

  const { data: cardapio, isLoading, error } = useQuery({
    queryKey: ["cardapio-periodo", id],
    queryFn: () => obterCardapioPeriodo(id),
    enabled: Boolean(id),
  });
  const { data: itensSemana = [], isLoading: carregandoItens, error: erroItens } = useQuery({
    queryKey: ["cardapio-periodo-itens", id],
    queryFn: () => listarItensCardapioPeriodo(id),
    enabled: Boolean(id),
  });

  const dataReferencia = searchParams.get("data") || cardapio?.data_inicio || "";
  const mesReferencia = searchParams.get("mes") || (cardapio?.data_inicio || "").slice(0, 7);

  const { data: dadosMensais, isLoading: carregandoMes, error: erroMes } = useQuery({
    queryKey: ["relatorio-cardapio-mensal", mesReferencia],
    enabled: tipo === "mensal" && /^\d{4}-\d{2}$/.test(mesReferencia),
    queryFn: async () => {
      const { inicio, fim } = intervaloMes(mesReferencia);
      const todos = await listarCardapiosPeriodo("data_inicio", 500);
      const cardapios = todos.filter((item) => item.data_inicio <= fim && item.data_fim >= inicio);
      const listas = await Promise.all(cardapios.map(async (item) => {
        const itens = await listarItensCardapioPeriodo(item.id);
        const faixa = identificacaoFaixa(item.identificacao_refeicao);
        return itens.map((registro) => ({
          ...registro,
          faixa,
          cardapioNome: item.nome,
        }));
      }));
      return { cardapios, itens: listas.flat() };
    },
  });

  if (isLoading || carregandoItens || (tipo === "mensal" && carregandoMes)) {
    return <div className="flex justify-center py-20 text-sm text-muted-foreground">Preparando relatório...</div>;
  }
  if (error || erroItens || erroMes || !cardapio) {
    return <div className="max-w-3xl mx-auto rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Não foi possível preparar o relatório do Cardápio.</div>;
  }

  const faixa = identificacaoFaixa(cardapio.identificacao_refeicao);
  let datas = [];
  let itensRelatorio = itensSemana.map((item) => ({ ...item, faixa, cardapioNome: cardapio.nome }));
  let periodo = "";
  let titulo = "Cardápio semanal";

  if (tipo === "diario") {
    const dataValida = dataReferencia >= cardapio.data_inicio && dataReferencia <= cardapio.data_fim
      ? dataReferencia
      : cardapio.data_inicio;
    datas = [dataValida];
    periodo = formatarData(dataValida, true);
    titulo = "Cardápio diário";
  } else if (tipo === "mensal") {
    const { inicio, totalDias } = intervaloMes(mesReferencia);
    datas = Array.from({ length: totalDias }, (_, indice) => adicionarDias(inicio, indice));
    itensRelatorio = dadosMensais?.itens || [];
    periodo = dataUtc(inicio).toLocaleDateString("pt-BR", {
      timeZone: "UTC", month: "long", year: "numeric",
    });
    titulo = "Cardápio mensal";
  } else {
    datas = Array.from({ length: 7 }, (_, indice) => adicionarDias(cardapio.data_inicio, indice));
    periodo = `${formatarData(cardapio.data_inicio, true)} a ${formatarData(cardapio.data_fim, true)}`;
  }

  const dias = datas.map((data) => ({
    data,
    nome: NOMES_DIAS[dataUtc(data).getUTCDay()],
    itens: ordenarItens(itensRelatorio.filter((item) => item.data === data)),
  }));
  const totalItens = dias.reduce((total, dia) => total + dia.itens.length, 0);
  const emissao = new Date().toLocaleDateString("pt-BR");

  function atualizarParametro(chave, valor) {
    const proximos = new URLSearchParams(searchParams);
    proximos.set(chave, valor);
    setSearchParams(proximos);
  }

  function imprimir() {
    printarElementoIsolado(
      "cardapio-periodo-print-area",
      `@page { size: A4 portrait; margin: 10mm; }
       html, body { background: white !important; color: #17251d !important; width: 100% !important; }
       *, *::before, *::after { box-sizing: border-box !important; }
       #cardapio-periodo-print-area { width: 100% !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
       .cardapio-dia-linha { break-inside: avoid; }
       .cardapio-item { break-inside: avoid; }`
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="no-print flex flex-col lg:flex-row lg:items-center gap-3">
        <button type="button" onClick={() => navigate("/cardapios")} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar aos Cardápios
        </button>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-2">
          {tipo === "diario" && (
            <input
              type="date"
              min={cardapio.data_inicio}
              max={cardapio.data_fim}
              value={dataReferencia >= cardapio.data_inicio && dataReferencia <= cardapio.data_fim ? dataReferencia : cardapio.data_inicio}
              onChange={(e) => atualizarParametro("data", e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          )}
          {tipo === "mensal" && (
            <input
              type="month"
              value={mesReferencia}
              onChange={(e) => atualizarParametro("mes", e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
          )}
          <button type="button" onClick={imprimir} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Printer className="w-4 h-4" /> Imprimir ou salvar em PDF
          </button>
        </div>
      </div>

      <div className="no-print rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        Relatório {tipo} com o cardápio apresentado por extenso, dia a dia.
      </div>

      <article id="cardapio-periodo-print-area" className="bg-white text-slate-900 border border-border rounded-xl overflow-hidden shadow-sm">
        <header className="bg-primary text-primary-foreground px-6 py-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">Laboratório de Cozinha · {titulo}</p>
            <h1 className="font-display text-2xl font-bold mt-0.5">{tipo === "mensal" ? titulo.toUpperCase() : cardapio.nome}</h1>
            <p className="text-xs mt-1 capitalize opacity-90">{periodo}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold">{totalItens} {totalItens === 1 ? "item" : "itens"}</p>
            <p className="text-[10px] opacity-80">Emitido em {emissao}</p>
          </div>
        </header>

        <div className="p-5">
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[155px_1fr] bg-[#e7efe9] border-b border-slate-300 text-xs font-bold text-[#2c513e]">
              <div className="px-4 py-3 border-r border-slate-300">Dia</div>
              <div className="px-4 py-3">Cardápio por extenso</div>
            </div>
            {dias.map((dia) => (
              <section key={dia.data} className="cardapio-dia-linha grid grid-cols-[155px_1fr] border-b border-slate-200 last:border-b-0 min-h-[76px]">
                <div className="px-4 py-3 border-r border-slate-200 bg-slate-50">
                  <h2 className="font-bold text-[#2c513e]">{dia.nome}</h2>
                  <p className="text-xs text-slate-500 mt-1">{formatarData(dia.data)}</p>
                </div>
                <div className="px-4 py-3">
                  {dia.itens.length ? (
                    <div className="space-y-2">
                      {dia.itens.map((item) => (
                        <div key={item.id} className="cardapio-item">
                          <p className="text-sm font-semibold">{item.nome_cache}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.faixa}
                            {" · "}
                            {item.classificacao ? (CLASSIFICACOES[item.classificacao] || item.classificacao) : TIPOS[item.tipo_origem]}
                            {tipo === "mensal" && item.cardapioNome ? ` · ${item.cardapioNome}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sem itens planejados</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-slate-200 flex justify-between gap-4 text-[9px] text-slate-500">
          <span>Laboratório de Cozinha · Gastronomia Planejada</span>
          <span>{titulo} · {periodo}</span>
        </footer>
      </article>
    </div>
  );
}
