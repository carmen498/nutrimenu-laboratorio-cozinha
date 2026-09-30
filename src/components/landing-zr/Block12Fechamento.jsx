import React from "react";
import { ZROlho, ZRTitulo, ZRTexto, ZRBotaoCheio, ZRBotaoVazado } from "./shared";

export default function Block12Fechamento() {
  return (
    <section id="fechamento" className="border-t border-[#1B3150] bg-[#070F1A] scroll-mt-16">
      <div className="max-w-[1180px] mx-auto px-5 py-16 md:py-20">
        <ZROlho>Da norma ao rótulo</ZROlho>
        <ZRTitulo>Não se trata de substituir a análise profissional</ZRTitulo>
        <ZRTexto className="mb-8" full>
          Trata-se de oferecer uma estrutura para que cada decisão seja mais clara, coerente e fundamentada.
        </ZRTexto>
        <div className="flex flex-wrap gap-3 mb-12">
          <ZRBotaoCheio href="#faixas">Conhecer os planos</ZRBotaoCheio>
          <ZRBotaoVazado href="#conteudo-gratuito">Acessar os conteúdos gratuitos</ZRBotaoVazado>
        </div>
        <div className="zr-carlito text-[#93A6BF] text-xs">
          <p>Material de apoio técnico e educacional. Não substitui as normas oficiais nem a responsabilidade individual do profissional habilitado.</p>
          <p>© 2026 NUTRIMENU LTDA. Todos os direitos reservados.</p>
        </div>
      </div>
    </section>
  );
}