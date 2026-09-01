import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import ContatoIcones from "@/components/admin/ContatoIcones";
import HistoricoPagamentosLinha from "@/components/admin/HistoricoPagamentosLinha";
import { computeStatusUsuario, formatarData, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";
import {
  getUltimoPagamento, formatarMoeda, FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_CLASSNAME,
} from "@/lib/pagamentosUsuario";

export default function UsuariosTable({ usuarios, selecionados, onToggle, onToggleAll, pagamentosPorUsuario, pagamentosPorUsuarioPeriodo, acessoCustosPorUsuario = new Map(), movimentacaoPorUsuario = new Map() }) {
  const [expandidos, setExpandidos] = useState(new Set());

  if (usuarios.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">Nenhum usuário encontrado.</p>;
  }

  const todosSelecionados = usuarios.every((u) => selecionados.has(u.id));

  const toggleExpandir = (id) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={todosSelecionados} onCheckedChange={(checked) => onToggleAll(!!checked)} />
            </TableHead>
            <TableHead className="w-8" />
            <TableHead>Nome</TableHead>
            <TableHead className="text-center">Receitas</TableHead>
            <TableHead className="text-center">Refeições</TableHead>
            <TableHead className="text-center">Cardápios</TableHead>
            <TableHead className="text-center">Eventos</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Lab. Custos</TableHead>
            <TableHead>Último pagamento</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {usuarios.map((u) => {
            const status = computeStatusUsuario(u);
            const ultimoPagamento = getUltimoPagamento(pagamentosPorUsuarioPeriodo, u.id);
            const historico = pagamentosPorUsuario.get(u.id) || [];
            const expandido = expandidos.has(u.id);
            const acessoCustos = acessoCustosPorUsuario.get(u.id);
            const movimentacao = movimentacaoPorUsuario.get(u.id) || { receitas: [], refeicoes: [], cardapios: [], eventos: [] };
            let statusCustos = "Não contratado";
            if (acessoCustos) {
              if (acessoCustos.status === "suspenso") statusCustos = "Suspenso";
              else if (acessoCustos.status === "cancelado") statusCustos = "Cancelado";
              else if (acessoCustos.status === "expirado" || (acessoCustos.fim_em && new Date(acessoCustos.fim_em) < new Date())) statusCustos = "Expirado";
              else if (acessoCustos.status === "pendente") statusCustos = "Pendente";
              else if (acessoCustos.status === "ativo" && acessoCustos.modalidade === "trial") statusCustos = "Trial ativo";
              else if (acessoCustos.status === "ativo") statusCustos = "Ativo";
            }
            return (
              <Fragment key={u.id}>
                <TableRow>
                  <TableCell>
                    <Checkbox checked={selecionados.has(u.id)} onCheckedChange={() => onToggle(u.id)} />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleExpandir(u.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={expandido ? "Recolher histórico de pagamentos" : "Ver histórico de pagamentos"}
                    >
                      {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <button className="text-left hover:text-primary hover:underline" onClick={() => toggleExpandir(u.id)} title="Abrir movimentação e histórico">
                      {u.nome_completo || u.full_name || "—"}
                    </button>
                  </TableCell>
                  <TableCell className="text-center">{movimentacao.receitas.length}</TableCell>
                  <TableCell className="text-center">{movimentacao.refeicoes.length}</TableCell>
                  <TableCell className="text-center">{movimentacao.cardapios.length}</TableCell>
                  <TableCell className="text-center">{movimentacao.eventos.length}</TableCell>
                  <TableCell>{PLANO_LABEL[u.plano_atual] || "—"}</TableCell>
                  <TableCell>{u.role === "admin" ? "Sem vencimento" : (formatarData(u.data_expiracao) || "—")}</TableCell>
                  <TableCell><Badge variant="outline">{statusCustos}</Badge></TableCell>
                  <TableCell>
                    {ultimoPagamento ? (
                      <span className="text-sm">
                        <span className="font-medium">{formatarMoeda(ultimoPagamento.valor)}</span>
                        <span className="text-muted-foreground"> · {FORMA_PAGAMENTO_LABEL[ultimoPagamento.forma_pagamento] || "—"}</span>
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {ultimoPagamento ? (
                      <Badge variant="outline" className={STATUS_PAGAMENTO_CLASSNAME[ultimoPagamento.status]}>
                        {STATUS_PAGAMENTO_LABEL[ultimoPagamento.status] || ultimoPagamento.status}
                      </Badge>
                    ) : "—"}
                  </TableCell>
                  <TableCell><ContatoIcones email={u.email} telefone={u.telefone_whatsapp} /></TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
                {expandido && (
                  <TableRow>
                    <TableCell colSpan={14} className="bg-muted/30 p-0">
                      <div className="px-4 pt-4">
                        <p className="text-sm font-semibold mb-2">Movimentação no Laboratório de Cozinha</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="secondary">{movimentacao.receitas.length} receitas</Badge>
                          <Badge variant="secondary">{movimentacao.refeicoes.length} refeições</Badge>
                          <Badge variant="secondary">{movimentacao.cardapios.length} cardápios</Badge>
                          <Badge variant="secondary">{movimentacao.eventos.length} eventos</Badge>
                        </div>
                      </div>
                      <HistoricoPagamentosLinha pagamentos={historico} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}