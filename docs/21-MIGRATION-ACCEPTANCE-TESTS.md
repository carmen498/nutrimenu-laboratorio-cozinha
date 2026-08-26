# 21 — Testes de equivalência

## Cenários Given/When/Then
1. **Auth:** Given usuário válido, When login senha/Google/OTP/reset/logout, Then sessão/redirect/erros equivalentes; usuário inativo negado.
2. **RLS:** Given usuários A/B, When A consulta/altera IDs de B, Then 403/404 e zero alteração.
3. **Receita:** Given catálogo, When user edita, Then cria fork próprio, base intacta; ingredientes/custos/linhagem persistem.
4. **Escala:** Given fixture de receita, When escala porções, Then quantidades, FC, medidas, custo e arredondamento batem.
5. **Sub-receita:** Given árvore e ciclo, When calcula/sincroniza, Then árvore válida igual e ciclo rejeitado.
6. **Cardápio/evento:** Given receitas, When monta/escala/exporta, Then totais, compras e PDFs equivalem.
7. **Custos:** Given golden fixture, When finaliza/recalcula, Then composição fecha centavo a centavo, versão imutável e concorrência 409.
8. **Upload:** Given arquivos válidos/inválidos, When upload/download, Then checksum/ACL/tamanho/erro equivalem.
9. **Pagamento:** Given sandbox, When PIX/cartão aprovado/recusado/pendente/estornado, Then Pagamento/User/logs/notificações corretos e sem duplicidade.
10. **Webhook:** Given payload assinado/inválido/repetido/fora de ordem, When recebe, Then códigos e efeitos idempotentes.
11. **Jobs:** Given datas-alvo, When scheduler roda/retry, Then audiência correta, dedupe e logs; concorrência não duplica.
12. **Admin:** Given admin/user, When acessa/edita configs/campanha, Then somente admin e dados persistidos.
13. **Falha:** Given terceiro indisponível, When operação ocorre, Then estado consistente, erro observável e retry seguro.

## Matriz de evidência
| Funcionalidade | Atual | Novo | Equivalente? | Evidência |
|---|---|---|---|---|
| Auth/RLS | baseline gravado | execução | pendente | relatório + logs |
| Receitas/cardápios | fixtures/export | execução | pendente | JSON/checksum/screenshots |
| Custos | golden outputs | execução | pendente | diff numérico |
| Storage | manifest | manifest | pendente | SHA-256/ACL |
| Pagamento/webhook | sandbox fixtures | sandbox | pendente | IDs/logs |
| Jobs/comunicação | audiência dry-run | dry-run | pendente | run IDs/dedupe |

Executar feliz, erro, autorização, persistência, concorrência e recuperação. Nenhum teste pode usar ou apagar dados alheios.