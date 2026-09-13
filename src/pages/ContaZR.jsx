// Página de conta do Guia Técnico ZR — identidade visual própria, distinta
// do Laboratório de Cozinha. Sem sidebar/topbar do app. Exige login (rota
// protegida em App.jsx). Lê AcessoGuiaTecnicoZR e Pagamento (recibos) e
// registra pedidos de desistência via solicitarDesistenciaCompra.
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllFilteredPages } from "@/lib/fetchAllPages";
import { Loader2, ShieldCheck, FileText, ArrowLeft, Clock, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";

const PRAZO_DIAS = 7;
const DIA_MS = 24 * 60 * 60 * 1000;

const NOMES_FAIXA = {
  tin: "Tabela de Informação Nutricional",
  full: "ZR Profissional",
  "arquitetura-do-rotulo": "Arquitetura do Rótulo",
};

const ehZR = (plano) => typeof plano === "string" && plano.startsWith("zr_");

const formatarDataHora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const formatarData = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
};

const diasRestantes = (compraEm) => {
  const t = new Date(compraEm).getTime();
  if (!Number.isFinite(t)) return -1;
  return Math.ceil((t + PRAZO_DIAS * DIA_MS - Date.now()) / DIA_MS);
};

export default function ContaZR() {
  const qc = useQueryClient();
  const [enviandoId, setEnviandoId] = useState(null);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me-conta-zr"],
    queryFn: () => base44.auth.me(),
  });

  const { data: acessos = [], isLoading: acessosLoading } = useQuery({
    queryKey: ["acessos-zr", user?.id],
    queryFn: () => fetchAllFilteredPages(base44.entities.AcessoGuiaTecnicoZR, { user_id: user.id }, "-inicio_em"),
    enabled: !!user?.id,
  });

  const { data: pagamentos = [], isLoading: pagsLoading } = useQuery({
    queryKey: ["pagamentos-zr", user?.id],
    queryFn: () => fetchAllFilteredPages(base44.entities.Pagamento, { usuario_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const pagamentosZR = useMemo(() => (pagamentos || []).filter((p) => ehZR(p.plano)), [pagamentos]);
  const pagamentoPorId = useMemo(() => Object.fromEntries(pagamentosZR.map((p) => [p.id, p])), [pagamentosZR]);
  const temAlgumaCompra = (acessos || []).length > 0 || pagamentosZR.length > 0;

  const solicitarDesistencia = async (pagamentoId) => {
    setEnviandoId(pagamentoId);
    try {
      await base44.functions.invoke("solicitarDesistenciaCompra", { pagamento_id: pagamentoId });
      await qc.invalidateQueries({ queryKey: ["pedidos-desistencia", user?.id] });
      toast.success("Pedido de desistência registrado. A devolução integral será processada.");
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Não foi possível registrar o pedido.");
    } finally {
      setEnviandoId(null);
    }
  };

  const { data: pedidos = [] } = useQuery({
    queryKey: ["pedidos-desistencia", user?.id],
    queryFn: () => base44.entities.PedidoDesistencia.filter({ usuario_id: user.id }, "-solicitado_em", 50),
    enabled: !!user?.id,
  });
  const pedidoPorPagamento = useMemo(() => Object.fromEntries((pedidos || []).map((p) => [p.pagamento_id, p])), [pedidos]);

  const carregando = userLoading || acessosLoading || pagsLoading;

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1F1B16] font-sans">
      <style>{`
        .zr-font { font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        .zr-serif { font-family: 'Georgia', 'Times New Roman', serif; }
      `}</style>

      <header className="border-b border-[#E2DBC9] bg-[#1F1B16] text-[#F4F1EA]">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <p className="zr-font text-xs uppercase tracking-[0.25em] text-[#B8A07A]">Guia Técnico ZR</p>
          <h1 className="zr-serif text-2xl md:text-3xl font-semibold mt-1">Minha conta</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-8 zr-font">
        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#8A6D3B]" />
          </div>
        ) : !temAlgumaCompra ? (
          <div className="space-y-8">
            <p className="text-base text-[#4A4338]">Você ainda não tem plano do Guia Técnico ZR.</p>
            <a href="https://zr.nutrimenu.com.br" className="inline-flex items-center gap-2 text-sm font-medium text-[#8A6D3B] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Voltar ao Guia Técnico ZR
            </a>
          </div>
        ) : (
          <>
            {/* 1. Compras / faixas */}
            <section className="space-y-3">
              <h2 className="zr-serif text-lg font-semibold text-[#1F1B16]">Minhas faixas</h2>
              {(acessos || []).length === 0 ? (
                <p className="text-sm text-[#6B6358]">Nenhuma faixa ativa encontrada.</p>
              ) : (
                <ul className="space-y-3">
                  {acessos.map((a) => {
                    const pag = a.referencia_pagamento_id ? pagamentoPorId[a.referencia_pagamento_id] : null;
                    const vigente =
                      a.status === "ativo" &&
                      (a.vitalicio ||
                        !a.fim_em ||
                        new Date(a.fim_em).getTime() >= Date.now());
                    return (
                      <li key={a.id} className="rounded-xl border border-[#E2DBC9] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#1F1B16]">{NOMES_FAIXA[a.faixa] || a.faixa}</p>
                            <p className="text-xs text-[#6B6358] mt-0.5">
                              {a.origem === "checkout" ? "Compra" : a.origem || "Concessão"} ·{" "}
                              {formatarData(a.inicio_em || a.created_date)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                              vigente
                                ? "bg-[#EFE8D8] text-[#6B5530]"
                                : "bg-[#F1ECE3] text-[#9A9081] line-through"
                            }`}
                          >
                            {a.vitalicio ? (
                              <>
                                <InfinityIcon className="w-3 h-3" /> Vitalícia
                              </>
                            ) : a.fim_em ? (
                              <>
                                <Clock className="w-3 h-3" /> até {formatarData(a.fim_em)}
                              </>
                            ) : (
                              "Sem prazo"
                            )}
                          </span>
                        </div>
                        {pag && (
                          <p className="text-xs text-[#6B6358] mt-2">
                            Recibo: R$ {Number(pag.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ·{" "}
                            {pag.forma_pagamento === "pix" ? "PIX" : "Cartão"} · {formatarData(pag.created_date)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 3. Desistência */}
            <section className="space-y-3">
              <h2 className="zr-serif text-lg font-semibold text-[#1F1B16]">Desistência</h2>
              <div className="rounded-xl border border-[#E2DBC9] bg-[#FBF8F1] p-4 space-y-3">
                <p className="flex items-start gap-2 text-sm text-[#3A342B]">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#8A6D3B]" />
                  Sete dias para desistir, contados da compra, com devolução integral do valor pago e sem precisar justificar.
                </p>
                {pagamentosZR
                  .filter((p) => p.status === "approved")
                  .map((p) => {
                    const pedido = pedidoPorPagamento[p.id];
                    const dias = diasRestantes(p.created_date);
                    const elegivel = dias > 0;
                    if (!pedido && !elegivel) return null;
                    return (
                      <div key={p.id} className="rounded-lg border border-[#E2DBC9] bg-white p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#1F1B16]">
                              {p.plano.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-[#6B6358]">
                              R$ {Number(p.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · comprado em {formatarDataHora(p.created_date)}
                            </p>
                          </div>
                          {pedido ? (
                            <span className="text-xs text-[#8A6D3B] font-medium">
                              Pedido em {formatarDataHora(pedido.solicitado_em)} · {pedido.status.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-xs text-[#6B6358]">
                              {dias} {dias === 1 ? "dia restante" : "dias restantes"}
                            </span>
                          )}
                        </div>
                        {!pedido && elegivel && (
                          <button
                            onClick={() => solicitarDesistencia(p.id)}
                            disabled={enviandoId === p.id}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1F1B16] text-[#F4F1EA] text-sm font-medium px-4 py-2 hover:bg-[#2A2420] disabled:opacity-60"
                          >
                            {enviandoId === p.id && <Loader2 className="w-4 h-4 animate-spin" />}
                            Pedir desistência
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>

            {/* 4. Voltar */}
            <div>
              <a href="https://zr.nutrimenu.com.br" className="inline-flex items-center gap-2 text-sm font-medium text-[#8A6D3B] hover:underline">
                <ArrowLeft className="w-4 h-4" /> Voltar ao Guia Técnico ZR
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}