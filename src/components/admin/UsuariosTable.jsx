import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ContatoIcones from "@/components/admin/ContatoIcones";
import { computeStatusUsuario, formatarData, formatarDataHora, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";

export default function UsuariosTable({ usuarios, selecionados, onToggle, onToggleAll, receitasPorUsuario = {} }) {
  const navigate = useNavigate();

  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhum usuário encontrado.</p>;
  }

  const todosSelecionados = usuarios.every((u) => selecionados.has(u.id));

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={todosSelecionados} onCheckedChange={(checked) => onToggleAll(!!checked)} />
            </TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Receitas</TableHead>
            <TableHead>Último acesso</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Conta</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => {
            const status = computeStatusUsuario(u);
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <Checkbox checked={selecionados.has(u.id)} onCheckedChange={() => onToggle(u.id)} />
                </TableCell>
                <TableCell className="font-medium">{u.nome_completo || u.full_name || "—"}</TableCell>
                <TableCell>{PLANO_LABEL[u.plano_atual] || "—"}</TableCell>
                <TableCell>{formatarData(u.data_expiracao) || "—"}</TableCell>
                <TableCell>{receitasPorUsuario[u.id] || 0}</TableCell>
                <TableCell>{formatarDataHora(u.data_login) || "—"}</TableCell>
                <TableCell>{u.cidade_uf || "—"}</TableCell>
                <TableCell><ContatoIcones email={u.email} telefone={u.telefone_whatsapp} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => navigate(`/conta?userId=${u.id}`)}
                    title="Abrir conta"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={status.className}>{status.label}</Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}