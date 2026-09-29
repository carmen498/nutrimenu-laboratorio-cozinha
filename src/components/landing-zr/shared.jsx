import React from "react";

export const ZR_IMAGES = {
  img1: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/8466cfbc6_1.png",
  img2: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/01e7cce7c_2.png",
  img3: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/b9ed1b773_3Mockup_TIN_Barra_de_Cereal.png",
  img5: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/6632278f3_5.png",
  img16: "https://media.base44.com/images/public/6a2b263c4c1cb1e47d54d8b7/81c9700ed_16.png",
};

export const PLATAFORMA_ZR = "https://zr.nutrimenu.com.br";

export function ZRSection({ id, children, className = "" }) {
  return (
    <section id={id} className={`border-t border-[#1B3150] scroll-mt-16 ${className}`}>
      <div className="max-w-[1180px] mx-auto px-5 py-16 md:py-20">
        {children}
      </div>
    </section>
  );
}

export function ZROlho({ children }) {
  return <p className="zr-mono uppercase text-[#7DBE3C] tracking-[0.14em] text-xs mb-4">{children}</p>;
}

export function ZRTitulo({ children }) {
  return <h2 className="zr-archivo text-3xl md:text-4xl text-[#E9EFF7] mb-6 leading-tight">{children}</h2>;
}

export function ZRTexto({ children, className = "", full = false }) {
  return <p className={`zr-carlito text-[#E9EFF7] ${full ? "" : "max-w-[65ch]"} text-[18px] leading-[1.65] ${className}`}>{children}</p>;
}

export function ZRBotaoCheio({ href, children, className = "" }) {
  return (
    <a href={href} className={`zr-carlito inline-flex items-center justify-center gap-2 rounded-md bg-[#7DBE3C] px-6 py-3 text-sm font-semibold text-[#0A1524] hover:bg-[#8FD14F] transition-colors ${className}`}>
      {children}
    </a>
  );
}

export function ZRBotaoVazado({ href, children, className = "" }) {
  return (
    <a href={href} className={`zr-carlito inline-flex items-center justify-center gap-2 rounded-md border border-[#7DBE3C] px-6 py-3 text-sm font-semibold text-[#7DBE3C] hover:bg-[#7DBE3C]/10 transition-colors ${className}`}>
      {children}
    </a>
  );
}