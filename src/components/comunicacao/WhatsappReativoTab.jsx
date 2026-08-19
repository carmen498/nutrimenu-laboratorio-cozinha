import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EVENTOS_WASCRIPT } from "@/lib/eventosWascript";

export default function WhatsappReativoTab({ onEditarTemplate }) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["templates-wascript"],
    queryFn: () => base44.entities.TemplateWascript.list(),
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {EVENTOS_WASCRIPT.map((linha) => {
          const registro = templates.find((t) => t.tipo === linha.tipo);
          // Sem registro salvo, o sistema envia o texto padrão como ativo (ver notificarWascript.ts).
          const ativo = registro ? registro.status === "ativo" : true;
          return (
            <TableRow key={linha.tipo}>
              <TableCell className="font-medium">{linha.evento}</TableCell>
              <TableCell>
                {isLoading ? (
                  <span className="text-xs text-muted-foreground">Carregando...</span>
                ) : (
                  <Badge variant={ativo ? "default" : "secondary"}>
                    {ativo ? "Ativo" : "Rascunho"}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEditarTemplate?.(linha.tipo)}>
                  Editar template
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}