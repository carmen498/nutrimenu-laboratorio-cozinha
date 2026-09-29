import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZRBotaoCheio, ZRBotaoVazado, PLATAFORMA_ZR } from "./shared";

const FAIXAS = [
  {
    nome: "ZR TIN",
    sub: "A base da Tabela de Informação Nutricional",
    desc: "Para quem precisa dominar o cálculo e a construção da TIN.",
    detalhes: "módulos 1 a 4 / capítulos 1 a 47 / 11 anexos relacionados / acesso por 12 meses / atualizações durante a vigência",
    destaque: true,
    botao: "Consultar condições do ZR TIN",
  },
  {
    nome: "ZR Profissional",
    sub: "A obra completa",
    desc: "Acesso a todos os módulos, anexos e à biblioteca regulatória.",
    detalhes: "99 capítulos / 10 módulos / 18 anexos / biblioteca regulatória / acesso por 12 meses",
    destaque: false,
    botao: "Consultar condições do ZR Profissional",
  },
  {
    nome: "ZR Arquitetura",
    sub: "A informação na embalagem",
    desc: "Para estruturar tecnicamente o rótulo e orientar o desenvolvimento do layout.",
    detalhes: "Módulo 7 — Arquitetura do Rótulo / capítulos 68 a 80 / 7 anexos relacionados / acesso por 12 meses / atualizações durante a vigência",
    destaque: false,
    botao: "Consultar condições do ZR Arquitetura",
  },
];

export default function Block8Faixas() {
  return (
    <ZRSection id="faixas">
      <ZROlho>Faixas de acesso</ZROlho>
      <ZRTitulo>Escolha a faixa adequada ao seu trabalho</ZRTitulo>
      <ZRTexto className="mb-4" full>
        Planos, valores, condições de pagamento e datas promocionais são apresentados e atualizados na Plataforma ZR.
      </ZRTexto>
      <p className="zr-carlito text-[#93A6BF] text-sm mb-8">IMPORTANTE: nenhum preço, nenhum valor e nenhuma data promocional nesta página. Os três botões abaixo levam à Plataforma ZR.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FAIXAS.map((f, i) => (
          <div key={i} className={`rounded-lg p-6 ${f.destaque ? "border-2 border-[#7DBE3C]" : "border border-[#1B3150]"}`}>
            <p className="zr-archivo text-[#E9EFF7] text-lg">{f.nome}</p>
            <p className="zr-carlito text-[#7DBE3C] text-sm mb-3">{f.sub}</p>
            <p className="zr-carlito text-[#E9EFF7] text-sm mb-4">{f.desc}</p>
            <p className="zr-mono text-[#93A6BF] text-xs mb-6">{f.detalhes}</p>
            {f.destaque ? (
              <ZRBotaoCheio href={PLATAFORMA_ZR} className="w-full">{f.botao}</ZRBotaoCheio>
            ) : (
              <ZRBotaoVazado href={PLATAFORMA_ZR} className="w-full">{f.botao}</ZRBotaoVazado>
            )}
          </div>
        ))}
      </div>
      <p className="zr-carlito text-[#93A6BF] text-sm mt-6">As faixas são cumulativas: adquirir uma nova não elimina os acessos já adquiridos.</p>
    </ZRSection>
  );
}