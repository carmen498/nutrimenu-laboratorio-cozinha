import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllPages } from "@/lib/fetchAllPages";
import { avaliarAcessoAssinatura } from "@/lib/acessoAssinatura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, PauseCircle, PlayCircle, Search, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const MODULO = "laboratorio_custos";

const LABEL_ESTADO = {
  nao_contratado: "Não contratado",
  pendente: "Pendente",
  trial_ativo: "Trial ativo",
  ativo: "Ativo",
  expirado: "Expirado",
  suspenso: "Suspenso",
  cancelado: "Cancelado",
};

const LABEL_MODALIDADE = {
  trial: "Trial · 7 dias",
  "30_dias": "30 dias",
  anual: "Anual",
  cortesia: "Cortesia",
  admin: "Administrativo",
  migracao: "Migração",
};

const OPCAO_PLANO = {
  trial: { dias: 7, modalidade: "trial", plano_id: "custos_trial", origem: "admin" },
  "30_dias": { dias: 30, modalidade: "30_dias", plano_id: "custos_mensal", origem: "admin" },
  anual: { dias: 365, modalidade: "anual", plano_id: "custos_anual", origem: "admin" },
  cortesia: { dias: 30, modalidade: "cortesia", plano_id: undefined, origem: "cortesia" },
};

function formatarDataHora(valor) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function estadoDoAcesso(acesso, agora = new Date()) {
  if (!acesso) return "nao_contratado";
  if (acesso.status === "suspenso") return "suspenso";
  if (acesso.status === "cancelado") return "cancelado";
  if (acesso.status === "expirado") return "expirado";
  if (acesso.status === "pendente") return "pendente";
  if (acesso.inicio_em && new Date(acesso.inicio_em) > agora) return "pendente";
  if (acesso.fim_em && new Date(acesso.fim_em) < agora) return "expirado";
  if (acesso.status === "ativo" && acesso.modalidade === "trial") return "trial_ativo";
  if (acesso.status === "ativo") return "ativo";
  return "pendente";
}

function badgeClasse(estado) {
  if (["ativo", "trial_ativo"].includes(estado)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (estado === "expirado") return "bg-slate-50 text-slate-600 border-slate-200";
  if (estado === "suspenso") return "bg-amber-50 text-amber-700 border-amber-200";
  if (estado === "cancelado") return "bg-red-50 text-red-700 border-red-200";
  if (estado === "pendente") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-muted text-muted-foreground";
}

export default function AcessosCustosTab({ usuarios = [] }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [modalidadeFiltro, setModalidadeFiltro] = useState("todos");
  const [usuarioDialog, setUsuarioDialog] = useState(null);
  const [historicoDialog, setHistoricoDialog] = useState(null);
  const [modalidadeNova, setModalidadeNova] = useState("30_dias");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [acaoId, setAcaoId] = useState(null);

  const { data: acessos = [], isLoading } = useQuery({
    queryKey: ["admin-acessos-laboratorio-custos-completo"],
    queryFn: () => fetchAllPages(base44.entities.AcessoLaboratorioCustosUsuario, "-updated_date", 500),
    retry: false,
  });

  const acessosPorUsuario = useMemo(() => {
    const map = new Map();
    for (const acesso of acessos) {
      if (!acesso?.user_id) continue;
      const lista = map.get(acesso.user_id) || [];
      lista.push(acesso);
      map.set(acesso.user_id, lista);
    }
    return map;
  }, [acessos]);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return usuarios
      .filter((u) => u.role !== "admin")
      .map((u) => {
        const historico = acessosPorUsuario.get(u.id) || [];
        const atual = historico[0] || null;
        const estado = estadoDoAcesso(atual);
        const trialUsado = historico.some((a) => a.modalidade === "trial" || a.origem === "trial" || !!a.trial_ativado_em);
        const base = avaliarAcessoAssinatura(u);
        return { usuario: u, historico, atual, estado, trialUsado, baseAtiva: base.temAcesso };
      })
      .filter((linha) => {
        if (termo) {
          const alvo = `${linha.usuario.nome_completo || linha.usuario.full_name || ""} ${linha.usuario.email || ""}`.toLowerCase();
          if (!alvo.includes(termo)) return false;
        }
        if (estadoFiltro !== "todos" && linha.estado !== estadoFiltro) return false;
        if (modalidadeFiltro !== "todos" && linha.atual?.modalidade !== modalidadeFiltro) return false;
        return true;
      });
  }, [usuarios, acessosPorUsuario, busca, estadoFiltro, modalidadeFiltro]);

  const totais = useMemo(() => {
    const valores = { ativo: 0, trial: 0, expirado: 0, semAcesso: 0 };
    for (const linha of linhas) {
      if (linha.estado === "trial_ativo") valores.trial++;
      else if (linha.estado === "ativo") valores.ativo++;
      else if (linha.estado === "expirado") valores.expirado++;
      else if (linha.estado === "nao_contratado") valores.semAcesso++;
    }
    return valores;
  }, [linhas]);

  const invalidar = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-acessos-laboratorio-custos-completo"] }),
      qc.invalidateQueries({ queryKey: ["admin-acessos-laboratorio-custos"] }),
      qc.invalidateQueries({ queryKey: ["custos-entitlement"] }),
    ]);
  };

  const abrirConcessao = (linha) => {
    setUsuarioDialog(linha);
    setModalidadeNova(linha.trialUsado ? "30_dias" : "trial");
    setObservacao("");
  };

  const conceder = async () => {
    if (!usuarioDialog) return;
    const opcao = OPCAO_PLANO[modalidadeNova];
    if (!opcao) return;
    if (!usuarioDialog.baseAtiva) {
      toast({ title: "Laboratório de Cozinha inativo", description: "Ative primeiro o produto-base antes de conceder o Laboratório de Custos.", variant: "destructive" });
      return;
    }
    if (["ativo", "trial_ativo"].includes(usuarioDialog.estado)) {
      toast({ title: "Já existe acesso ativo", description: "Suspenda, cancele ou aguarde o vencimento antes de conceder um novo período.", variant: "destructive" });
      return;
    }
    if (modalidadeNova === "trial" && usuarioDialog.trialUsado) {
      toast({ title: "Trial já utilizado", description: "O teste gratuito só pode ser concedido uma vez por usuário.", variant: "destructive" });
      return;
    }

    setSalvando(true);
    try {
      const inicio = new Date();
      const fim = new Date(inicio.getTime() + opcao.dias * 24 * 60 * 60 * 1000);
      await base44.entities.AcessoLaboratorioCustosUsuario.create({
        user_id: usuarioDialog.usuario.id,
        modulo: MODULO,
        status: "ativo",
        modalidade: opcao.modalidade,
        ...(opcao.plano_id ? { plano_id: opcao.plano_id } : {}),
        origem: opcao.origem,
        inicio_em: inicio.toISOString(),
        fim_em: fim.toISOString(),
        ...(modalidadeNova === "trial" ? { trial_ativado_em: inicio.toISOString() } : {}),
        oferta_versao: "custos-v1-2026-08",
        observacao: observacao.trim() || `Concessão administrativa: ${LABEL_MODALIDADE[opcao.modalidade] || opcao.modalidade}.`,
      });
      await invalidar();
      toast({ title: "Acesso concedido", description: `${LABEL_MODALIDADE[opcao.modalidade]} ativado para ${usuarioDialog.usuario.nome_completo || usuarioDialog.usuario.full_name || usuarioDialog.usuario.email}.` });
      setUsuarioDialog(null);
    } catch (err) {
      toast({ title: "Não foi possível conceder o acesso", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const alterarStatus = async (linha, status) => {
    if (!linha.atual?.id) return;
    setAcaoId(`${linha.atual.id}:${status}`);
    try {
      const dados = { status };
      if (status === "cancelado") dados.cancelado_em = new Date().toISOString();
      await base44.entities.AcessoLaboratorioCustosUsuario.update(linha.atual.id, dados);
      await invalidar();
      toast({ title: status === "ativo" ? "Acesso reativado" : status === "suspenso" ? "Acesso suspenso" : "Acesso cancelado" });
    } catch (err) {
      toast({ title: "Não foi possível atualizar o acesso", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setAcaoId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-bold">Acessos do Laboratório de Custos</h2>
        <p className="text-sm text-muted-foreground mt-1">Controle administrativo independente do plano-base. Nenhuma ação desta tela cobra o usuário ou aciona Mercado Pago.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Ativos</p><p className="text-2xl font-bold mt-1">{totais.ativo}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Trials ativos</p><p className="text-2xl font-bold mt-1">{totais.trial}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Expirados</p><p className="text-2xl font-bold mt-1">{totais.expirado}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Não contratados</p><p className="text-2xl font-bold mt-1">{totais.semAcesso}</p></Card>
      </div>

      <div className="grid md:grid-cols-[1fr_180px_180px] gap-3">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}><SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os estados</SelectItem>{Object.entries(LABEL_ESTADO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
        <Select value={modalidadeFiltro} onValueChange={setModalidadeFiltro}><SelectTrigger><SelectValue placeholder="Modalidade" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas modalidades</SelectItem><SelectItem value="trial">Trial</SelectItem><SelectItem value="30_dias">30 dias</SelectItem><SelectItem value="anual">Anual</SelectItem><SelectItem value="cortesia">Cortesia</SelectItem></SelectContent></Select>
      </div>

      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div> : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Cozinha</TableHead><TableHead>Estado Custos</TableHead><TableHead>Modalidade</TableHead><TableHead>Início</TableHead><TableHead>Vencimento</TableHead><TableHead>Trial</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {linhas.map((linha) => {
                const vencido = linha.atual?.fim_em && new Date(linha.atual.fim_em) < new Date();
                const podeReativar = ["suspenso", "cancelado"].includes(linha.estado) && !vencido && linha.baseAtiva;
                return <TableRow key={linha.usuario.id}>
                  <TableCell><div className="font-medium">{linha.usuario.nome_completo || linha.usuario.full_name || "—"}</div><div className="text-xs text-muted-foreground">{linha.usuario.email}</div></TableCell>
                  <TableCell><Badge variant="outline" className={linha.baseAtiva ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}>{linha.baseAtiva ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={badgeClasse(linha.estado)}>{LABEL_ESTADO[linha.estado]}</Badge></TableCell>
                  <TableCell>{LABEL_MODALIDADE[linha.atual?.modalidade] || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatarDataHora(linha.atual?.inicio_em)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatarDataHora(linha.atual?.fim_em)}</TableCell>
                  <TableCell>{linha.trialUsado ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="w-3.5 h-3.5" /> Já usado</span> : <span className="text-xs text-emerald-700">Disponível</span>}</TableCell>
                  <TableCell className="text-right"><div className="flex justify-end flex-wrap gap-1">
                    {!["ativo", "trial_ativo"].includes(linha.estado) && <Button variant="outline" size="sm" onClick={() => abrirConcessao(linha)} disabled={!linha.baseAtiva}><ShieldCheck className="w-3.5 h-3.5 mr-1" /> Conceder</Button>}
                    {["ativo", "trial_ativo"].includes(linha.estado) && <Button variant="ghost" size="sm" onClick={() => alterarStatus(linha, "suspenso")} disabled={acaoId === `${linha.atual?.id}:suspenso`}><PauseCircle className="w-3.5 h-3.5 mr-1" /> Suspender</Button>}
                    {["ativo", "trial_ativo", "suspenso"].includes(linha.estado) && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => alterarStatus(linha, "cancelado")} disabled={acaoId === `${linha.atual?.id}:cancelado`}><XCircle className="w-3.5 h-3.5 mr-1" /> Cancelar</Button>}
                    {podeReativar && <Button variant="ghost" size="sm" onClick={() => alterarStatus(linha, "ativo")} disabled={acaoId === `${linha.atual?.id}:ativo`}><PlayCircle className="w-3.5 h-3.5 mr-1" /> Reativar</Button>}
                    {linha.historico.length > 0 && <Button variant="ghost" size="sm" onClick={() => setHistoricoDialog(linha)}>Histórico</Button>}
                  </div></TableCell>
                </TableRow>;
              })}
              {linhas.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3 text-sm text-amber-950"><AlertTriangle className="w-5 h-5 shrink-0" /><div><p className="font-medium">Controle administrativo não é checkout</p><p className="mt-1 text-xs">Conceder acesso aqui cria um entitlement administrativo. Não gera Pagamento, não envia cobrança e não altera os planos do Laboratório de Cozinha.</p></div></div>

      <Dialog open={!!historicoDialog} onOpenChange={(v) => !v && setHistoricoDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Histórico de acessos — {historicoDialog?.usuario?.nome_completo || historicoDialog?.usuario?.full_name || historicoDialog?.usuario?.email}</DialogTitle></DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-2">
            {(historicoDialog?.historico || []).map((acesso) => {
              const estado = estadoDoAcesso(acesso);
              return <div key={acesso.id} className="rounded-lg border p-3 grid sm:grid-cols-[1fr_auto] gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={badgeClasse(estado)}>{LABEL_ESTADO[estado]}</Badge><span className="text-sm font-medium">{LABEL_MODALIDADE[acesso.modalidade] || acesso.modalidade || "Sem modalidade"}</span></div>
                  <p className="text-xs text-muted-foreground mt-2">Início: {formatarDataHora(acesso.inicio_em)} · Fim: {formatarDataHora(acesso.fim_em)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Origem: {acesso.origem || "—"}{acesso.observacao ? ` · ${acesso.observacao}` : ""}</p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">Atualizado<br />{formatarDataHora(acesso.updated_date)}</div>
              </div>;
            })}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setHistoricoDialog(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!usuarioDialog} onOpenChange={(v) => !v && setUsuarioDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Conceder Laboratório de Custos</DialogTitle></DialogHeader>
          {usuarioDialog && <div className="space-y-4">
            <div className="rounded-lg border p-3"><p className="font-medium">{usuarioDialog.usuario.nome_completo || usuarioDialog.usuario.full_name || usuarioDialog.usuario.email}</p><p className="text-xs text-muted-foreground mt-1">Laboratório de Cozinha: {usuarioDialog.baseAtiva ? "ativo" : "inativo"} · Trial: {usuarioDialog.trialUsado ? "já utilizado" : "disponível"}</p></div>
            <div className="space-y-1.5"><Label>Modalidade</Label><Select value={modalidadeNova} onValueChange={setModalidadeNova}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="trial" disabled={usuarioDialog.trialUsado}>Trial · 7 dias{usuarioDialog.trialUsado ? " — já utilizado" : ""}</SelectItem><SelectItem value="30_dias">30 dias</SelectItem><SelectItem value="anual">Anual · 365 dias</SelectItem><SelectItem value="cortesia">Cortesia · 30 dias</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Observação administrativa</Label><Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" /></div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2"><Clock3 className="w-4 h-4 shrink-0" /><span>O período começa no momento da concessão. Esta ação não cobra o usuário.</span></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setUsuarioDialog(null)}>Cancelar</Button><Button onClick={conceder} disabled={salvando || !usuarioDialog?.baseAtiva}>{salvando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Conceder acesso</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
