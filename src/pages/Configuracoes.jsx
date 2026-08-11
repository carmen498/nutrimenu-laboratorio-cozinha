import { Settings } from "lucide-react";

export default function Configuracoes() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24">
      <Settings className="w-10 h-10 mb-3" style={{ color: "#2A4E3D" }} />
      <h1 className="font-display text-xl font-bold mb-1" style={{ color: "#2A4E3D" }}>
        Configurações
      </h1>
      <p className="text-sm text-muted-foreground">Em breve.</p>
    </div>
  );
}