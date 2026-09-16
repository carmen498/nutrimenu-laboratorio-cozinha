import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Copy, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ContatoIcones from "@/components/admin/ContatoIcones";
import HistoricoPagamentosLinha from "@/components/admin/HistoricoPagamentosLinha";
import { computeStatusUsuario, formatarData, formatarDataHora, labelPlano, ORIGEM_CADASTRO_LABEL } from "@/lib/statusAssinaturaUsuario";
import { dataHoraBase44 } from "@/lib/fusoBrasilia";
import {
  getUltimoPagamento, formatarMoeda, FORMA_PAGAMENTO_LABEL,
  STATUS_PAGAMENTO_LABEL, STATUS_PAGAMENTO_CLASSNAME,
} from "@/lib/pagamentosUsuario";
import { isPagamentoTeste } from "@/lib/pagamentosTeste";

const ROW_H = "h-[45px]";
const LEFT_W = 40 + 32 + 180; // checkbox + expand + nome

// Abreviação dos selos de produto para a coluna "Produto" da tabela.
// "Laboratório de Cozinha" → "Lab. Cozinha" para não transbordar a célula.
const PRODUTO_BADGE_LABEL = {
  guia_zr: "Guia ZR",
  laboratorio_cozinha: "Lab. Cozinha",
  nao_informado: "Não informado",
};

function CampoNF({ rotulo, valor }) {
  if (valor === undefined || valor === null || valor === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-medium break-words">{valor}</dd>
    </div>
  );
}

export default function UsuariosTable({ usuarios, selecionados, onToggle, onToggleAll, pagamentosPorUsuario, pagamentosPorUsuarioPeriodo, acessoCustosPorUsuario = new Map(), movimentacaoPorUsuario = new Map(), origemCadastroFiltro = "todos" }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandidos, setExpandidos] = useState(new Set());
  const [usuarioAberto, setUsuarioAberto] = useState(null);
  const [dadosNFAbertos, setDadosNFAbertos] = useState(false);
  const [marcandoTeste, setMarcandoTeste] = useState(false);

  const isGuiaZR = origemCadastroFiltro === "guia_zr";

  const alterarContaTeste = async (usuario, contaTeste) => {
    setMarcandoTeste(true);
    try {
      await base44.entities.User.update(usuario.id, { conta_teste: contaTeste });
      setUsuarioAberto((atual) => atual?.id === usuario.id ? { ...atual, conta_teste: contaTeste } : atual);
      await qc.invalidateQueries({ queryKey: ["admin-usuarios"] });
      toast.success(contaTeste ? "Conta marcada como teste" : "Marcação de teste removida");
    } catch (err) {
      toast.error(err?.message || "Não foi possível alterar a marcação de teste.");
    } finally {
      setMarcandoTeste(false);
    }
  };

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

  // Colunas do painel direito
  const rightHeaders = isGuiaZR
    ? ["Plano", "Data da compra", "Situação", "Expira em", "Produto", "Lab. Custos", "Último pagamento", "Contato", "Status"]
    : ["Receitas", "Refeições", "Cardápios", "Eventos", "Plano", "Expira em", "Produto", "Lab. Custos", "Último pagamento", "Situação", "Contato", "Status"];

  const minRightWidth = rightHeaders.length * 90;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Container de dois painéis: esquerdo fixo + direito rolável */}
      <div className="flex">
        {/* Painel esquerdo fixo: checkbox, expandir, nome */}
        <div className="flex-shrink-0 border-r border-border bg-card">
          {/* Cabeçalho */}
          <div className={`flex items-center ${ROW_H} border-b px-2`}>
            <div className="flex items-center justify-center" style={{ width: 40 }}>
              <Checkbox checked={todosSelecionados} onCheckedChange={(checked) => onToggleAll(!!checked)} />
            </div>
            <div style={{ width: 32 }} />
            <div className="text-left font-medium text-muted-foreground text-sm whitespace-nowrap" style={{ width: 180, minWidth: 180 }}>Nome</div>
          </div>
          {/* Linhas */}
          {usuarios.map((u) => {
            const expandido = expandidos.has(u.id);
            return (
              <Fragment key={u.id}>
                <div className={`flex items-center ${ROW_H} border-b hover:bg-muted/50 transition-colors px-2`}>
                  <div className="flex items-center justify-center" style={{ width: 40 }}>
                    <Checkbox checked={selecionados.has(u.id)} onCheckedChange={() => onToggle(u.id)} />
                  </div>
                  <div className="flex items-center justify-center" style={{ width: 32 }}>
                    <button
                      onClick={() => toggleExpandir(u.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title={expandido ? "Recolher histórico de pagamentos" : "Ver histórico de pagamentos"}
                    >
                      {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis" style={{ width: 180, minWidth: 180 }}>
                    <button className="text-left text-primary hover:underline" onClick={() => { setUsuarioAberto(u); setDadosNFAbertos(false); }} title="Abrir conta do usuário">
                      {u.nome_completo || u.full_name || "—"}
                    </button>
                    {u.conta_teste && <Badge variant="secondary" className="ml-2">Teste</Badge>}
                  </div>
                </div>
                {expandido && <div className="border-b bg-muted/30" style={{ minWidth: LEFT_W }} />}
              </Fragment>
            );
          })}
        </div>

        {/* Painel direito rolável */}
        <div className="overflow-x-auto flex-1">
          <div style={{ minWidth: minRightWidth }}>
            {/* Cabeçalho */}
            <div className={`flex items-center ${ROW_H} border-b`}>
              {rightHeaders.map((h, i) => (
                <div key={i} className="px-2 text-sm font-medium text-muted-foreground whitespace-nowrap flex-shrink-0" style={{ width: h === "Último pagamento" ? 160 : h === "Produto" ? 120 : h === "Status" ? 100 : h === "Contato" ? 120 : 90 }}>
                  {h}
                </div>
              ))}
            </div>
            {/* Linhas */}
            {usuarios.map((u) => {
              const status = computeStatusUsuario(u);
              const ultimoPagamento = getUltimoPagamento(pagamentosPorUsuarioPeriodo, u.id);
              const historico = pagamentosPorUsuario.get(u.id) || [];
              const expandido = expandidos.has(u.id);
              const acessoCustos = acessoCustosPorUsuario.get(u.id);
              const movimentacao = movimentacaoPorUsuario.get(u.id) || { receitas: 0, refeicoes: 0, cardapios: 0, eventos: 0 };
              let statusCustos = "Não contratado";
              if (acessoCustos) {
                if (acessoCustos.status === "suspenso") statusCustos = "Suspenso";
                else if (acessoCustos.status === "cancelado") statusCustos = "Cancelado";
                else if (acessoCustos.status === "expirado" || (acessoCustos.fim_em && dataHoraBase44(acessoCustos.fim_em) < new Date())) statusCustos = "Expirado";
                else if (acessoCustos.status === "pendente") statusCustos = "Pendente";
                else if (acessoCustos.status === "ativo" && acessoCustos.modalidade === "trial") statusCustos = "Trial ativo";
                else if (acessoCustos.status === "ativo") statusCustos = "Ativo";
              }

              const cells = isGuiaZR ? [
                <span className="text-sm">{labelPlano(u.plano_atual)}</span>,
                <span className="text-sm">{ultimoPagamento ? (formatarData(ultimoPagamento.created_date) || "—") : "—"}</span>,
                ultimoPagamento ? <Badge variant="outline" className={STATUS_PAGAMENTO_CLASSNAME[ultimoPagamento.status]}>{STATUS_PAGAMENTO_LABEL[ultimoPagamento.status] || ultimoPagamento.status}</Badge> : <span className="text-sm">—</span>,
                <span className="text-sm">{u.role === "admin" ? "Sem vencimento" : (formatarData(u.data_expiracao) || "—")}</span>,
                <Badge variant="outline" className="whitespace-nowrap">{PRODUTO_BADGE_LABEL[u.origem_cadastro] || "Não informado"}</Badge>,
                <Badge variant="outline">{statusCustos}</Badge>,
                ultimoPagamento ? (
                  <span className="text-sm">
                    <span className="font-medium">{formatarMoeda(ultimoPagamento.valor)}</span>
                    <span className="text-muted-foreground"> · {FORMA_PAGAMENTO_LABEL[ultimoPagamento.forma_pagamento] || "—"}</span>
                    {isPagamentoTeste(ultimoPagamento) && <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 border-amber-300">TESTE</Badge>}
                  </span>
                ) : <span className="text-sm">—</span>,
                <ContatoIcones email={u.email} telefone={u.telefone_whatsapp} nome={u.nome_completo || u.full_name} />,
                <Badge variant="outline" className={status.className}>{status.label}</Badge>,
              ] : [
                <span className="text-sm text-center block">{movimentacao.receitas}</span>,
                <span className="text-sm text-center block">{movimentacao.refeicoes}</span>,
                <span className="text-sm text-center block">{movimentacao.cardapios}</span>,
                <span className="text-sm text-center block">{movimentacao.eventos}</span>,
                <span className="text-sm">{labelPlano(u.plano_atual)}</span>,
                <span className="text-sm">{u.role === "admin" ? "Sem vencimento" : (formatarData(u.data_expiracao) || "—")}</span>,
                <Badge variant="outline" className="whitespace-nowrap">{PRODUTO_BADGE_LABEL[u.origem_cadastro] || "Não informado"}</Badge>,
                <Badge variant="outline">{statusCustos}</Badge>,
                ultimoPagamento ? (
                  <span className="text-sm">
                    <span className="font-medium">{formatarMoeda(ultimoPagamento.valor)}</span>
                    <span className="text-muted-foreground"> · {FORMA_PAGAMENTO_LABEL[ultimoPagamento.forma_pagamento] || "—"}</span>
                    {isPagamentoTeste(ultimoPagamento) && <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-800 border-amber-300">TESTE</Badge>}
                  </span>
                ) : <span className="text-sm">—</span>,
                ultimoPagamento ? <Badge variant="outline" className={STATUS_PAGAMENTO_CLASSNAME[ultimoPagamento.status]}>{STATUS_PAGAMENTO_LABEL[ultimoPagamento.status] || ultimoPagamento.status}</Badge> : <span className="text-sm">—</span>,
                <ContatoIcones email={u.email} telefone={u.telefone_whatsapp} nome={u.nome_completo || u.full_name} />,
                <Badge variant="outline" className={status.className}>{status.label}</Badge>,
              ];

              return (
                <Fragment key={u.id}>
                  <div className={`flex items-center ${ROW_H} border-b hover:bg-muted/50 transition-colors`}>
                    {cells.map((cell, i) => (
                      <div key={i} className="px-2 whitespace-nowrap flex-shrink-0" style={{ width: rightHeaders[i] === "Último pagamento" ? 160 : rightHeaders[i] === "Produto" ? 120 : rightHeaders[i] === "Status" ? 100 : rightHeaders[i] === "Contato" ? 120 : 90 }}>
                        {cell}
                      </div>
                    ))}
                  </div>
                  {expandido && (
                    <div className="border-b bg-muted/30 p-0">
                      <div className="px-4 pt-4">
                        {!isGuiaZR && (
                          <>
                            <p className="text-sm font-semibold mb-2">Movimentação no Laboratório de Cozinha</p>
                            <div className="flex flex-wrap gap-2 text-xs mb-2">
                              <Badge variant="secondary">{movimentacao.receitas} receitas</Badge>
                              <Badge variant="secondary">{movimentacao.refeicoes} refeições</Badge>
                              <Badge variant="secondary">{movimentacao.cardapios} cardápios</Badge>
                              <Badge variant="secondary">{movimentacao.eventos} eventos</Badge>
                            </div>
                          </>
                        )}
                      </div>
                      <HistoricoPagamentosLinha pagamentos={historico} />
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <Sheet open={!!usuarioAberto} onOpenChange={(open) => { if (!open) { setUsuarioAberto(null); setDadosNFAbertos(false); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          {usuarioAberto && (() => {
            const movimentacao = movimentacaoPorUsuario.get(usuarioAberto.id) || { receitas: 0, refeicoes: 0, cardapios: 0, eventos: 0 };
            const historico = pagamentosPorUsuario.get(usuarioAberto.id) || [];
            const ultimoPagamento = historico.find((p) => p.status === "approved") || historico[0] || null;
            const status = computeStatusUsuario(usuarioAberto);
            const periodoPlano = { diario: "1 dia", mensal: "30 dias", anual: "1 ano", renovacao: "1 ano" };
            const copiarDadosNF = async () => {
              const nome = usuarioAberto.nome_completo || usuarioAberto.full_name;
              const cidade = (usuarioAberto.cidade || (usuarioAberto.cidade_uf || "").split("/")[0]?.trim() || "").toUpperCase();
              const estado = (usuarioAberto.estado || (usuarioAberto.cidade_uf || "").split("/")[1]?.trim() || "").toUpperCase();
              const plano = ultimoPagamento?.plano || usuarioAberto.plano_atual;
              const linhas = [
                "📌 DADOS CADASTRAIS",
                nome && `Nome completo: ${nome}`,
                usuarioAberto.razao_social && `Razão social: ${usuarioAberto.razao_social}`,
                usuarioAberto.cpf_cnpj && `CPF/CNPJ: ${usuarioAberto.cpf_cnpj}`,
                usuarioAberto.email && `E-mail: ${usuarioAberto.email}`,
                usuarioAberto.telefone_whatsapp && `Celular: ${usuarioAberto.telefone_whatsapp}`,
                usuarioAberto.created_date && `Data e hora de cadastro: ${formatarDataHora(usuarioAberto.created_date)}`,
                "",
                "📌 ENDEREÇO",
                usuarioAberto.cep && `CEP: ${usuarioAberto.cep}`,
                (usuarioAberto.logradouro || usuarioAberto.endereco) && `Logradouro: ${usuarioAberto.logradouro || usuarioAberto.endereco}`,
                usuarioAberto.numero && `Número: ${usuarioAberto.numero}`,
                usuarioAberto.complemento && `Complemento: ${usuarioAberto.complemento}`,
                usuarioAberto.bairro && `Bairro: ${usuarioAberto.bairro}`,
                cidade && `Cidade: ${cidade}`,
                estado && `Estado: ${estado}`,
                plano ? "" : null,
                plano ? "📌 PLANO" : null,
                plano && `Plano: ${labelPlano(plano)}`,
                ultimoPagamento?.created_date && `Data/hora da contratação: ${formatarDataHora(ultimoPagamento.created_date)}`,
                ultimoPagamento && `Valor: ${formatarMoeda(ultimoPagamento.valor)}`,
                periodoPlano[plano] && `Período: ${periodoPlano[plano]}`,
                ultimoPagamento && `Situação do pagamento: ${STATUS_PAGAMENTO_LABEL[ultimoPagamento.status] || ultimoPagamento.status}`,
                usuarioAberto.data_expiracao && `Validade: ${formatarData(usuarioAberto.data_expiracao)}`,
              ];
              const textoNF = linhas.filter(Boolean).join("\n").replace(/\n📌/g, "\n\n📌");

              try {
                await navigator.clipboard.writeText(textoNF);
                toast.success("Dados para emissão de NF copiados");
              } catch {
                toast.error("Não foi possível copiar os dados");
              }
            };
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
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
                    <Checkbox
                      id="conta-teste"
                      checked={!!usuarioAberto.conta_teste}
                      disabled={marcandoTeste}
                      onCheckedChange={(checked) => alterarContaTeste(usuarioAberto, checked === true)}
                    />
                    <label htmlFor="conta-teste" className="text-sm font-medium cursor-pointer">
                      Conta de teste — excluir dos números de vendas
                    </label>
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
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => navigate(`/conta?userId=${usuarioAberto.id}`)}>
                      <FileText className="w-3.5 h-3.5" /> Abrir dados cadastrais para NF
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={copiarDadosNF}>
                      <Copy className="w-3.5 h-3.5" /> Copiar dados para emissão de NF
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

                    {(usuarioAberto.cep || usuarioAberto.logradouro || usuarioAberto.endereco || usuarioAberto.bairro || usuarioAberto.cidade || usuarioAberto.cidade_uf) && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">📌 Endereço</h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <CampoNF rotulo="CEP" valor={usuarioAberto.cep} />
                          <CampoNF rotulo="Logradouro" valor={usuarioAberto.logradouro || usuarioAberto.endereco} />
                          <CampoNF rotulo="Número" valor={usuarioAberto.numero} />
                          <CampoNF rotulo="Complemento" valor={usuarioAberto.complemento} />
                          <CampoNF rotulo="Bairro" valor={usuarioAberto.bairro} />
                          <CampoNF rotulo="Cidade" valor={(usuarioAberto.cidade || (usuarioAberto.cidade_uf || "").split("/")[0]?.trim() || "").toUpperCase()} />
                          <CampoNF rotulo="Estado" valor={(usuarioAberto.estado || (usuarioAberto.cidade_uf || "").split("/")[1]?.trim() || "").toUpperCase()} />
                        </dl>
                      </div>
                    )}

                    {(usuarioAberto.plano_atual || ultimoPagamento) && (
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">📌 Plano</h3>
                        <dl className="grid gap-3 sm:grid-cols-2">
                          <CampoNF rotulo="Plano" valor={labelPlano(ultimoPagamento?.plano || usuarioAberto.plano_atual)} />
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
                    <p className="font-medium">{labelPlano(usuarioAberto.plano_atual)}</p>
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
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.receitas}</strong><p className="text-xs">Receitas</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.refeicoes}</strong><p className="text-xs">Refeições</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.cardapios}</strong><p className="text-xs">Cardápios</p></div>
                    <div className="rounded-lg bg-muted p-3 text-center"><strong>{movimentacao.eventos}</strong><p className="text-xs">Eventos</p></div>
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