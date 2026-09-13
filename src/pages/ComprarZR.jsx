// Página de passagem: checkout de uma faixa do Guia Técnico ZR.
// Fora do layout do Laboratório de Cozinha (sem sidebar, sem topbar verde).
// Chega via /comprar-zr?faixa=full|tin|arquitetura-rotulo, paga, e redireciona
// para o Guia. Se já tem a faixa ativa, mostra "Você já tem este plano".
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllFilteredPages } from "@/lib/fetchAllPages";
import { avaliarDadosFiscais } from "@/lib/dadosFiscais";
import CartaoForm from "@/components/planos/CartaoForm";
import PixForm from "@/components/planos/PixForm";
import AvisoDesistencia from "@/components/planos/AvisoDesistencia";
import DadosNotaFiscalCheckout from "@/components/planos/DadosNotaFiscalCheckout";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

const URL_GUIA = "https://zr.nutrimenu.com.br";
const URL_GUIA_ENTRAR = "https://zr.nutrimenu.com.br/entrar";
const URL_GUIA_PLANOS = "https://zr.nutrimenu.com.br/planos";

const NOMES_FAIXA = {
  tin: "Tabela de Informação Nutricional",
  full: "ZR Profissional",
  "arquitetura-do-rotulo": "Arquitetura do Rótulo",
};

const normalizarFaixa = (raw) => {
  if (!raw) return null;
  const r = raw.toLowerCase().trim();
  if (r === "arquitetura-rotulo" || r === "arquitetura-do-rotulo") return "arquitetura-do-rotulo";
  if (r === "tin" || r === "full") return r;
  return null;
};

export default function ComprarZR() {
  const [resultadoPendente, setResultadoPendente] = useState(null);
  const [aceiteContratacao, setAceiteContratacao] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState("cartao");
  const { user } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const faixaNormalizada = normalizarFaixa(urlParams.get("faixa"));

  const { data: ofertasData, isLoading: ofertasLoading } = useQuery({
    queryKey: ["ofertas-zr-publico"],
    queryFn: () => base44.functions.invoke("ofertasGuiaZR", {}),
  });

  const oferta = (ofertasData?.data?.ofertas || []).find(
    (o) => o.faixa === faixaNormalizada && !o.renovacao
  );

  const { data: acessos = [], isLoading: acessosLoading } = useQuery({
    queryKey: ["acessos-zr", user?.id],
    queryFn: () => fetchAllFilteredPages(base44.entities.AcessoGuiaTecnicoZR, { user_id: user.id }, "-inicio_em"),
    enabled: !!user?.id,
  });

  const temFaixaAtiva = (acessos || []).some(
    (a) =>
      a.faixa === faixaNormalizada &&
      a.status === "ativo" &&
      (a.vitalicio || !a.fim_em || new Date(a.fim_em).getTime() >= Date.now())
  );

  const dadosFiscaisOk = avaliarDadosFiscais(user || {}).completo;

  const handleSuccess = (resultado) => {
    if (!resultado || resultado.status === "approved") {
      window.location.href = URL_GUIA_ENTRAR;
      return;
    }
    setResultadoPendente(resultado);
  };

  const handleClose = () => {
    window.location.href = URL_GUIA;
  };

  const carregando = ofertasLoading || !user || acessosLoading;

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8A6D3B]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#1F1B16]" style={{ fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" }}>
      <header className="border-b border-[#E2DBC9] bg-[#1F1B16] text-[#F4F1EA]">
        <div className="max-w-xl mx-auto px-5 py-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#B8A07A]">Guia Técnico ZR</p>
          <h1 className="text-2xl md:text-3xl font-semibold mt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
            {oferta ? `Comprar — ${NOMES_FAIXA[faixaNormalizada] || oferta.nome}` : "Comprar faixa"}
          </h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-5 py-8">
        {!faixaNormalizada || !oferta ? (
          <div className="space-y-4">
            <p className="text-base text-[#4A4338]">
              A faixa informada na URL não existe ou não está disponível para compra.
            </p>
            <a href={URL_GUIA_PLANOS} className="inline-flex items-center gap-2 text-sm font-medium text-[#8A6D3B] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Ver planos disponíveis
            </a>
          </div>
        ) : temFaixaAtiva ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-[#E2DBC9] bg-white p-5">
              <CheckCircle2 className="w-5 h-5 text-[#8A6D3B] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#1F1B16]">Você já tem este plano</p>
                <p className="text-sm text-[#6B6358] mt-1">
                  Sua faixa {NOMES_FAIXA[faixaNormalizada] || faixaNormalizada} está ativa.
                </p>
              </div>
            </div>
            <a href={URL_GUIA} className="inline-flex items-center gap-2 text-sm font-medium text-[#8A6D3B] hover:underline">
              <ArrowLeft className="w-4 h-4" /> Acessar o Guia Técnico ZR
            </a>
          </div>
        ) : resultadoPendente ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#8A6D3B]" />
            <p className="font-medium text-[#1F1B16]">Pagamento em processamento</p>
            <p className="text-sm text-[#6B6358]">Você será redirecionado automaticamente assim que for confirmado.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Resumo da oferta */}
            <div className="rounded-xl border border-[#E2DBC9] bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#B8A07A]">Faixa</p>
              <p className="text-lg font-semibold mt-1" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                {oferta.nome}
              </p>
              {oferta.subtitulo && <p className="text-sm text-[#6B6358] mt-0.5">{oferta.subtitulo}</p>}
              <p className="text-3xl font-bold mt-3">
                R$ {Number(oferta.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {oferta.preco_detalhe && <p className="text-xs text-[#6B6358] mt-1">{oferta.preco_detalhe}</p>}
              {oferta.beneficios?.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {oferta.beneficios.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[#3A342B]">
                      <CheckCircle2 className="w-4 h-4 text-[#8A6D3B] shrink-0 mt-0.5" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <AvisoDesistencia />

            {!dadosFiscaisOk && <DadosNotaFiscalCheckout />}

            <label className="flex items-start gap-2 rounded-lg border border-[#E2DBC9] bg-[#FBF8F1] p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={aceiteContratacao}
                onChange={(e) => setAceiteContratacao(e.target.checked)}
              />
              <span className="leading-snug text-[#3A342B]">
                Li e aceito os <a href="/termos" target="_blank" rel="noreferrer" className="underline text-[#1F1B16]">Termos de Uso</a> e a <a href="/privacidade" target="_blank" rel="noreferrer" className="underline text-[#1F1B16]">Política de Privacidade</a>.
              </span>
            </label>

            {/* Seletor de método de pagamento */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPagamento("cartao")}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  metodoPagamento === "cartao"
                    ? "border-[#1F1B16] bg-[#1F1B16] text-[#F4F1EA]"
                    : "border-[#E2DBC9] bg-white text-[#3A342B] hover:border-[#8A6D3B]"
                }`}
              >
                Cartão
              </button>
              <button
                type="button"
                onClick={() => setMetodoPagamento("pix")}
                className={`rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                  metodoPagamento === "pix"
                    ? "border-[#1F1B16] bg-[#1F1B16] text-[#F4F1EA]"
                    : "border-[#E2DBC9] bg-white text-[#3A342B] hover:border-[#8A6D3B]"
                }`}
              >
                PIX
              </button>
            </div>

            {metodoPagamento === "cartao" ? (
              <CartaoForm
                plano={oferta.plano_id}
                email={user?.email}
                onClose={handleClose}
                onSuccess={handleSuccess}
                aceiteTermos={aceiteContratacao}
                podePagar={dadosFiscaisOk}
              />
            ) : (
              <PixForm
                plano={oferta.plano_id}
                email={user?.email}
                onClose={handleClose}
                onSuccess={handleSuccess}
                aceiteTermos={aceiteContratacao}
                podePagar={dadosFiscaisOk}
              />
            )}

            <div className="pt-2">
              <a href={URL_GUIA_PLANOS} className="inline-flex items-center gap-2 text-xs text-[#8A6D3B] hover:underline">
                <ArrowLeft className="w-3.5 h-3.5" /> Voltar aos planos
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}