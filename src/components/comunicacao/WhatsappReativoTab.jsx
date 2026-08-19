import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const LINHAS = [
  { evento: "Pagamento recusado", template: "pagamento_recusado_v1", status: "Rascunho" },
  { evento: "2ª tentativa falhou", template: "segunda_tentativa_falhou_v1", status: "Rascunho" },
  { evento: "Trial vencendo em 1 dia", template: "trial_vencendo_1dia_v1", status: "Rascunho" },
  { evento: "Lembrete de pagamento pendente", template: "pagamento_pendente_lembrete", status: "Rascunho" },
  { evento: "Pagamento estornado", template: "pagamento_estornado", status: "Rascunho" },
];

export default function WhatsappReativoTab({ onEditarTemplate }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evento</TableHead>
          <TableHead>Template</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {LINHAS.map((linha) => (
          <TableRow key={linha.evento}>
            <TableCell className="font-medium">{linha.evento}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{linha.template}</TableCell>
            <TableCell>
              <Badge variant="secondary">{linha.status}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => onEditarTemplate?.(linha.template)}>
                Editar template
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}