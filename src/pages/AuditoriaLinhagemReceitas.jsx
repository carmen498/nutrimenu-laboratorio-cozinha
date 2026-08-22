import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, GitBranch, Loader2, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { fetchAllPages } from "@/lib/fetchAllPages";
import {
  diagnosticarLinhagemReceita,
  resolverReceitaRaizId,
  resolverDonoReceitaId,
} from "@/lib/receitaLineage";

const PROBLEMA_LABEL = {
  origens_conflitantes: "origens conflitantes",
  auto_referencia: "auto-referência",
  base_com_dono: "catálogo com dono",
  pessoal_sem_dono: "pessoal sem dono",
  dono_apenas_created_by: "dono só no legado",
  raiz_ausente: "raiz ausente",
  modelo_legado: "modelo legado",
  tipo_ausente: "tipo ausente",
  ciclo: "ciclo",
  origem_ausente: "origem ausente",
  raiz_incorreta: "raiz incorreta",
  geracao_incorreta: "geração incorreta",
  personalizacao_duplicada: "mais de uma personalização do mesmo catálogo",
};

export default function AuditoriaLinhagemReceitas() {
  const qc = useQueryClient();
  const [normalizando, setNormalizando] = useState(false);

  const { data: receitas = [], isLoading } = useQuery({
    queryKey: ["auditoria-linhagem-receitas"],
    queryFn: () => fetchAllPages(base44.entities.Receita, "created_date"),
    staleTime: 0,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["auditoria-linhagem-receitas-logs"],
    queryFn: () => base44.entities.NormalizacaoLinhagemReceitaLog.list("-executado_em", 20),
    staleTime: 30 * 1000,
  });

  const diagnostico = useMemo(() => {
    const map = Object.fromEntries(receitas.map((r) => [r.id, r]));
    const rowsBase = receitas.map((receita) => ({
      receita,
      ...diagnosticarLinhagemReceita(receita, map),
    }));

    const personalizacoesPorChave = new Map();
    for (const row of rowsBase) {
      const r = row.receita;
      const tipo = r.linhagem_tipo || ((r.receita_origem_id || r.forked_from_id) ? "personalizacao" : "");
      if (tipo !== "personalizacao") continue;
      const dono = resolverDonoReceitaId(r);
      const raiz = row.raizCalculadaId || resolverReceitaRaizId(r);
      if (!dono || !raiz) continue;
      const chave = `${dono}|${raiz}`;
      if (!personalizacoesPorChave.has(chave)) personalizacoesPorChave.set(chave, []);
      personalizacoesPorChave.get(chave).push(r.id);
    }

    const rows = rowsBase.map((row) => {
      const r = row.receita;
      const tipo = r.linhagem_tipo || ((r.receita_origem_id || r.forked_from_id) ? "personalizacao" : "");
      const dono = resolverDonoReceitaId(r);
      const raiz = row.raizCalculadaId || resolverReceitaRaizId(r);
      const chave = `${dono}|${raiz}`;
      const duplicada = tipo === "personalizacao" && dono && raiz && (personalizacoesPorChave.get(chave)?.length || 0) > 1;
      const problemas = duplicada
        ? [...new Set([...row.problemas, "personalizacao_duplicada"])]
        : row.problemas;
      const status = problemas.length > 0 && row.status === "canonica" ? "a_validar" : row.status;
      return { ...row, problemas, status };
    });

    const pendentes = rows.filter((r) => r.problemas.length > 0);
    return {
      rows,
      pendentes,
      total: rows.length,
      canonicas: rows.filter((r) => r.problemas.length === 0).length,
      pessoais: rows.filter((r) => r.receita.is_base === false || !!r.receita.usuario_dono_id).length,
      legado: rows.filter((r) => r.problemas.includes("modelo_legado") || r.problemas.includes("dono_apenas_created_by")).length,
      conflitos: rows.filter((r) => r.status === "a_validar").length,
      erros: rows.filter((r) => ["ciclo", "origem_ausente"].includes(r.status)).length,
      duplicadas: rows.filter((r) => r.problemas.includes("personalizacao_duplicada")).length,
    };
  }, [receitas]);

  const normalizar = async () => {
    setNormalizando(true);
    try {
      const res = await base44.functions.invoke("normalizarLinhagemReceitas", {});
      const dados = res?.data || {};
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["auditoria-linhagem-receitas"] }),
        qc.invalidateQueries({ queryKey: ["auditoria-linhagem-receitas-logs"] }),
        qc.invalidateQueries({ queryKey: ["receitas"] }),
        qc.invalidateQueries({ queryKey: ["minhas-receitas"] }),
      ]);
      toast.success(`${dados.normalizadas || 0} receita(s) normalizada(s); ${dados.a_revisar || 0} para revisão.`);
    } catch (error) {
      toast.error("Erro ao normalizar linhagem: " + (error?.message || "erro desconhecido"));
    } finally {
      setNormalizando(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Receitas · Propriedade e Linhagem</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Fase 9: audita catálogo x receita pessoal, proprietário, origem imediata, raiz da linhagem e geração. Registros ambíguos são preservados para revisão.
          </p>
        </div>
        <Button onClick={normalizar} disabled={normalizando} className="gap-2">
          {normalizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Normalizar casos seguros
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Receitas</p><p className="text-xl font-bold">{diagnostico.total}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Canônicas</p><p className="text-xl font-bold text-primary">{diagnostico.canonicas}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Pessoais</p><p className="text-xl font-bold">{diagnostico.pessoais}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Legado</p><p className="text-xl font-bold text-amber-600">{diagnostico.legado}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Conflitos</p><p className="text-xl font-bold text-amber-700">{diagnostico.conflitos}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Erros</p><p className="text-xl font-bold text-destructive">{diagnostico.erros}</p></Card>
      </div>

      {diagnostico.duplicadas > 0 && (
        <Card className="p-4 border-amber-400/50 bg-amber-50/50">
          <p className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {diagnostico.duplicadas} registro(s) pertencem a grupos com personalizações duplicadas.</p>
          <p className="text-xs text-muted-foreground mt-1">Esses casos não são excluídos nem fundidos automaticamente.</p>
        </Card>
      )}

      {diagnostico.pendentes.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-2" />
          <p>Todas as receitas estão com propriedade e linhagem canônicas.</p>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_100px_1fr_90px_2fr] gap-2 px-3 py-2 bg-secondary/50 text-[10px] uppercase font-semibold text-muted-foreground">
            <div>Receita</div><div>Escopo</div><div>Origem/Raiz</div><div>Geração</div><div>Diagnóstico</div>
          </div>
          {diagnostico.pendentes.slice(0, 300).map((row) => (
            <div key={row.receita.id} className="grid md:grid-cols-[1.4fr_100px_1fr_90px_2fr] gap-2 px-3 py-2.5 border-t items-center text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate" title={row.receita.nome}>{row.receita.nome}</p>
                {row.donoId && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {row.donoId}</p>}
              </div>
              <div><Badge variant="outline" className="text-[10px]">{row.receita.is_base === false ? "Pessoal" : "Catálogo"}</Badge></div>
              <div className="min-w-0 text-xs">
                <p className="truncate" title={row.origemId || "raiz"}>Origem: {row.origemId || "—"}</p>
                <p className="truncate text-muted-foreground" title={row.raizCalculadaId || row.receita.receita_raiz_id || ""}>Raiz: {row.raizCalculadaId || row.receita.receita_raiz_id || "—"}</p>
              </div>
              <div className="text-xs">{row.geracaoCalculada ?? "—"}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1">
                  {row.problemas.map((p) => <Badge key={p} variant="secondary" className="text-[10px]">{PROBLEMA_LABEL[p] || p}</Badge>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><GitBranch className="w-4 h-4" /> Histórico recente</h3>
          <div className="space-y-1.5 text-xs">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex flex-wrap gap-x-3 gap-y-1 border-t first:border-0 pt-1.5 first:pt-0">
                <span className="font-medium">{log.normalizadas || 0} normalizada(s)</span>
                <span>{log.a_revisar || 0} a revisar</span>
                <span>{log.ciclos || 0} ciclo(s)</span>
                <span className="text-muted-foreground">{log.executado_em ? new Date(log.executado_em).toLocaleString("pt-BR") : ""}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
