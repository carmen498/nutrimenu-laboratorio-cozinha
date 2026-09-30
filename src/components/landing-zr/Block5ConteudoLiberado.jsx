import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZRBotaoCheio, PLATAFORMA_ZR } from "./shared";

export default function Block5ConteudoLiberado() {
  return (
    <ZRSection id="conteudo-gratuito">
      <ZROlho>Antes de escolher um plano</ZROlho>
      <ZRTitulo>Entre e leia três capítulos</ZRTitulo>
      <ZRTexto className="mb-6" full>
        Você pode entrar no ambiente real do Guia, ver como ele está organizado e ler três conteúdos liberados. Sem cartão, sem compromisso, acesso imediato.
      </ZRTexto>
      <ul className="zr-carlito text-[#E9EFF7] text-[18px] leading-[1.65] space-y-2 mb-8 list-disc pl-5">
        <li>A tabela que ninguém ensinou a ler — a lógica da TIN e as relações que precisam ser compreendidas antes de interpretar seus números.</li>
        <li>Valor energético — fundamentos, fatores de conversão, declaração, arredondamento, %VD e coerência regulatória.</li>
        <li>Açúcares totais — definição, identificação nas fontes de composição, relação com açúcares adicionados e cuidados na declaração.</li>
      </ul>
      <ZRBotaoCheio href={PLATAFORMA_ZR}>Acessar os conteúdos gratuitos</ZRBotaoCheio>
    </ZRSection>
  );
}