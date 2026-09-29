import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZR_IMAGES } from "./shared";

export default function Block2TrabalhoReal() {
  return (
    <ZRSection id="trabalho-real">
      <ZROlho>O trabalho real</ZROlho>
      <ZRTitulo>Rotulagem não é cumprir tabela. É sustentar decisão técnica.</ZRTitulo>
      <ZRTexto className="mb-4" full>Antes de preencher qualquer campo, é preciso decidir:</ZRTexto>
      <ul className="zr-carlito text-[#E9EFF7] max-w-[65ch] text-[18px] leading-[1.65] space-y-1 mb-6 list-disc pl-5">
        <li>quais informações são obrigatórias para aquele produto;</li>
        <li>como calcular e declarar cada nutriente;</li>
        <li>quais regras se aplicam à categoria;</li>
        <li>como identificar as exceções;</li>
        <li>quando usar advertências e declarações complementares;</li>
        <li>onde posicionar cada informação na embalagem;</li>
        <li>como manter coerência entre formulação, Tabela de Informação Nutricional, lista de ingredientes, alegações e rotulagem frontal.</li>
      </ul>
      <ZRTexto className="mb-6" full>
        A legislação está distribuída entre resoluções, instruções normativas, anexos e normas complementares. Consultar um documento isolado raramente revela como os critérios se relacionam no produto real.
      </ZRTexto>
      <p className="zr-carlito text-[#E9EFF7] text-[18px] leading-[1.65]">
        O problema não é encontrar a norma. É transformar a norma em decisão técnica coerente, verificável e aplicável ao rótulo.
      </p>
      <img src={ZR_IMAGES.img1} alt="Mesa de trabalho técnica com documentos e calculadora" className="max-w-[65ch] w-full rounded mt-10" />
    </ZRSection>
  );
}