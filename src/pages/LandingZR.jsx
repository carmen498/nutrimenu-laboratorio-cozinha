import React from "react";
import ZRHeader from "@/components/landing-zr/ZRHeader";
import Block1Abertura from "@/components/landing-zr/Block1Abertura";
import Block2TrabalhoReal from "@/components/landing-zr/Block2TrabalhoReal";
import Block3Capitulo from "@/components/landing-zr/Block3Capitulo";
import Block4Publico from "@/components/landing-zr/Block4Publico";
import Block5ConteudoLiberado from "@/components/landing-zr/Block5ConteudoLiberado";
import Block6Obra from "@/components/landing-zr/Block6Obra";
import Block7NaoCurso from "@/components/landing-zr/Block7NaoCurso";
import Block8Faixas from "@/components/landing-zr/Block8Faixas";
import Block9QuemAssina from "@/components/landing-zr/Block9QuemAssina";
import Block10Arrependimento from "@/components/landing-zr/Block10Arrependimento";
import Block11FAQ from "@/components/landing-zr/Block11FAQ";
import Block12Fechamento from "@/components/landing-zr/Block12Fechamento";

export default function LandingZR() {
  return (
    <div className="min-h-screen bg-[#0A1524] text-[#E9EFF7]">
      <style>{`
        .zr-archivo { font-family: 'Archivo', sans-serif; font-weight: 700; }
        .zr-carlito { font-family: 'Carlito', sans-serif; }
        .zr-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>
      <ZRHeader />
      <main>
        <Block1Abertura />
        <Block2TrabalhoReal />
        <Block3Capitulo />
        <Block4Publico />
        <Block5ConteudoLiberado />
        <Block6Obra />
        <Block7NaoCurso />
        <Block8Faixas />
        <Block9QuemAssina />
        <Block10Arrependimento />
        <Block11FAQ />
        <Block12Fechamento />
      </main>
    </div>
  );
}