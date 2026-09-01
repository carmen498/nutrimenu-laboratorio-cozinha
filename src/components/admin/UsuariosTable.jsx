import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ContatoIcones from "@/components/admin/ContatoIcones";
import HistoricoPagamentosLinha from "@/components/admin/HistoricoPagamentosLinha";
import { computeStatusUsuario, formatarData, formatarDataHora, PLANO_LABEL } from "@/lib/statusAssinaturaUsuario";
import {
  getUltimoPagamento, formatarMoeda, FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_CLASSNAME,
} from "@/lib/pagamentosUsuario";

function CampoNF({ rotulo, valor }) {
  if (valor === undefined || valor === null || valor === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium break-words">{valor}</dd>
    </div>
  );
}

export default function UsuariosTable({ usuarios, selecionados, onToggle, onToggleAll, pagamentosPorUsuario, pagamentosPorUsuarioPeriodo, acessoCustosPorUsuario = new Map(), movimentacaoPorUsuario = new Map() }) {
  const [expandidos, setExpandidos] = useState(new Set());
  const [usuarioAberto, setUsuarioAberto] = useState(null);
  const [dadosNFAbertos, setDadosNFAbertos] = useState(false);

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
                    <button className="text-left text-primary hover:underline" onClick={() => { setUsuarioAberto(u); setDadosNFAbertos(false); }} title="Abrir conta do usuário">
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
                  <TableCell><ContatoIcones email={u.email} telefone={u.telefone_whatsapp} nome={u.nome_completo || u.full_name} /></TableCell>
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

      <Sheet open={!!usuarioAberto} onOpenChange={(open) => { if (!open) { setUsuarioAberto(null); setDadosNFAbertos(false); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {usuarioAberto && (() => {
            const movimentacao = movimentacaoPorUsuario.get(usuarioAberto.id) || { receitas: [], refeicoes: [], cardapios: [], eventos: [] };
            const historico = pagamentosPorUsuario.get(usuarioAberto.id) || [];
            const ultimoPagamento = historico.find((p) => p.status === "approved") || historico[0] || null;
            const status = computeStatusUsuario(usuarioAberto);
            const periodoPlano = { diario: "1 dia", mensal: "30 dias", anual: "1 ano", renovacao: "1 ano" };
            return (
              <div className="space-y-6">
                <SheetHeader>
                  <SheetTitle>Conta do usuário</SheetTitle>
                  <SheetDescription>Cadastro, movimentação e histórico de compras.</SheetDescription>
                </SheetHeader>

                <section className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-semibold">{usuarioAberto.nome_completo || usuarioAberto.full_name || "—"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm break-all">{usuarioAberto.email || "Não cadastrado"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">WhatsApp</p>
                      <p className="text-sm">{usuarioAberto.telefone_whatsapp || "Não cadastrado"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ContatoIcones email={usuarioAberto.email} telefone={usuarioAberto.telefone_whatsapp} nome={usuarioAberto.nome_completo || usuarioAberto.full_name} />
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setDadosNFAbertos((v) => !v)}>
                      <FileText className="w-3.5 h-3.5" /> Dados cadastrais para NF
                    </Button>
                  </div>
                </section>

                {dadosNFAbertos && (
                  <section className="rounded-lg border p-4 space-y-5">
                    <div>
                      <h3 className="font-semibold mb-3">📌 Dados cadastrais</h3>
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <CampoNF rotulo="Nome completo" valor={usuarioAberto.nome_completo || usuarioAberto.full_name} />
                        <CampoNF rotulo="Razão social" valor={usuarioAberto.razao_social} />
                        <CampoNF rotulo="CPF/CNPJ" valor={usuarioAberto.cpf_cnpj} />
                        <CampoNF rotulo="E-mail" valor={usuarioAberto.email} />
                        <CampoNF rotulo="Celular" valor={usuarioAberto.telefone_whatsapp} />
                        <CampoNF rotulo="Data e hora de cadastro" valor={formatarDataHora(usuarioAberto.created_date)} />
                      </dl>
                    </div>

                    {(usuarioAberto.cep || usuarioAberto.endereco || usuarioAberto.cidade_uf) && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">📌 Endereço</h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <CampoNF rotulo="CEP" valor={usuarioAberto.cep} />
                          <CampoNF rotulo="Endereço" valor={usuarioAberto.endereco} />
                          <CampoNF rotulo="Cidade/UF" valor={usuarioAberto.cidade_uf} />
                        </dl>
                      </div>
                    )}

                    {(usuarioAberto.plano_atual || ultimoPagamento) && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">📌 Plano</h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <CampoNF rotulo="Plano" valor={PLANO_LABEL[ultimoPagamento?.plano || usuarioAberto.plano_atual] || ultimoPagamento?.plano || usuarioAberto.plano_atual} />
                          <CampoNF rotulo="Data/hora da contratação" valor={formatarDataHora(ultimoPagamento?.created_date)} />
                          <CampoNF rotulo="Valor" valor={ultimoPagamento ? formatarMoeda(ultimoPagamento.valor) : null} />
                          <CampoNF rotulo="Período" valor={periodoPlano[ultimoPagamento?.plano || usuarioAberto.plano_atual]} />
                          <CampoNF rotulo="Situação do pagamento" valor={ultimoPagamento ? (STATUS_PAGAMENTO_LABEL[ultimoPagamento.status] || ultimoPagamento.status) : null} />
                          <CampoNF rotulo="Validade" valor={formatarData(usuarioAberto.data_expiracao)} />
                        </dl>
                      </div>
                    )}
                  </section>
                )}

                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="font-medium">{PLANO_LABEL[usuarioAberto.plano_atual] || "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Expira em</p>
                    <p className="font-medium">{formatarData(usuarioAberto.data_expiracao) || "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Status da conta</p>
                    <Badge variant="outline" className={status.className}>{status.label}</Badge>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold mb-3">Movimentação no Laboratório de Cozinha</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.receitas.length}</strong><p className="text-xs">Receitas</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.refeicoes.length}</strong><p className="text-xs">Refeições</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.cardapios.length}</strong><p className="text-xs">Cardápios</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.eventos.length}</strong><p className="text-xs">Eventos</p></div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold px-3">Histórico de compras</h3>
                  <div className="overflow-x-auto">
                    <HistoricoPagamentosLinha pagamentos={historico} />
                  </div>
                </section>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}