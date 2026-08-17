import { formatarMoeda } from "@/lib/pagamentosUsuario";

const CARDS = [
  { status: "approved", label: "Aprovado", className: "border-green-200 bg-green-50" },
  { status: "pending", label: "Aguardando pagamento", className: "border-yellow-200 bg-yellow-50" },
  { status: "rejected", label: "Expirado", className: "border-orange-200 bg-orange-50" },
  { status: "cancelled", label: "Cancelado", className: "border-gray-200 bg-gray-50" },
];

export default function ResumoPagamentosCards({ pagamentos }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CARDS.map((c) => {
        const doStatus = pagamentos.filter((p) => p.status === c.status);
        const bruto = doStatus.reduce((acc, p) => acc + (p.valor || 0), 0);
        const liquido = doStatus.reduce((acc, p) => acc + (p.valor_liquido ?? p.valor ?? 0), 0);
        return (
          <div key={c.status} className={`rounded-lg border p-3 ${c.className}`}>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{c.label}</p>
            <p className="text-sm font-semibold leading-tight">
              {formatarMoeda(bruto)} <span className="text-xs text-muted-foreground font-normal">bruto</span>
            </p>
            <p className="text-sm leading-tight">
              {formatarMoeda(liquido)} <span className="text-xs text-muted-foreground font-normal">líquido</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}