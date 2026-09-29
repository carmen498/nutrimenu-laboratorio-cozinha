import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZRBotaoCheio, ZRBotaoVazado, ZR_IMAGES } from "./shared";

export default function Block1Abertura() {
  return (
    <ZRSection id="abertura">
      <ZROlho>Obra digital de consulta profissional</ZROlho>
      <ZRTitulo>Estrutura técnica para cada decisão de rotulagem</ZRTitulo>
      <ZRTexto className="mb-8">
        Da legislação ao rótulo: critérios organizados, aplicação prática e fundamentação normativa, para reduzir improviso, inconsistência e retrabalho.
      </ZRTexto>
      <div className="flex flex-wrap gap-3 mb-10">
        <ZRBotaoCheio href="#faixas">Conhecer o Guia Técnico ZR</ZRBotaoCheio>
        <ZRBotaoVazado href="#conteudo-gratuito">Ler três capítulos, sem cartão</ZRBotaoVazado>
      </div>
      <div>
        <img
          src={ZR_IMAGES.img5}
          alt="Mesa de trabalho do rotulador"
          className="w-full rounded border border-[#1B3150]"
        />
        <p className="zr-carlito text-[#93A6BF] leading-relaxed mt-4 text-sm">
          A assinatura do Rotulador não libera o rótulo. Ela registra o que foi decidido e o que ficou pendente. Assinatura e identificação valem em parecer, memória de cálculo, laudo e termo de responsabilidade técnica — a responsabilidade decorre da lei, do papel, do vínculo e da conduta, não apenas de uma assinatura gráfica. <span className="zr-mono text-[#7DBE3C]">Cap. 88, §13</span>
        </p>
      </div>
    </ZRSection>
  );
}