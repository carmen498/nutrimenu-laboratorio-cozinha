import React, { useEffect, useState } from "react";
import { Loader2, Printer, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatarDataBrasilia, formatarDataHoraBrasilia } from "@/lib/fusoBrasilia";

const moeda = (valor) => Number(valor || 0).toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});

function Linha({ rotulo, valor }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 py-2 border-b border-[#E2DBC9]">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#6B6358]">{rotulo}</dt>
      <dd className="text-sm text-[#1F1B16]">{valor}</dd>
    </div>
  );
}

export default function ComprovantePagamentoDialog({ pagamento, onClose }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    base44.functions.invoke("obterComprovantePagamentoZR", { pagamento_id: pagamento.id })
      .then((resposta) => { if (ativo) setDados(resposta?.data || resposta); })
      .catch((e) => {
        if (ativo) setErro(e?.response?.data?.error || e?.message || "Não foi possível abrir o comprovante.");
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [pagamento.id]);

  const situacao = dados?.situacao === "approved"
    ? "PAGO"
    : dados?.situacao === "estornado"
      ? `ESTORNADO em ${formatarDataBrasilia(dados.estornado_em) || "data não informada"} — valor devolvido ${moeda(dados.valor_estornado)}`
      : dados?.situacao === "estornado_parcial"
        ? `ESTORNO PARCIAL — valor devolvido ${moeda(dados.valor_estornado)}`
        : String(dados?.situacao || "").toUpperCase();

  const periodo = dados?.acesso?.vitalicio
    ? "Acesso vitalício"
    : dados?.acesso?.inicio_em && dados?.acesso?.fim_em
      ? `Acesso de ${formatarDataBrasilia(dados.acesso.inicio_em)} a ${formatarDataBrasilia(dados.acesso.fim_em)}`
      : "Período de acesso não localizado";

  const forma = dados?.forma_pagamento === "pix"
    ? "PIX"
    : `Cartão${dados?.parcelas > 1 ? ` · ${dados.parcelas} parcelas` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .zr-comprovante, .zr-comprovante * { visibility: visible !important; }
          .zr-comprovante { position: absolute; inset: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
          .zr-nao-imprimir { display: none !important; }
        }
      `}</style>
      <article className="zr-comprovante w-full max-w-2xl rounded-xl border border-[#E2DBC9] bg-white shadow-xl">
        <div className="zr-nao-imprimir flex justify-end p-3">
          <button onClick={onClose} aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        {carregando ? (
          <div className="flex justify-center p-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : erro ? (
          <div className="px-7 pb-8 space-y-3">
            <h2 className="text-lg font-semibold">Comprovante de pagamento</h2>
            <p className="text-sm text-[#4A4338]">{erro}</p>
          </div>
        ) : (
          <div className="px-7 pb-8">
            <header className="border-b-2 border-[#1F1B16] pb-5 text-center">
              <p className="text-sm font-semibold tracking-wide">GUIA TÉCNICO ZR · Do Zero à Rotulagem</p>
              <h2 className="mt-2 text-2xl font-bold">COMPROVANTE DE PAGAMENTO</h2>
            </header>
            <section className="space-y-5 py-6">
              <div><h3 className="text-xs font-bold tracking-widest text-[#8A6D3B]">EMITENTE</h3>
                <p className="mt-1 text-sm"><strong>{dados.emitente.razaoSocial}</strong><br />CNPJ {dados.emitente.cnpj}<br />{dados.emitente.enderecoCompleto}</p>
              </div>
              <div><h3 className="text-xs font-bold tracking-widest text-[#8A6D3B]">PAGADOR</h3>
                <p className="mt-1 text-sm"><strong>{dados.pagador.nome}</strong><br />CPF/CNPJ {dados.pagador.cpf_cnpj}</p>
              </div>
              <div><h3 className="text-xs font-bold tracking-widest text-[#8A6D3B]">REFERENTE A</h3>
                <p className="mt-1 text-sm"><strong>{dados.plano}</strong><br />{periodo}</p>
              </div>
              <div className="rounded-lg bg-[#F4F1EA] p-5">
                <p className="text-xs font-bold tracking-widest text-[#6B6358]">VALOR PAGO</p>
                <p className="mt-1 text-3xl font-bold">{moeda(dados.valor_pago)}</p>
              </div>
              <dl>
                <Linha rotulo="Forma de pagamento" valor={forma} />
                <Linha rotulo="Data do pagamento" valor={dados.pago_em ? `${formatarDataHoraBrasilia(dados.pago_em)} (horário de Brasília)` : "Data do pagamento não localizada"} />
                <Linha rotulo="Situação" valor={situacao} />
                <Linha rotulo="N.º da transação" valor={dados.transacao || "Número da transação não localizado"} />
              </dl>
              <p className="text-sm">Confira este pagamento pelo número da transação no Mercado Pago.</p>
              <p className="text-sm font-medium">Este comprovante NÃO substitui nota fiscal. Para uso contábil, solicite a nota fiscal em Minha Conta → Pedir nota fiscal.</p>
            </section>
            <div className="zr-nao-imprimir flex flex-wrap gap-3 border-t border-[#E2DBC9] pt-5">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-md bg-[#1F1B16] px-4 py-2 text-sm font-semibold text-white"><Printer className="h-4 w-4" /> Imprimir / Salvar em PDF</button>
              <button onClick={onClose} className="rounded-md border border-[#E2DBC9] px-4 py-2 text-sm font-medium">Fechar</button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
