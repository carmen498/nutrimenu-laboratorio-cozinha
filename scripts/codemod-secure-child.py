from pathlib import Path

root = Path('src')
repls = {
    'base44.entities.IngredienteReceita.create(': 'criarIngredienteReceita(',
    'base44.entities.ReceitaTag.create(': 'criarReceitaTag(',
    'base44.entities.InsumoReceita.create(': 'criarInsumoReceita(',
    'base44.entities.IngredienteEsquecidoReceita.create(': 'criarIngredienteEsquecidoReceita(',
    'base44.entities.CardapioReceita.create(': 'criarCardapioReceita(',
    'base44.entities.CardapioInsumo.create(': 'criarCardapioInsumo(',
    'base44.entities.CardapioTag.create(': 'criarCardapioTag(',
}

changed = []
for p in root.rglob('*'):
    if p.suffix not in {'.js', '.jsx', '.ts', '.tsx'}:
        continue
    text = p.read_text()
    new = text
    funcs = []
    for old, rep in repls.items():
        if old in new:
            new = new.replace(old, rep)
            funcs.append(rep[:-1])
    if not funcs:
        continue
    funcs = sorted(set(funcs))
    if "@/lib/secureChildEntities" not in new:
        imp = "import { " + ", ".join(funcs) + " } from '@/lib/secureChildEntities';\n"
        new = imp + new
    p.write_text(new)
    changed.append((str(p), funcs))

print(f'changed={len(changed)}')
for path, funcs in changed:
    print(path, ','.join(funcs))
