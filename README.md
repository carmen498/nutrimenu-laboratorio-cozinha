# Nutrimenu — Laboratório de Cozinha

Aplicação operacional para gestão e execução de receitas, fichas técnicas, rendimento, custos e planejamento de produção.

Este produto integra o ecossistema Nutrimenu, mas tem papel diferente do **Laboratório de Formulações**, voltado ao desenvolvimento técnico, composição nutricional e preparação da análise regulatória.

O contrato de escopo e nomenclatura da Fase 1 está em [docs/CONTRATO_PRODUTO_FASE_1.md](docs/CONTRATO_PRODUTO_FASE_1.md).

## Desenvolvimento local

### Pré-requisitos

- Node.js compatível com o projeto;
- acesso ao aplicativo Base44;
- variáveis de ambiente da aplicação.

### Configuração

1. Clone o repositório.
2. Entre no diretório do projeto.
3. Instale as dependências com `npm install`.
4. Crie `.env.local`:

```dotenv
VITE_BASE44_APP_ID=seu_app_id
VITE_BASE44_APP_BASE_URL=sua_url_de_backend
```

5. Inicie o ambiente com `npm run dev`.

Mudanças enviadas ao repositório também são refletidas no Base44 Builder.

## Publicação

A publicação é realizada no Base44 por meio da ação **Publish**.

## Limites do produto

O Laboratório de Cozinha não substitui o responsável técnico, não emite parecer regulatório e não promete conformidade automática. A integração futura com análise nutricional e rotulagem deverá ser versionada, rastreável e submetida à revisão humana.

## Documentação

- [Contrato de produto — Fase 1](docs/CONTRATO_PRODUTO_FASE_1.md)
- [Documentação Base44](https://docs.base44.com/Integrations/Using-GitHub)
