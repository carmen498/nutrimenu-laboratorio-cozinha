# 35 — Auditoria de documentação

## Cobertura encontrada
- Árvore de frontend, rotas, componentes, entidades, funções, shared modules, scripts, configs e documentos foi inventariada.
- Contratos críticos de auth, pagamento/webhook, custos, comunicação e jobs foram rastreados.
- 8 automações foram consultadas diretamente na plataforma.
- Secrets foram nomeados sem valores; dados pessoais não foram copiados.

## Itens sem documentação completa
- Contrato linha a linha de todas as 53 funções e de centenas de componentes.
- Dicionário coluna-a-coluna de todas as entidades menores/probes/logs.
- Hosts externos obtidos por busca AST; todas query strings; matriz visual de todas telas.
- DDL/índices/FKs físicos, volumes, storage e settings internos Base44.
- Configuração nos dashboards Mercado Pago/Resend/Wascript/OAuth/DNS.

## Dependências ainda desconhecidas
Engine DB, backups/restore, sessão/refresh, rate limits, CORS, região, quotas, SLAs, exportabilidade auth/storage e observabilidade interna.

## Bloqueadores
Todos os itens “sim” em `32`, especialmente auth, export de dados/storage, DDL/backup, DNS e fonte de verdade das automações.

## Riscos residuais
IA/Core, dados legados, comportamento implícito Base44, callbacks absolutos, truncamento em funções ainda limitadas e diferenças entre código versionado e configuração ativa.

## Confiança na completude
**MEDIUM** para mapa arquitetural, rotas, domínios e dependências críticas; **LOW** para reprodução integral pronta para execução, pois informações gerenciadas pela plataforma e contratos exaustivos não estão disponíveis no repositório. O Manifest marca documentos `PARTIAL/BLOCKED`; não há conclusão silenciosa.

## Segunda passagem
Comparados `src/App.jsx`, inventário de arquivos, entities, functions, package/config, secrets names e automações. Ação necessária: executar análise AST/schema automatizada e obter exports oficiais para elevar a HIGH.