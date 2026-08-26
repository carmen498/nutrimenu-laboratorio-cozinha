# 03 — Catálogo funcional

> Cada linha segue: objetivo; acesso; entrada; dados/APIs; regras/estados; critério de migração. Detalhes de rotas em `04`, APIs em `05`, dados em `06`.

| Funcionalidade | Acesso/entrada | Dados e integrações | Regras/estados/erros | Critério de equivalência |
|---|---|---|---|---|
| Landing/produto/legal/contato | público `/`, `/produto`, `/termos`, `/privacidade`, `/sobre`, `/contato` | Configuração pública | autenticado redireciona `/app` | conteúdo, SEO e redirects iguais |
| Auth/cadastro | público `/login`, `/register` | Base44 Auth, User, trial/termos functions | senha forte, OTP, Google, cooldown; erros inline | login/OTP/OAuth/reset e returnTo aprovados |
| Assinatura/gate | user | User, Pagamento, ConfiguracaoPlano | trial/ativo/vencido/inativo/admin bypass | matriz de acesso idêntica |
| Receitas | user/admin `/receitas` | Receita, IngredienteReceita, tags, insumos | catálogo, propriedade, fork, categorias, favoritos | CRUD/fork/filtros/custos sem divergência |
| Importação IA/CSV | user/admin | Core IA/File, funções analisar/importar | normalização, duplicidade, revisão | amostra e totais reconciliados |
| Ingredientes/preços | user/admin | Ingrediente, IngredienteUsuario, preços, medidas | mestre global vs preferências pessoais | isolamento e cálculo por g iguais |
| Sub-receitas/rendimento | user/admin | Receita/IngredienteReceita | ciclos, cache, assinatura, PDP/PPP | árvores e custos equivalentes |
| Cardápios/eventos | user/admin | Cardapio, filhos, Planejamento | fork/dono, escala, dias/refeições | CRUD, escalas e relatórios iguais |
| Compras/carrinho | user | CarrinhoItem, ListaCompras | explosão de receita e agregação | quantidades e PDF/CSV iguais |
| Per capita/medidas | user/admin | PerCapitaUsuario, MedidaCaseira | override e conversões | valores e arredondamentos iguais |
| Laboratório de custos | assinante autorizado | Configuracao/Despesa/Calculo/Itens | composição fecha; snapshots; versões; acesso add-on | golden tests centavo a centavo |
| PDFs/exports | user | dados carregados, jsPDF/html2canvas | impressão/arquivos | comparação de conteúdo e totais |
| Checkout | user `/planos` | Pagamento, Mercado Pago | preço servidor, legal, idempotência, device ID | cartão/PIX sandbox e produção certificados |
| Webhook pagamento | público assinado | Mercado Pago, Pagamento/User/logs | HMAC, refetch, idempotência, estorno | replay/erro/aprovação certificados |
| Comunicação transacional | admin/jobs | TemplateEmail/Wascript, Resend/Wascript | ativo/rascunho, dedupe/log | entrega e logs equivalentes |
| Campanhas | admin | User, Resend | exclui inativos, teste, confirmação | audiência e contagem reconciliadas |
| Administração | admin `/admin/comunicacao` | User/Pagamento/configs/logs | filtros, ativar/inativar, planos/templates | permissões e ações auditadas |
| Dicas Carmen | público/user/admin | DicaCarmen/ConfigCarmen/storage | rascunho/publicado/destaque | publicação e mídia equivalentes |
| Jobs | plataforma | funções de trial/plano/preço/pendência | horários, dedupe, toggle | execuções observadas por 2 ciclos |
| Auditorias/curadorias | admin | entidades de log/curadoria/functions | dry-run/saneamento/preflight | relatórios e correções idempotentes |
| Retenção/segurança | admin/job | logs e policies | minimização e RLS | testes negativos e retenção passam |

## Regras transversais
Autorização deve ser aplicada no backend, não só na UI; entidades pessoais preservam `usuario_dono_id`/`user_id`; itens filhos espelham escopo; datas comerciais usam São Paulo; dinheiro exige tolerância explícita; operações externas não podem duplicar efeitos.

Erros conhecidos: ver `30-TROUBLESHOOTING.md`. Fontes: `src/App.jsx`, `src/pages/*`, `src/lib/*`, `base44/entities/*`, `base44/functions/*`.