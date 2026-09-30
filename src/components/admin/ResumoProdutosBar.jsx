import { useMemo } from "react";
import { ORIGEM_CADASTRO_LABEL } from "@/lib/statusAssinaturaUsuario";

// Ordem estável dos produtos para exibição. "nao_informado" aparece por último.
const ORDEM_PRODUTOS = ["laboratorio_cozinha", "guia_zr", "nao_informado"];

export default function ResumoProdutosBar({ usuariosFiltrados }) {
  const contagem = useMemo(() => {
    const counts = {};
    usuariosFiltrados.forEach((u) => {
      const p = u.origem_cadastro || "nao_informado";
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [usuariosFiltrados]);

  const total = usuariosFiltrados.length;
  const produtos = ORDEM_PRODUTOS.filter((p) => contagem[p] > 0 || p === "nao_informado");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Usuários por produto (filtros ativos):</span>
      {produtos.map((p) => (
        <span key={p} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs">
          <span className="font-medium">{ORIGEM_CADASTRO_LABEL[p] || p}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-semibold">{contagem[p] || 0}</span>
        </span>
      ))}
      <span className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs">
        <span className="font-medium">Total</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-semibold">{total}</span>
      </span>
    </div>
  );
}