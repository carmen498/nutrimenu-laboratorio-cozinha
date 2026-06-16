import React from "react";

const CORES = {
  verde: "bg-primary text-primary-foreground",
  "verde-claro": "bg-green-100 text-green-800 border border-green-200",
  vermelho: "bg-red-100 text-red-800 border border-red-200",
  cinza: "bg-gray-100 text-gray-700 border border-gray-200",
};

export default function TagBadge({ nome, cor, onClick, className = "" }) {
  const estilo = CORES[cor] || CORES.verde;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${estilo} ${onClick ? "cursor-pointer hover:opacity-80" : ""} ${className}`}
      onClick={onClick}
      title={onClick ? "Clique para remover" : nome}
    >
      {nome}
    </span>
  );
}