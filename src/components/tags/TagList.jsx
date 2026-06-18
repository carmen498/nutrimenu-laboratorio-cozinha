import { useState } from "react";
import TagBadge from "@/components/tags/TagBadge";

// Ordem de exibição: menor = primeiro
const ORDEM_GRUPO = {
  perfil: 0,
  metodo: 1,
  contexto: 2,
  ingrediente: 3,
  molho: 4,
  outras: 5,
  restricao: 6,
};

const MAX_RESTRICOES = 3;

export default function TagList({ receitaTags = [], allTags = [], onRemove }) {
  const [showAllRestricoes, setShowAllRestricoes] = useState(false);

  // Enriquecer com dados da tag e agrupar
  const enriched = receitaTags
    .map(rt => {
      const tag = allTags.find(t => t.id === rt.tag_id);
      return tag ? { ...rt, grupo: rt.tag_grupo || tag.grupo, cor: rt.tag_cor || tag.cor, nome: tag.nome } : null;
    })
    .filter(Boolean);

  // Ordenar por grupo
  const sorted = [...enriched].sort((a, b) => {
    const oa = ORDEM_GRUPO[a.grupo] ?? 99;
    const ob = ORDEM_GRUPO[b.grupo] ?? 99;
    return oa - ob;
  });

  // Separar restrições das demais
  const naoRestricoes = sorted.filter(t => t.grupo !== "restricao");
  const restricoes = sorted.filter(t => t.grupo === "restricao");

  const collapsed = restricoes.length > MAX_RESTRICOES && !showAllRestricoes;
  const visibleRestricoes = collapsed ? restricoes.slice(0, MAX_RESTRICOES) : restricoes;
  const hiddenCount = restricoes.length - MAX_RESTRICOES;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {naoRestricoes.map((rt) => (
        <TagBadge
          key={rt.id}
          nome={rt.nome}
          cor={rt.cor}
          grupo={rt.grupo}
          onClick={onRemove ? () => onRemove(rt) : undefined}
        />
      ))}
      {visibleRestricoes.map((rt) => (
        <TagBadge
          key={rt.id}
          nome={rt.nome}
          cor={rt.cor}
          grupo={rt.grupo}
          onClick={onRemove ? () => onRemove(rt) : undefined}
        />
      ))}
      {collapsed && (
        <button
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => setShowAllRestricoes(true)}
        >
          +{hiddenCount} mais
        </button>
      )}
    </div>
  );
}