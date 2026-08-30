export default function IngredientSearchGroups({ ingredients, onSelect, compact = false }) {
  const groups = [];
  const byCategory = new Map();

  ingredients.forEach((ingredient) => {
    const category = ingredient.categoria?.trim() || "Sem categoria";
    if (!byCategory.has(category)) {
      const group = { category, items: [] };
      byCategory.set(category, group);
      groups.push(group);
    }
    byCategory.get(category).items.push(ingredient);
  });

  return groups.map((group) => (
    <section key={group.category}>
      <p className="sticky top-0 z-10 bg-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {group.category}
      </p>
      {group.items.map((ingredient) => (
        <button
          type="button"
          key={ingredient.id}
          className={`w-full text-left hover:bg-accent transition-colors ${compact ? "px-3 py-1.5 text-sm" : "px-3 py-2 rounded-lg text-sm"}`}
          onClick={() => onSelect(ingredient)}
        >
          <span className="font-medium">{ingredient.nome}</span>
        </button>
      ))}
    </section>
  ));
}