# Fase 10 — Homologação real Usuário A × Usuário B

Data: 23/08/2026
App: Laboratório de Cozinha
App ID: `6a2b263c4c1cb1e47d54d8b7`
Run ID: `1787495541802-9cece0`

## Objetivo

Comprovar, no backend real de produção, que dois usuários comuns autenticados em sessões independentes não conseguem enumerar, ler, alterar ou excluir dados privados um do outro.

A homologação não se limita a interpretar os schemas de RLS: foram criadas duas contas reais com OTP, emitidos dois tokens de sessão independentes e executadas chamadas reais com o SDK Base44.

## Preparação

Foram criados dois usuários sintéticos:

- `FASE10 USUARIO A`
- `FASE10 USUARIO B`

Ambos:

- possuem `role=user`;
- foram autenticados por e-mail + OTP;
- realizaram login por senha após confirmação do OTP;
- receberam tokens de sessão distintos;
- estão marcados com `empresa = FASE10 E2E - PODE REMOVER` para limpeza administrativa posterior.

As caixas de e-mail temporárias foram excluídas ao final do ensaio.

## Escopo testado

### Entidades-raiz e dados pessoais

1. `Receita`
2. `Cardapio`
3. `Planejamento`
4. `ListaCompras`
5. `PerCapitaUsuario`

### Filhas de Receita

6. `IngredienteReceita`
7. `InsumoReceita`
8. `ReceitaTag`
9. `IngredienteEsquecidoReceita`

### Filhas de Cardápio

10. `CardapioReceita`
11. `CardapioInsumo`
12. `CardapioTag`

## Matriz executada

A matriz foi executada nas duas direções:

- A é dono → B ataca;
- B é dono → A ataca.

Para cada entidade privada:

1. proprietário cria o registro;
2. proprietário lê o registro;
3. proprietário atualiza o registro;
4. outro usuário tenta localizar o registro via `filter({ id })`;
5. outro usuário tenta `get(id)` direto;
6. outro usuário tenta `update(id)`;
7. outro usuário tenta `delete(id)`;
8. proprietário relê o registro para confirmar que a tentativa cruzada não o alterou/removeu.

## Resultado consolidado

- sessões autenticadas independentes: **2/2**;
- entidades testadas: **12**;
- verificações totais: **207**;
- leituras cruzadas diretas bloqueadas: **24/24**;
- updates cruzados bloqueados: **24/24**;
- deletes cruzados bloqueados: **24/24**;
- filtros cruzados sem exposição: **24/24**;
- operações legítimas do proprietário validadas: **48**;
- tentativas de forjar `usuario_dono_id` rejeitadas: **6/6**;
- tentativas de promover conteúdo privado para catálogo-base rejeitadas: **4/4**.

### Comportamento observado

- `filter({ id })` do usuário não proprietário retornou conjunto vazio;
- `get(id)` cruzado retornou `404`, ocultando a existência do registro;
- `update(id)` cruzado retornou `403 Permission denied`;
- `delete(id)` cruzado não removeu o registro e foi tratado como não acessível;
- o proprietário continuou lendo o registro após cada tentativa de ataque.

Isso confirma tanto isolamento quanto não enumeração direta dos registros privados.

## Forja de propriedade

Também foram testadas chamadas maliciosas explícitas:

- A criando `Receita` com `usuario_dono_id=B`;
- B criando `Receita` com `usuario_dono_id=A`;
- A/B fazendo o mesmo em `Cardapio`;
- A/B tentando criar `IngredienteReceita` declarando o outro usuário como dono.

Resultado: **todas rejeitadas**.

## Promoção indevida para catálogo-base

Usuários comuns tentaram criar:

- `Receita` com `is_base=true`;
- `IngredienteReceita` com `is_base=true`.

Resultado: **todas rejeitadas**. Em `Receita`, a proteção de campo bloqueou escrita direta em `is_base`; nas entidades-filhas a RLS bloqueou a criação incompatível.

## Catálogo compartilhado

Após os testes de isolamento, os dois usuários conseguiram ler registros globais reais de:

- `Ingrediente`;
- `Tag`.

Isso comprova que o fechamento de RLS privado não quebrou a leitura intencional do catálogo compartilhado.

## Limpeza

O teste criou 28 registros de negócio temporários entre fixtures e casos de CRUD.

Resultado do cleanup automático:

- registros temporários removidos: **28/28**;
- caixas Mail.tm removidas: **2/2**.

Uma verificação administrativa posterior confirmou **zero registros residuais** ligados aos dois usuários nas 12 entidades testadas.

Os dois registros `User` sintéticos permanecem porque o conector Base44 disponível nesta sessão não expõe exclusão segura do built-in `User`. Eles estão identificados para remoção no painel administrativo.

## Automação de regressão

Foi adicionado:

```bash
npm run test:tenant-e2e-temp
```

O comando exige explicitamente:

```bash
ALLOW_TENANT_E2E=1
```

Ele não integra a suíte automática comum porque cria dois usuários reais e executa CRUD destrutivo controlado.

## Conclusão

**Fase 10 — isolamento real Usuário A × Usuário B: VERDE / HOMOLOGADA.**

O backend de produção comprovou isolamento simétrico A↔B nas entidades privadas principais e nas sete entidades-filhas, incluindo proteção contra leitura direta, enumeração, update, delete, forja de ownership e promoção indevida para catálogo-base.
