import PrecoZeroRow from "@/components/ingrediente/PrecoZeroRow";

export default function PrecosZeroView({ ingredientes, onSave, saving }) {
  if (ingredientes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="font-semibold">Nenhum ingrediente com preço zero</p>
        <p className="mt-1 text-sm text-muted-foreground">Todos os ingredientes já possuem valor cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <p className="text-sm font-semibold">Preenchimento rápido de preços</p>
        <p className="text-xs text-muted-foreground">Informe a quantidade da embalagem e o preço pago. O valor por kg ou litro será calculado automaticamente.</p>
      </div>
      {ingredientes.map((ingrediente) => (
        <PrecoZeroRow key={ingrediente.id} ingrediente={ingrediente} onSave={onSave} saving={saving} />
      ))}
    </div>
  );
}