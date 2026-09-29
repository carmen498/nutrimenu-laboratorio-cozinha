import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZR_IMAGES } from "./shared";

export default function Block9QuemAssina() {
  return (
    <ZRSection id="quem-assina">
      <ZROlho>Quem assina</ZROlho>
      <ZRTitulo>Desenvolvido por quem conhece a rotulagem na prática</ZRTitulo>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <img src={ZR_IMAGES.img16} alt="Carmen S. Reinstein" className="w-[230px] rounded" />
        <div>
          <p className="zr-archivo text-[#E9EFF7] text-lg mb-3">Carmen S. Reinstein</p>
          <p className="zr-carlito text-[#93A6BF] text-sm max-w-[59ch] mb-4">Nutricionista, empresária, professora, consultora de alimentos e criadora do Nutrimenu.</p>
          <p className="zr-carlito text-[#E9EFF7] max-w-[59ch] text-[18px] leading-[1.65] mb-4">
            Mais de três décadas entre nutrição, tecnologia, desenvolvimento de sistemas, produção de alimentos e rotulagem nutricional. Criou o dietWin em 1994, pioneiro em software de nutrição no Brasil, e desenvolveu o Nutrimenu como sistema de cálculo e rotulagem para a indústria alimentícia.
          </p>
          <p className="zr-carlito text-[#E9EFF7] max-w-[59ch] text-[18px] leading-[1.65] mb-4">
            O ZR nasce dessa trajetória: não de teoria, mas de décadas lidando com cálculos, inconsistências, retrabalho e responsabilidade técnica real.
          </p>
          <p className="zr-carlito text-[#E9EFF7] text-[18px] leading-[1.65] max-w-[59ch]">
            O conhecimento que normalmente se aprende em 30 anos — organizado em método estudável.
          </p>
        </div>
      </div>
    </ZRSection>
  );
}