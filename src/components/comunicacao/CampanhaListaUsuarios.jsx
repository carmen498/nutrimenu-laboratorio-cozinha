import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { computeStatusUsuario, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";

export default function CampanhaListaUsuarios({ usuarios, selecionados, onToggle }) {
  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Nenhum usuário encontrado.</p>;
  }

  return (
    <div className="border rounded-lg max-h-72 overflow-y-auto divide-y">
      {usuarios.map((u) => {
        const status = computeStatusUsuario(u);
        return (
          <label
            key={u.id}
            className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
          >
            <Checkbox checked={selecionados.has(u.id)} onCheckedChange={() => onToggle(u.id)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{u.nome_completo || u.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">{PLANO_LABEL[u.plano_atual] || "—"}</span>
            <Badge variant="outline" className={`${status.className} shrink-0`}>{status.label}</Badge>
          </label>
        );
      })}
    </div>
  );
}