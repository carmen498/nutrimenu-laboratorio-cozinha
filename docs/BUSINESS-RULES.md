# Regras de Negócio — Laboratório de Cozinha

> Fonte técnica central das regras funcionais do produto. Em caso de divergência, a implementação vigente e os esquemas das entidades devem ser auditados; a divergência precisa ser registrada e este documento atualizado.

## Sumário executivo

O Laboratório de Cozinha separa catálogo compartilhado e dados pessoais, calcula quantidades a partir de rendimento e per capita, resolve preços conforme o proprietário e mantém custos derivados por um motor canônico versionado. Receitas e cardápios do catálogo são preservados por **fork-on-edit**; sub-receitas são referências, e não cópias independentes. Listas e documentos comerciais derivam desses dados sem transformar caches em fonte de verdade.

## Conteúdo

| Seção | Documento | Assuntos principais |
|---|---|---|
| 1 | [Receitas](business-rules/01-receitas.md) | Escala, rendimento, categorias, sub-receitas, linhagem, cache e tags |
| 2 | [Ingredientes](business-rules/02-ingredientes.md) | Mestre/pessoal, preço, FC, medidas, sinônimos e curadoria |
| 3 | [Cardápios](business-rules/03-cardapios.md) | Tipos, escala, receitas, insumos, fork, custo e venda |
| 4 | [Motor de Custos Canônico](business-rules/04-motor-custos.md) | Composição, contexto, invalidação, assinatura e versão |
| 5 | [Planejamento e Eventos](business-rules/05-planejamento-eventos.md) | Público, produção, orçamento, pré-preparos, doces e bebidas |
| 6 | [Listas de Compras e Carrinho](business-rules/06-compras-carrinho.md) | Geração, explosão, agregação, persistência e edição |

## Convenções

- `Entidade.campo`: campo persistido em `base44/entities/Entidade.jsonc`.
- **Fonte de verdade**: dado autoritativo que deve prevalecer sobre caches.
- **Cache**: valor derivado para desempenho ou compatibilidade; pode ser invalidado.
- Fórmulas usam valores não negativos e unidades compatíveis; dinheiro é expresso em R$.
- `id`, `created_date`, `updated_date` e `created_by_id` são atributos nativos.
- Dados pessoais devem respeitar proprietário e RLS; filhos espelham `is_base` e `usuario_dono_id` do pai.

## Glossário

| Termo | Definição |
|---|---|
| **PL / peso líquido** | Quantidade efetivamente usada antes do preparo. |
| **PB / peso bruto** | Quantidade de compra: `PL × FC`. |
| **PPP** | Peso pré-preparo total, imediatamente antes da cocção. |
| **PDP** | Peso pós-preparo total; rendimento técnico canônico do produto pronto. |
| **FC** | Fator de correção de compra; normalmente `PB / PL`. |
| **Per capita (PC)** | Quantidade pronta prevista por pessoa/unidade. |
| **Fork-on-edit** | Criação de cópia pessoal antes de editar item do catálogo. |
| **Linhagem** | Relação estável entre receita raiz, origem e gerações derivadas. |
| **Contexto de preço** | Conjunto de preços globais ou pessoais usado no cálculo. |
| **Assinatura de cache** | Identificador determinístico dos dados que produziram um custo. |
| **Invalidação em cascata** | Marcação de todas as receitas dependentes para recálculo. |

## Princípios transversais

1. Autorização é aplicada no backend/RLS, nunca apenas pela interface.
2. Cálculos ao vivo prevalecem sobre `custo_total`, `custo_por_porcao` e caches equivalentes.
3. Identidade relacional usa IDs; campos de nome em relações são caches de exibição.
4. Alterações em composição, preço, FC, rendimento, insumos ou sub-receitas invalidam custos dependentes.
5. Registros legados são lidos com compatibilidade, mas novas gravações usam campos canônicos e versões atuais.
6. Falta de referência, rendimento ou preço não deve ser silenciosa: o resultado é marcado incompleto ou pendente.

## Mapa de referências

- Visão funcional: [03-FEATURE-CATALOG.md](03-FEATURE-CATALOG.md)
- Banco e RLS: [06-DATABASE.md](06-DATABASE.md)
- Autenticação e autorização: [08-AUTHENTICATION-AND-AUTHORIZATION.md](08-AUTHENTICATION-AND-AUTHORIZATION.md)
- APIs e funções: [05-API-REFERENCE.md](05-API-REFERENCE.md)
- Jobs: [12-JOBS-AND-AUTOMATIONS.md](12-JOBS-AND-AUTOMATIONS.md)
- Integrações: [10-EXTERNAL-INTEGRATIONS.md](10-EXTERNAL-INTEGRATIONS.md)
- Segurança: [26-SECURITY.md](26-SECURITY.md)
- Problemas conhecidos: [30-TROUBLESHOOTING.md](30-TROUBLESHOOTING.md)