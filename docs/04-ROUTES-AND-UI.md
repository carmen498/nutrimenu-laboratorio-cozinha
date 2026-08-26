# 04 — Rotas e UI

## Públicas
| Rota | Página | Dados/ações/estados |
|---|---|---|
| `/` | LandingOrRedirect | landing ou redirect `/app`; loading auth |
| `/login` | Login | senha/Google; `returnTo`; erro/loading |
| `/register` | Register | perfil, termos, OTP, resend, trial |
| `/forgot-password` | ForgotPassword | solicitação genérica |
| `/reset-password?token=` | ResetPassword | token sanitizado em sessionStorage |
| `/termos`, `/privacidade`, `/aceitar-termos` | legais | aceite protegido no último caso |
| `/sobre`, `/contato`, `/produto` | públicas | conteúdo/contato/produto |

## Protegidas em `AppLayout`
`/app`, `/receitas`, `/minhas-receitas`, `/receita/:id`, `/cardapios`, `/meus-cardapios`, `/cardapio/:id`, `/cardapio/:id/{ficha,orcamento,pre-preparos,ficha-custos,receitas}`, `/ingredientes`, `/meus-ingredientes`, `/ingrediente/:id`, `/ingrediente/:id/dossie`, `/lista-compras`, `/receita/:id/lista-compras`, `/exportar/:id`, `/ficha-tecnica/:id`, `/ficha-custos-receita/:id`, `/percapita`, `/relatorio-categorias`, `/medidas-caseiras`, `/insumos-embalagens`, `/configuracoes`, `/historico`, `/suporte`, `/sobre-carmen`, `/conta`, `/planos`, `/dicas-carmen`, `/dicas-carmen/:id`, `/relatorio-receitas-pdf`, `/planejamento/:id/{pre-preparos,dossie,orcamento}`, `/custos/adicionar-ao-plano`.

## Admin
`/admin/comunicacao`, `/dicas-carmen/nova`, `/auditoria-rendimento`, `/auditoria-receitas`, `/auditorias`; `/admin/usuarios` redireciona à comunicação. `AdminRoute` + checks locais.

## Custos
`CustosRoute` + `CustosLayout`: `/custos`, `/custos/despesas`, `/custos/calcular`, `/custos/ficha/:id`, `/custos/historico`, `/custos/configuracoes`.

## Aliases/404
`/Home`→`/app`; `/MinhasReceitas`→`/minhas-receitas`; `/SobrePublico`→`/sobre`; `/CustosBloqueado`→rota canônica; `/landing`→`/`; wildcard `PageNotFound`.

## Componentes e modais relevantes
- Layout: TopBar, Sidebar, HelpPanel, RouteFallback.
- Receitas: criação manual/IA, importação lote/texto/CSV, edição, ingredientes, escala, tags, medidas, sub-receitas.
- Cardápios/eventos: novo planejamento, etapas, referências, relatórios.
- Custos: adicionar despesa, formação de preço, ficha/recálculo.
- Comercial: CheckoutDialog, CartaoForm, PixForm.
- Admin: templates, plano, campanha/confirmacão, usuários/filtros.

## Query strings confirmadas
`/receitas?nova=manual|ia`, `?revisar=true`; `/reset-password?token=`; auth `returnTo/from_url/access_token`; relatórios por `?categoria=`. Outras devem ser extraídas por busca automatizada antes do freeze (**AÇÃO NECESSÁRIA**).

## Loading/vazio/erro/responsivo
- React Query e spinners/skeletons locais; RouteFallback oferece recuperação após 15 s.
- Listas possuem estados vazios; erros variam por tela (toast/inline/log seguro).
- Tailwind mobile-first; Sidebar vira menu; tabelas usam scroll horizontal em partes. **PARTIAL:** matriz visual por breakpoint não executada para toda rota.

Fonte principal: `src/App.jsx`; implementação: arquivos homônimos em `src/pages` e imports.