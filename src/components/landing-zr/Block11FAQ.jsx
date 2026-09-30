import React from "react";
import { ZRSection, ZROlho, ZRTitulo } from "./shared";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const FAQ = [
  { q: "O Guia substitui as normas oficiais?", a: "Não. As normas publicadas pelos órgãos competentes continuam sendo as fontes oficiais. O Guia organiza, relaciona e explica critérios para facilitar a consulta e a aplicação profissional." },
  { q: "O Guia faz o cálculo da tabela nutricional?", a: "Não. O Guia é uma obra técnica de consulta: explica os critérios de cálculo, declaração, validação e organização do rótulo. Para cálculo e gestão de receitas, o Nutrimenu oferece uma plataforma específica." },
  { q: "Preciso ler tudo em sequência?", a: "Não. Você pode seguir a orientação inicial ou consultar direto um capítulo, módulo ou anexo." },
  { q: "O conteúdo pode ser impresso?", a: "Os capítulos têm a função Imprimir em PDF. A impressão contém identificação do titular, data, hora, marca d'água e aviso de uso individual." },
  { q: "O acesso é vitalício?", a: "Os planos atuais concedem acesso por 12 meses. Durante esse período, o cliente mantém o acesso à faixa contratada e às atualizações correspondentes. As condições de renovação são apresentadas na Plataforma ZR." },
  { q: "O Guia pode ser compartilhado?", a: "Não. O acesso e as cópias impressas são individuais e vinculados ao titular da conta. A redistribuição do conteúdo não é permitida." },
  { q: "Para quem o Guia foi desenvolvido?", a: "Para nutricionistas, responsáveis técnicos, consultores, tecnólogos, engenheiros de alimentos, estudantes em formação e equipes que atuam com alimentos embalados e rotulagem." },
];

export default function Block11FAQ() {
  return (
    <ZRSection id="faq">
      <ZROlho>Dúvidas frequentes</ZROlho>
      <ZRTitulo>Antes de decidir</ZRTitulo>
      <Accordion type="single" collapsible>
        {FAQ.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`} className="border-[#1B3150]">
            <AccordionTrigger className="zr-archivo text-[#E9EFF7] text-left">{item.q}</AccordionTrigger>
            <AccordionContent className="zr-carlito text-[#93A6BF]">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ZRSection>
  );
}