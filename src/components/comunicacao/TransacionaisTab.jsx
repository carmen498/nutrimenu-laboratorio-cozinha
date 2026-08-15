import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import TemplateEmailDialog from "./TemplateEmailDialog";

const LINHAS = [
  {
    gatilho: "Boas-vindas",
    status: "Ativo",
    tipoLog: "boas_vindas",
    assuntoPadrao: "Bem-vindo(a) ao Laboratório de Cozinha",
    corpoPadrao: `<p>Olá {{nome}}, seja bem-vindo(a) ao Laboratório de Cozinha!</p>
<p>Seu período de teste gratuito já começou. Explore receitas, cardápios e a gestão de custos da sua cozinha.</p>`,
  },
  {
    gatilho: "Trial expirando",
    status: "Ativo",
    tipoLog: "trial_expirando",
    assuntoPadrao: "Seu teste gratuito está acabando",
    corpoPadrao: `<p>Olá {{nome}}, seu período de teste no Laboratório de Cozinha termina em 2 dias.</p>
<p>Não perca o acesso — escolha um plano para continuar.</p>`,
  },
  {
    gatilho: "Trial vencido",
    status: "Ativo",
    tipoLog: "trial_vencido",
    assuntoPadrao: "Seu teste gratuito terminou",
    corpoPadrao: `<p>Olá {{nome}}, seu período de teste no Laboratório de Cozinha terminou hoje.</p>
<p>Escolha um plano para continuar usando todas as funcionalidades.</p>`,
  },
  { gatilho: "Pagamento aprovado", status: "Rascunho", tipoLog: null },
  { gatilho: "Pagamento recusado", status: "Rascunho", tipoLog: null },
  { gatilho: "Plano perto de vencer", status: "Rascunho", tipoLog: null },
  { gatilho: "Nota fiscal solicitada", status: "Rascunho", tipoLog: null },
];

export default function TransacionaisTab() {
  const [linhaEditando, setLinhaEditando] = useState(null);

  const { data: logs = [] } = useQuery({
    queryKey: ["log-email-30d"],
    queryFn: () => base44.entities.LogEmail.list("-enviado_em", 2000),
  });

  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const contarEnvios = (tipo) => {
    if (!tipo) return 0;
    return logs.filter((l) => l.tipo === tipo && l.status === "enviado" && new Date(l.enviado_em).getTime() >= limite).length;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gatilho</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enviados (30d)</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {LINHAS.map((linha) => (
            <TableRow key={linha.gatilho}>
              <TableCell className="font-medium">{linha.gatilho}</TableCell>
              <TableCell>
                <Badge variant={linha.status === "Ativo" ? "default" : "secondary"}>{linha.status}</Badge>
              </TableCell>
              <TableCell>{contarEnvios(linha.tipoLog)}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!linha.tipoLog}
                  onClick={() => linha.tipoLog && setLinhaEditando(linha)}
                >
                  Editar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {linhaEditando && (
        <TemplateEmailDialog
          open={!!linhaEditando}
          onOpenChange={(open) => !open && setLinhaEditando(null)}
          tipo={linhaEditando.tipoLog}
          titulo={`E-mail: ${linhaEditando.gatilho}`}
          assuntoPadrao={linhaEditando.assuntoPadrao}
          corpoPadrao={linhaEditando.corpoPadrao}
        />
      )}
    </>
  );
}