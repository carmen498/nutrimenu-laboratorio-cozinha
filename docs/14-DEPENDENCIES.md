# 14 — Dependências

Fonte: `package.json`.

## Runtime/build
Node 20.x, npm >=10, React 18.2, Vite 6.1, TypeScript 5.8 (checkJs), Tailwind 3.4, ESLint 9, PostCSS. Backend Base44 usa Deno/TypeScript e imports `npm:`/`base44:runtime` (**dependente Base44**).

## Classificação
- **Portáteis:** React, Router, TanStack Query, Radix/shadcn, Tailwind, lucide, date-fns/moment/lodash, recharts, react-hook-form/zod, jsPDF/html2canvas, react-markdown, DnD, Three, Leaflet, framer-motion.
- **Dependentes Base44:** `@base44/sdk`, `@base44/vite-plugin`, `base44:runtime`, Core integrations, Entity/Auth/Functions APIs.
- **Terceiros operacionais:** Mercado Pago (SDK remoto/config), Resend, Wascript, Google OAuth/fonts.
- **Instaladas mas uso não confirmado neste inventário:** Stripe packages, alguns componentes/visualização; verificar imports antes de remover.
- **Proprietárias:** schemas/RLS/configurações/automations Base44; código gastronômico é do projeto, porém acoplado ao SDK.

## Riscos
Versões SDK frontend `^0.8.43` e backend importam `0.8.40`; reproduzir contratos, não apenas atualizar. Lockfile não foi inspecionado (**AÇÃO NECESSÁRIA**). Rodar audit/licenças/SBOM e congelar versões no baseline.