import { ExternalLink } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatarDataHora, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";
import { formatarMoeda, FORMA_PAGAMENTO_LABEL, STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_CLASSNAME } from "@/lib/pagamentosUsuario";

export default function HistoricoPagamentosLinha({ pagamentos }) {
  if (!pagamentos || pagamentos.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Nenhum pagamento registrado para este usuário.</p>;
  }

  return (
    <div className="p-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data da compra</TableHead>
            <TableHead>Data de recebimento</TableHead>
            <TableHead>ID do pagamento</TableHead>
            <TableHead>Forma de pagamento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Valor líquido</TableHead>
            <TableHead>NF</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagamentos.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{formatarDataHora(p.created_date) || "—"}</TableCell>
              <TableCell>{p.status === "approved" ? (formatarDataHora(p.updated_date) || "—") : "—"}</TableCell>
              <TableCell className="font-mono text-xs">{p.mercadopago_order_id || p.id}</TableCell>
              <TableCell>{FORMA_PAGAMENTO_LABEL[p.forma_pagamento] || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={STATUS_PAGAMENTO_CLASSNAME[p.status]}>
                  {STATUS_PAGAMENTO_LABEL[p.status] || p.status}
                </Badge>
              </TableCell>
              <TableCell>{PLANO_LABEL[p.plano] || "—"}</TableCell>
              <TableCell>{formatarMoeda(p.valor)}</TableCell>
              <TableCell>{formatarMoeda(p.valor_liquido ?? p.valor)}</TableCell>
              <TableCell>
                {p.nota_fiscal_url ? (
                  <a
                    href={p.nota_fiscal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Ver NF <ExternalLink className="w-3 h-3" />
                  </a>
                ) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}