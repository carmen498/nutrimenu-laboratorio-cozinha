import { Power, AlertTriangle } from "lucide-react";

// Toggle sempre visível na tela Ingredientes — controla a automação semanal
// de atualização de preços (Deno automation → atualizarPrecosAutomatico).
export default function AutoUpdateToggle({ ativa, toggling, onToggle }) {
  return (
    <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg border bg-card">
      <button
        onClick={onToggle}
        disabled={toggling}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shrink-0 ${
          ativa
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
        }`}
      >
        <Power className="w-3.5 h-3.5" />
        Atualização automática de preços: {ativa ? "ATIVA" : "PAUSADA"}
      </button>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-1 min-w-[220px]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        Esta atualização consulta preços via IA web e consome créditos do app. Ative com critério.
      </p>
    </div>
  );
}