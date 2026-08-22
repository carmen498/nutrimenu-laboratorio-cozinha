import json
from pathlib import Path

files = [
    ('IngredienteReceita', 'receita'),
    ('ReceitaTag', 'receita'),
    ('InsumoReceita', 'receita'),
    ('IngredienteEsquecidoReceita', 'receita'),
    ('CardapioReceita', 'cardapio'),
    ('CardapioInsumo', 'cardapio'),
    ('CardapioTag', 'cardapio'),
]

rls = {
    'create': {
        '$or': [
            {'user_condition': {'role': 'admin'}},
            {
                '$and': [
                    {'data.is_base': False},
                    {'data.usuario_dono_id': '{{user.id}}'},
                ]
            },
        ]
    },
    'read': {
        '$or': [
            {'data.is_base': True},
            {'data.usuario_dono_id': '{{user.id}}'},
            {'user_condition': {'role': 'admin'}},
        ]
    },
    'update': {
        '$or': [
            {'data.usuario_dono_id': '{{user.id}}'},
            {'user_condition': {'role': 'admin'}},
        ]
    },
    'delete': {
        '$or': [
            {'data.usuario_dono_id': '{{user.id}}'},
            {'user_condition': {'role': 'admin'}},
        ]
    },
}

for name, parent in files:
    path = Path(f'base44/entities/{name}.jsonc')
    data = json.loads(path.read_text())
    parent_label = 'receita' if parent == 'receita' else 'cardápio'
    data['properties']['is_base'] = {
        'type': 'boolean',
        'description': f'Espelha se o {parent_label}-pai pertence ao catálogo-base compartilhado',
    }
    data['properties']['usuario_dono_id'] = {
        'type': 'string',
        'description': f'ID do usuário dono quando o {parent_label}-pai é uma cópia pessoal',
    }
    data['rls'] = rls
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'updated {path}')
