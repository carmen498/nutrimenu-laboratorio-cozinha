import React from "react";
import { ZRSection, ZROlho, ZRTitulo } from "./shared";

const PUBLICO = [
  { titulo: "Nutricionistas e responsáveis técnicos", desc: "Quem assina o rótulo e precisa sustentar cada decisão." },
  { titulo: "Consultores de alimentos", desc: "Quem atende vários clientes e precisa do critério à mão, não da lembrança." },
  { titulo: "Indústria de alimentos", desc: "Equipes que precisam padronizar a rotulagem e eliminar retrabalho a cada lançamento." },
  { titulo: "Estudantes em formação", desc: "Quem está aprendendo e quer ver a norma aplicada ao produto real." },
];

export default function Block4Publico() {
  return (
    <ZRSection id="publico">
      <ZROlho>A quem se destina</ZROlho>
      <ZRTitulo>Para quem responde tecnicamente pelo rótulo</ZRTitulo>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PUBLICO.map((p, i) => (
          <div key={i} className="border border-[#1B3150] rounded-lg p-5">
            <p className="zr-archivo text-[#E9EFF7] text-sm mb-2">{p.titulo}</p>
            <p className="zr-carlito text-[#93A6BF] text-sm">{p.desc}</p>
          </div>
        ))}
      </div>
    </ZRSection>
  );
}