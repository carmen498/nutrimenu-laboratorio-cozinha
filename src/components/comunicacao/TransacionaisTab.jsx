import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
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
  {
    gatilho: "Onboarding · Dia 2",
    status: "Rascunho",
    tipoLog: "onboarding_dia2",
    assuntoPadrao: "{{nome}}, sua receita em qualquer quantidade",
    corpoPadrao: `<p>Olá {{nome}},</p>
<p>Você sabia que, no Laboratório de Cozinha, a mesma receita serve 4 ou 400 pessoas sem você recalcular nada à mão? O custo por porção e a lista de compras se ajustam junto.</p>
<p>Abra uma receita, mude o número de porções e veja o que acontece.</p>`,
  },
  {
    gatilho: "Onboarding · Dia 5",
    status: "Rascunho",
    tipoLog: "onboarding_dia5",
    assuntoPadrao: "{{nome}}, do cardápio ao orçamento do cliente",
    corpoPadrao: `<p>Olá {{nome}},</p>
<p>Depois de montar uma refeição ou um evento, o Laboratório gera o orçamento pronto para enviar ao cliente — com o preço final que você definir e sem expor seus custos internos.</p>
<p>É o caminho que a Carmen usa em todos os eventos dela.</p>`,
  },
  {
    gatilho: "Onboarding · Véspera do fim do teste",
    status: "Rascunho",
    tipoLog: "onboarding_resumo_oferta",
    assuntoPadrao: "{{nome}}, seu teste está no fim",
    corpoPadrao: `<p>Olá {{nome}},</p>
<p>Seu período de teste está chegando ao fim. Tudo o que você criou continua salvo na sua conta ao escolher um plano.</p>
<p>O plano anual sai por menos da metade do mensal — vale conferir antes de decidir.</p>`,
  },
  {
    gatilho: "Reativação · 3 dias após o fim do teste",
    status: "Rascunho",
    tipoLog: "reativacao_d3",
    assuntoPadrao: "{{nome}}, suas receitas continuam aqui",
    corpoPadrao: `<p>Olá {{nome}},</p>
<p>Seu teste do Laboratório de Cozinha terminou, mas tudo o que você criou continua salvo: receitas, cardápios, eventos e custos.</p>
<p>Ao escolher um plano, você volta exatamente de onde parou.</p>`,
  },
  {
    gatilho: "Reativação · 7 dias após o fim do teste",
    status: "Rascunho",
    tipoLog: "reativacao_d7",
    assuntoPadrao: "{{nome}}, quer retomar de onde parou?",
    corpoPadrao: `<p>Olá {{nome}},</p>
<p>Faz uma semana que seu teste terminou. Suas receitas e cardápios seguem guardados na sua conta.</p>
<p>Se ficou alguma dúvida sobre escalar receitas, custos ou orçamentos, responda este e-mail — a gente ajuda.</p>`,
  },
  {
    gatilho: "Pagamento aprovado",
    status: "Rascunho",
    tipoLog: "pagamento_aprovado",
    assuntoPadrao: "Pagamento aprovado",
    corpoPadrao: `<p>Olá {{nome}}, seu pagamento foi aprovado com sucesso!</p>
<p>Seu plano no Laboratório de Cozinha já está ativo. Bom uso!</p>`,
  },
  {
    gatilho: "Pagamento recusado",
    status: "Rascunho",
    tipoLog: "pagamento_recusado",
    assuntoPadrao: "Não conseguimos aprovar seu pagamento",
    corpoPadrao: `<p>Olá {{nome}}, não conseguimos aprovar o pagamento da sua assinatura.</p>
<p>Verifique os dados do cartão ou tente outra forma de pagamento para continuar com acesso ao Laboratório de Cozinha.</p>`,
  },
  {
    gatilho: "Plano perto de vencer",
    status: "Rascunho",
    tipoLog: "plano_vencendo",
    assuntoPadrao: "Seu plano está perto de vencer",
    corpoPadrao: `<p>Olá {{nome}}, seu plano no Laboratório de Cozinha vence em breve.</p>
<p>Renove agora para não perder o acesso às suas receitas e cardápios.</p>`,
  },
  {
    gatilho: "Nota fiscal solicitada",
    status: "Rascunho",
    tipoLog: "nota_fiscal_solicitada",
    disponivel: false,
    assuntoPadrao: "Recebemos sua solicitação de nota fiscal",
    corpoPadrao: `<p>Olá {{nome}}, recebemos sua solicitação de nota fiscal.</p>
<p>Em breve enviaremos o documento para este e-mail.</p>`,
  },
  {
    gatilho: "Pagamento estornado",
    status: "Rascunho",
    tipoLog: "pagamento_estornado",
    assuntoPadrao: "Seu pagamento foi estornado",
    corpoPadrao: `<p>Olá {{nome}}, informamos que o valor do seu pagamento foi estornado.</p>
<p>O reembolso será processado pelo Mercado Pago e deve aparecer no seu extrato em alguns dias, conforme o prazo do seu banco ou operadora de cartão.</p>
<p>Se tiver dúvidas, é só nos chamar.</p>
<p><a href="https://wa.me/555134160886" style="color:#5c7a5f; text-decoration:underline;">Falar com o suporte</a></p>`,
  },
  {
    gatilho: "Lembrete de pagamento pendente",
    status: "Rascunho",
    tipoLog: "pagamento_pendente_lembrete",
    assuntoPadrao: "Podemos ajudar com seu pagamento?",
    corpoPadrao: `<p>Olá {{nome}}, notamos que seu pagamento no Laboratório de Cozinha ainda não foi confirmado.</p>
<p>Podemos ajudar em algo? Se preferir, você pode gerar um novo pagamento na aba Planos do app.</p>`,
  },
  {
    gatilho: "Custos · Trial ativado",
    status: "Rascunho",
    tipoLog: "custos_trial_ativado",
    assuntoPadrao: "Seu teste do Laboratório de Custos começou",
    corpoPadrao: `<p>Olá {{nome}}, seu teste gratuito do Laboratório de Custos já começou.</p><p>Você tem 7 dias para explorar custos de produção, custo por receita, margem, markup e histórico de fichas.</p>`,
  },
  {
    gatilho: "Custos · Trial expirando",
    status: "Rascunho",
    tipoLog: "custos_trial_expirando",
    assuntoPadrao: "Seu teste do Laboratório de Custos termina em breve",
    corpoPadrao: `<p>Olá {{nome}}, seu teste gratuito do Laboratório de Custos termina em {{dias_restantes}} dia(s).</p><p>Seu histórico permanece preservado.</p>`,
  },
  {
    gatilho: "Custos · Trial encerrado",
    status: "Rascunho",
    tipoLog: "custos_trial_vencido",
    assuntoPadrao: "Seu teste do Laboratório de Custos terminou",
    corpoPadrao: `<p>Olá {{nome}}, seu teste gratuito do Laboratório de Custos terminou hoje.</p><p>Suas fichas continuam preservadas para uma futura reativação.</p>`,
  },
  {
    gatilho: "Custos · Pagamento aprovado",
    status: "Rascunho",
    tipoLog: "custos_pagamento_aprovado",
    assuntoPadrao: "Laboratório de Custos ativado",
    corpoPadrao: `<p>Olá {{nome}}, seu pagamento foi aprovado.</p><p>Seu plano {{plano}} do Laboratório de Custos está ativo até {{data_expiracao}}.</p>`,
  },
  {
    gatilho: "Custos · Plano perto de vencer",
    status: "Rascunho",
    tipoLog: "custos_plano_vencendo",
    assuntoPadrao: "Seu Laboratório de Custos está perto de vencer",
    corpoPadrao: `<p>Olá {{nome}}, seu acesso ao Laboratório de Custos vence em {{dias_restantes}} dia(s), em {{data_expiracao}}.</p><p>Seu histórico permanece preservado.</p>`,
  },
  {
    gatilho: "Custos · Acesso expirado",
    status: "Rascunho",
    tipoLog: "custos_acesso_expirado",
    assuntoPadrao: "Seu acesso ao Laboratório de Custos expirou",
    corpoPadrao: `<p>Olá {{nome}}, seu acesso ao Laboratório de Custos expirou em {{data_expiracao}}.</p><p>Suas fichas e seu histórico continuam preservados.</p>`,
  },
];

export default function TransacionaisTab() {
  const [linhaEditando, setLinhaEditando] = useState(null);
  const [alternando, setAlternando] = useState(null);
  const queryClient = useQueryClient();

  const { data: logs = [] } = useQuery({
    queryKey: ["log-email-30d"],
    queryFn: () => base44.entities.LogEmail.list("-enviado_em", 2000),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["template-email-status"],
    queryFn: () => base44.entities.TemplateEmail.list(),
  });

  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const contarEnvios = (tipo) => {
    if (!tipo) return 0;
    return logs.filter((l) => l.tipo === tipo && l.status === "enviado" && new Date(l.enviado_em).getTime() >= limite).length;
  };

  const getTemplate = (tipo) => templates.find((t) => t.tipo === tipo);
  const getStatus = (linha) => {
    if (linha.disponivel === false) return "Sem gatilho";
    return getTemplate(linha.tipoLog)?.status === "ativo" ? "Ativo" : "Rascunho";
  };

  const handleAlternarStatus = async (linha) => {
    const template = getTemplate(linha.tipoLog);
    const novoStatus = template?.status === "ativo" ? "rascunho" : "ativo";
    setAlternando(linha.tipoLog);
    try {
      if (template) {
        await base44.entities.TemplateEmail.update(template.id, { status: novoStatus });
      } else {
        await base44.entities.TemplateEmail.create({
          tipo: linha.tipoLog,
          assunto: linha.assuntoPadrao,
          corpo: linha.corpoPadrao,
          status: novoStatus,
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["template-email-status"] });
      toast({ title: novoStatus === "ativo" ? "E-mail ativado" : "E-mail movido para rascunho" });
    } finally {
      setAlternando(null);
    }
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
          {LINHAS.map((linha) => {
            const status = getStatus(linha);
            return (
              <TableRow key={linha.gatilho}>
                <TableCell className="font-medium">{linha.gatilho}</TableCell>
                <TableCell>
                  <Badge variant={status === "Ativo" ? "default" : "secondary"}>{status}</Badge>
                </TableCell>
                <TableCell>{contarEnvios(linha.tipoLog)}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!linha.tipoLog || linha.disponivel === false || alternando === linha.tipoLog}
                    onClick={() => linha.tipoLog && linha.disponivel !== false && handleAlternarStatus(linha)}
                  >
                    {alternando === linha.tipoLog && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    {status === "Ativo" ? "Mover p/ rascunho" : "Ativar"}
                  </Button>
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
            );
          })}
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