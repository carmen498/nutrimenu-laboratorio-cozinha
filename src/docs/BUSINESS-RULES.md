# Regras de Negócio — Laboratório de Cozinha

> Fonte técnica central das regras funcionais do produto. A implementação vigente e os esquemas das entidades devem permanecer alinhados a este documento.

## Sumário executivo

O Laboratório de Cozinha separa catálogo compartilhado e dados pessoais, calcula quantidades a partir de rendimento e per capita, resolve preços conforme o proprietário e mantém custos derivados por um motor canônico versionado. Receitas e cardápios do catálogo são preservados por **fork-on-edit**; sub-receitas são referências, não cópias independentes. Listas e documentos comerciais derivam desses dados sem transformar caches em fonte de verdade.

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
- **Fonte de verdade**: dado autoritativo que prevalece sobre caches.
- **Cache**: valor derivado para desempenho ou compatibilidade.
- Fórmulas usam valores não negativos e unidades compatíveis; dinheiro é expresso em R$.
- `id`, `created_date`, `updated_date` e `created_by_id` são atributos nativos.
- Dados pessoais respeitam proprietário e RLS; filhos espelham `is_base` e `usuario_dono_id` do pai.

## Glossário

| Termo | Definição |
|---|---|
| **PL** | Peso líquido efetivamente usado antes do preparo. |
| **PB** | Peso de compra: `PL × FC`. |
| **PPP** | Peso pré-preparo total, imediatamente antes da cocção. |
| **PDP** | Peso pós-preparo total; rendimento técnico canônico. |
| **FC** | Fator de correção de compra; normalmente `PB / PL`. |
| **PC** | Per capita: quantidade pronta prevista por pessoa/unidade. |
| **Fork-on-edit** | Criação de cópia pessoal antes de editar item do catálogo. |
| **Linhagem** | Relação entre receita raiz, origem e gerações derivadas. |
| **Contexto de preço** | Preços globais ou pessoais usados no cálculo. |
| **Assinatura de cache** | Identificador determinístico dos dados que produziram o custo. |
| **Invalidação em cascata** | Marcação das receitas dependentes para recálculo. |

## Princípios transversais

1. Autorização é aplicada no backend/RLS, nunca apenas na interface.
2. Cálculos ao vivo prevalecem sobre caches persistidos.
3. Relações usam IDs como identidade; nomes são caches de exibição.
4. Mudanças de composição, preço, FC, rendimento, insumos ou sub-receitas invalidam custos dependentes.
5. Registros legados têm leitura compatível; novas gravações usam campos canônicos e versões atuais.
6. Falta de referência, rendimento ou preço produz estado incompleto/pendente, nunca sucesso silencioso.

## Mapa de referências

- [Catálogo funcional](03-FEATURE-CATALOG.md)
- [Banco e RLS](06-DATABASE.md)
- [Autenticação e autorização](08-AUTHENTICATION-AND-AUTHORIZATION.md)
- [APIs e funções](05-API-REFERENCE.md)
- [Jobs e automações](12-JOBS-AND-AUTOMATIONS.md)
- [Integrações externas](10-EXTERNAL-INTEGRATIONS.md)
- [Segurança](26-SECURITY.md)
- [Problemas conhecidos](30-TROUBLESHOOTING.md)