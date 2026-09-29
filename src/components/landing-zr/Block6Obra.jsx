import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZR_IMAGES } from "./shared";

const NUMEROS = [
  { num: "+1.500", label: "páginas" },
  { num: "10", label: "módulos" },
  { num: "99 + 18", label: "capítulos e anexos" },
  { num: "145", label: "normas da Anvisa, do Mapa e complementares" },
];

const MODULOS = [
  { num: 1, caps: 12, titulo: "Nutrientes e componentes da informação nutricional", cor: "#2E9055" },
  { num: 2, caps: 9, titulo: "Rotulagem geral obrigatória", cor: "#2E9055" },
  { num: 3, caps: 10, titulo: "Rotulagem frontal e comunicação nutricional", cor: "#D35400" },
  { num: 4, caps: 16, titulo: "Cálculo e construção da TIN", cor: "#1B6B3A" },
  { num: 5, caps: 13, titulo: "Categorias especiais de alimentos", cor: "#0E7C86" },
  { num: 6, caps: 7, titulo: "Formas de apresentação e comercialização", cor: "#6C3483" },
  { num: 7, caps: 13, titulo: "Arquitetura do rótulo e interface com o design", cor: "#B7950B" },
  { num: 8, caps: 6, titulo: "Enquadramento e caminho regulatório", cor: "#7D6608" },
  { num: 9, caps: 8, titulo: "Responsabilidade, governança e fiscalização", cor: "#C0392B" },
  { num: 10, caps: 5, titulo: "Biblioteca e consulta regulatória", cor: "#2E5FA3" },
];

export default function Block6Obra() {
  return (
    <ZRSection id="obra">
      <ZROlho>A obra</ZROlho>
      <ZRTitulo>125 itens editoriais para consultar durante o trabalho</ZRTitulo>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {NUMEROS.map((n, i) => (
          <div key={i} className="bg-[#0E1E33] border border-[#1B3150] rounded p-[22px] flex flex-col items-start">
            <p className="zr-archivo text-3xl md:text-4xl text-[#7DBE3C]">{n.num}</p>
            <p className="zr-mono uppercase text-[#93A6BF] text-xs tracking-[0.14em] mt-1">{n.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
        <img src={ZR_IMAGES.img2} alt="Pilha de livros do Guia Técnico ZR" className="w-full rounded" />
        <ZRTexto>
          Dez módulos, noventa e nove capítulos, dezoito anexos. Cada capítulo funciona sozinho e continua ligado aos temas que o cercam — o Capítulo 44 remete a catorze outros.
        </ZRTexto>
      </div>

      <h3 className="zr-archivo text-[#E9EFF7] text-xl mb-6">Os dez módulos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {MODULOS.map((m) => (
          <div key={m.num} className="flex border border-[#1B3150] rounded-lg overflow-hidden">
            <div style={{ backgroundColor: m.cor }} className="w-1.5 shrink-0" />
            <div className="p-4">
              <p className="zr-mono uppercase text-[#93A6BF] text-xs tracking-[0.14em] mb-1">Módulo {m.num} · {m.caps} capítulos</p>
              <p className="zr-carlito text-[#E9EFF7]">{m.titulo}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="zr-carlito text-[#93A6BF] max-w-[65ch] leading-relaxed mt-8 text-sm">
        O conteúdo é versionado. Quando uma norma é publicada, alterada, retificada ou revogada, o impacto é analisado e a atualização aplicável é incorporada ao Guia durante a vigência do acesso.
      </p>
    </ZRSection>
  );
}