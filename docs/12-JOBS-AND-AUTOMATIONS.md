# 12 — Jobs e automações

Inventário da plataforma em 2026-08-26:
| Nome | Trigger (UTC cadastrado/observado) | Função | Estado |
|---|---|---|---|
| Lembrete pagamento pendente | diário 11:15 | `enviarLembretePendencia` | ativo; último sucesso |
| Plano perto de vencer | diário 08:10 na automação consultada | `enviarPlanoVencendo` | ativo; último sucesso |
| Trial expirando | diário 08:00 | `enviarTrialExpirando` | ativo; último sucesso |
| Trial vencido | diário 08:05 | `enviarTrialVencido` | ativo; último sucesso |
| Atualização Semanal de Preços | seg 06:00, dia 1 | `atualizarPrecosAutomatico` | ativo; último sucesso |
| Atualização automática de preços | seg 06:00 | mesma | inativo duplicado |
| Histórico Receita | update Receita | `registrarHistoricoReceita` | arquivado/inativo |
| Histórico ingredientes | C/U/D IngredienteReceita | idem | arquivado/inativo |

**Divergência confirmada:** horários em `function.jsonc` diferem de alguns registros consultados (`enviarPlanoVencendo`, trial). A plataforma cadastrada é operacionalmente efetiva; reconciliar antes da migração.

## Contrato operacional
Entradas scheduled não documentadas; funções consultam User/Pagamento/Ingrediente/configs, enviam comunicação e escrevem logs/flags. Dedupe confirmado em campos/logs para várias mensagens. Lock, concorrência, timeout e retry globais: **NÃO ENCONTRADO**.

## Recriar fora do Base44
Scheduler timezone-aware + fila; execução singleton/idempotente; retries exponenciais e DLQ; métricas início/fim/duração/sucesso; alertas; run ID; secrets; teste manual seguro. Não ativar no destino enquanto jobs atuais estiverem ativos, salvo shadow sem side effects.