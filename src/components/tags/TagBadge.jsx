import React from "react";

// Cores por nome da tag (sobrescreve a cor genérica do grupo)
const CORES_POR_NOME = {
  // RESTRIÇÃO ALIMENTAR
  "Sem glúten":     { bg: "#FFEBEE", texto: "#C62828" },
  "Sem lactose":    { bg: "#FFEBEE", texto: "#C62828" },
  "Sem pimentão":   { bg: "#FFEBEE", texto: "#C62828" },
  "Sem pimenta":    { bg: "#FFEBEE", texto: "#C62828" },
  "Sem alho":       { bg: "#FFEBEE", texto: "#C62828" },
  "Sem cebola":     { bg: "#FFEBEE", texto: "#C62828" },
  "Sem ovos":       { bg: "#FFEBEE", texto: "#C62828" },
  "Sem açúcar":     { bg: "#FFEBEE", texto: "#C62828" },

  // MÉTODO DE COCÇÃO
  "Air Fryer":      { bg: "#E3F2FD", texto: "#1565C0" },
  "Forno":          { bg: "#E3F2FD", texto: "#1565C0" },
  "Grelhado":       { bg: "#E3F2FD", texto: "#1565C0" },
  "Frito":          { bg: "#E3F2FD", texto: "#1565C0" },
  "Vapor":          { bg: "#E3F2FD", texto: "#1565C0" },
  "Cozido":         { bg: "#E3F2FD", texto: "#1565C0" },
  "Sem fogo / Cru": { bg: "#E3F2FD", texto: "#1565C0" },

  // PERFIL DA RECEITA
  "Vegetariana":    { bg: "#E8F5E9", texto: "#2E7D32" },
  "Vegana":         { bg: "#E8F5E9", texto: "#2E7D32" },
  "Low carb":       { bg: "#E8F5E9", texto: "#2E7D32" },
  "Proteica":       { bg: "#E8F5E9", texto: "#2E7D32" },
  "Funcional":      { bg: "#E8F5E9", texto: "#2E7D32" },
  "Integral":       { bg: "#E8F5E9", texto: "#2E7D32" },
  "Fitness":        { bg: "#E8F5E9", texto: "#2E7D32" },
  "Prato único":    { bg: "#E8F5E9", texto: "#2E7D32" },

  // CONTEXTO DE USO
  "Freezer":           { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Rende muito":       { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Rápido — até 30 min":{ bg: "#F3E5F5", texto: "#6A1B9A" },
  "Para criança":      { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Para dieta":        { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Para festa":        { bg: "#F3E5F5", texto: "#6A1B9A" },
  "Comfort food":      { bg: "#F3E5F5", texto: "#6A1B9A" },

  // POR INGREDIENTE PRINCIPAL
  "Carne moída":       { bg: "#FFF3E0", texto: "#E65100" },
  "Carne desfiada":    { bg: "#FFF3E0", texto: "#E65100" },
  "Frango desfiado":   { bg: "#FFF3E0", texto: "#E65100" },
  "Ovo":               { bg: "#FFF3E0", texto: "#E65100" },

  // POR TIPO DE MOLHO
  "Molho vermelho":    { bg: "#FCE4EC", texto: "#880E4F" },
  "Molho branco":      { bg: "#FCE4EC", texto: "#880E4F" },
  "Molho escuro":      { bg: "#FCE4EC", texto: "#880E4F" },
  "Molho agridoce":    { bg: "#FCE4EC", texto: "#880E4F" },
  "Molho de manteiga": { bg: "#FCE4EC", texto: "#880E4F" },
  "Sem molho":         { bg: "#FCE4EC", texto: "#880E4F" },
};

// Cores genéricas de fallback por grupo
const CORES_POR_GRUPO = {
  restricao:    { bg: "#FFEBEE", texto: "#C62828" },
  metodo:       { bg: "#E3F2FD", texto: "#1565C0" },
  perfil:       { bg: "#E8F5E9", texto: "#2E7D32" },
  contexto:     { bg: "#F3E5F5", texto: "#6A1B9A" },
  ingrediente:  { bg: "#FFF3E0", texto: "#E65100" },
  molho:        { bg: "#FCE4EC", texto: "#880E4F" },
  verde:        { bg: "#E8F5E9", texto: "#2E7D32" },
  "verde-claro":{ bg: "#C8E6C9", texto: "#2E7D32" },
  vermelho:     { bg: "#FFEBEE", texto: "#C62828" },
  cinza:        { bg: "#F5F5F5", texto: "#616161" },
};

export default function TagBadge({ nome, cor, grupo, onClick, className = "" }) {
  // Prioridade: cor por nome > cor por grupo > fallback verde
  const corPorNome = CORES_POR_NOME[nome];
  const corPorGrupo = CORES_POR_GRUPO[grupo] || CORES_POR_GRUPO[cor];
  const estilo = corPorNome || corPorGrupo || CORES_POR_GRUPO.verde;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${onClick ? "cursor-pointer hover:opacity-80" : ""} ${className}`}
      style={{
        backgroundColor: estilo.bg,
        color: estilo.texto,
        borderColor: estilo.texto + "30",
      }}
      onClick={onClick}
      title={onClick ? "Clique para remover" : nome}
    >
      {nome}
    </span>
  );
}