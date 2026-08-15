import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ContatoIcones from "@/components/admin/ContatoIcones";
import { computeStatusUsuario, formatarData, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";

export default function UsuariosTable({ usuarios }) {
  const navigate = useNavigate();

  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhum usuário encontrado.</p>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right">Conta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => {
            const status = computeStatusUsuario(u);
            return (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome_completo || u.full_name || "—"}</TableCell>
                <TableCell>{PLANO_LABEL[u.plano_atual] || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={status.className}>{status.label}</Badge>
                </TableCell>
                <TableCell>{formatarData(u.data_expiracao) || "—"}</TableCell>
                <TableCell><ContatoIcones email={u.email} telefone={u.telefone_whatsapp} /></TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => navigate(`/conta?userId=${u.id}`)}
                    title="Abrir conta"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}