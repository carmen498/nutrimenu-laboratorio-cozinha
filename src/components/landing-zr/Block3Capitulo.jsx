import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto, ZR_IMAGES } from "./shared";

const TABELA_INSTRUMENTOS = [
  ["RDC nº 429/2020, arts. 8º e 9º", "Define bases de declaração, porção e situações de embalagem individual."],
  ["RDC nº 429/2020, art. 12", "Disciplina cálculo, VDR, QNS, campo vazio, exceções e nota obrigatória."],
  ["IN nº 75/2020, Anexo II", "VDR utilizados para os alimentos em geral."],
  ["IN nº 75/2020, Anexo III", "Arredondamento das quantidades e do próprio %VD."],
  ["IN nº 75/2020, Anexo IV", "QNS que conduz à declaração de 0%."],
  ["IN nº 75/2020, Anexo VIII", "VDR para grupos populacionais específicos."],
  ["IN nº 75/2020, Anexos IX a XIV", "Modelos, conteúdo e formatação da TIN e da coluna de %VD."],
];

export default function Block3Capitulo() {
  return (
    <ZRSection id="capitulo">
      <ZROlho>Um capítulo, como ele é</ZROlho>
      <ZRTitulo>Cada afirmação carrega a norma que a sustenta</ZRTitulo>
      <ZRTexto className="mb-8">
        Abaixo, o começo do Capítulo 44, sem edição para esta página — inclusive no traje que ele tem por dentro da obra.
      </ZRTexto>

      <div className="bg-white text-[#1F1B16] rounded-lg p-6 md:p-10 mb-6">
        <p className="zr-mono uppercase text-[#1B6B3A] text-xs tracking-[0.14em] mb-3">ZR-CAP-044 · MÓDULO 4 · CÁLCULO E CONSTRUÇÃO DA TIN</p>
        <h3 className="zr-archivo text-2xl md:text-3xl text-[#1F1B16] mb-2">44. Percentual de Valores Diários (%VD)</h3>
        <p className="zr-carlito italic text-[#4A4338] mb-6">Da quantidade declarada na porção ao percentual correto na Tabela de Informação Nutricional</p>

        <div className="border-l-2 border-[#1B6B3A] pl-4 mb-6">
          <p className="zr-carlito text-sm text-[#3A342B]"><strong>OBJETIVO</strong> — Calcular, expressar e conferir o %VD na TIN, selecionando o valor diário de referência (VDR) correto e distinguindo valor zero, campo vazio e hipótese de não aplicação.</p>
        </div>

        <p className="zr-carlito text-[#1F1B16] max-w-[65ch] leading-relaxed mb-6">
          O percentual de valores diários informa quanto a quantidade declarada de valor energético ou de um nutriente na porção representa em relação ao VDR aplicável. Ele é uma informação derivada: não mede a qualidade global do alimento, não substitui a quantidade em gramas ou miligramas e não deve ser calculado diretamente a partir da formulação bruta.
        </p>

        <div className="border-l-2 border-[#1B6B3A] pl-4 mb-6">
          <p className="zr-carlito text-sm text-[#3A342B]"><strong>REGRA-MATRIZ</strong> — %VD = quantidade arredondada declarada na porção ÷ VDR aplicável × 100. O resultado é arredondado e expresso como número inteiro.</p>
        </div>

        <table className="w-full border-collapse mb-6">
          <thead>
            <tr className="border-b border-[#1F1B16]">
              <th className="text-left py-2 pr-4 zr-mono uppercase text-xs text-[#1F1B16]">Instrumento</th>
              <th className="text-left py-2 zr-mono uppercase text-xs text-[#1F1B16]">Aplicação ao tema</th>
            </tr>
          </thead>
          <tbody>
            {TABELA_INSTRUMENTOS.map(([inst, apl], i) => (
              <tr key={i} className="border-b border-[#E2DBC9]">
                <td className="py-2 pr-4 zr-carlito text-sm text-[#1F1B16]">{inst}</td>
                <td className="py-2 zr-carlito text-sm text-[#4A4338]">{apl}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="zr-mono text-xs text-[#6B6358]">
          Remissões deste capítulo · ZR-CAP-022 · 023 · 036 · 041 · 042 · 043 · 045 · 049 · 050 · 051 · 052 · 053 · 057 · 062
        </p>
      </div>

      <p className="zr-carlito text-[#93A6BF] text-sm mb-8">Revisão de 08/09/2026. O capítulo continua por mais treze seções — exceções, campo vazio, erros críticos e conferência final.</p>

      <img src={ZR_IMAGES.img3} alt="Prancha didática do rótulo de barra de cereal" className="w-full rounded" />

      <p className="zr-carlito text-[#93A6BF] max-w-[65ch] leading-relaxed mt-4 text-sm">
        "O mesmo critério aplicado a um produto. Açúcares adicionados de 26 g por 100 g acionam a lupa, e a denominação vai no singular, ALTO EM AÇÚCAR ADICIONADO (<span className="zr-mono text-[#7DBE3C]">Cap. 4, §14</span>). A célula de %VD dos açúcares totais fica vazia, porque não há valor diário de referência para eles — vazio não é traço e não é zero (<span className="zr-mono text-[#7DBE3C]">Cap. 44, §6 e §13</span>). E a lupa não elimina a alegação de fibras: o critério precisa ser comprovado, o termo tem que ser autorizado e a alegação fica fora da metade superior do painel, em corpo não superior ao da lupa (<span className="zr-mono text-[#7DBE3C]">Cap. 67, §9</span>)."
      </p>
    </ZRSection>
  );
}