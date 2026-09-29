import React from "react";
import { ZRSection, ZROlho, ZRTitulo, ZRTexto } from "./shared";

export default function Block7NaoCurso() {
  return (
    <ZRSection id="nao-curso">
      <ZROlho>O que você tem em mãos</ZROlho>
      <ZRTitulo>Não é um curso linear. É consulta permanente.</ZRTitulo>
      <ZRTexto className="mb-6" full>
        Curso tem começo, meio e fim. O Guia Técnico ZR foi construído para ficar ao lado do Rotulador durante o trabalho: estudar um tema, esclarecer uma dúvida, revisar um cálculo, conferir uma regra, localizar um anexo, validar uma etapa do rótulo, fundamentar uma orientação técnica.
      </ZRTexto>
      <ZRTexto>
        Cada capítulo funciona sozinho e continua ligado aos temas relacionados — como as catorze remissões do Capítulo 44 mostram.
      </ZRTexto>
    </ZRSection>
  );
}