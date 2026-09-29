import React from "react";

export default function ZRHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1B3150] bg-[#0A1524]/95 backdrop-blur-sm">
      <div className="max-w-[1180px] mx-auto px-5 py-3 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-[#7DBE3C] text-[#0A1524] zr-archivo text-lg">
          ZR
        </div>
        <div>
          <p className="zr-archivo text-[#E9EFF7] font-bold text-sm">Guia Técnico ZR</p>
          <p className="zr-mono uppercase text-[#93A6BF] text-[10px] tracking-[0.14em]">Do Zero à Rotulagem · Nutrimenu</p>
        </div>
      </div>
    </header>
  );
}