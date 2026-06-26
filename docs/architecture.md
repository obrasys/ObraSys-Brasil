# Architecture — Obra Sys Brasil

## Visão geral

O Obra Sys Brasil é uma plataforma SaaS multi-tenant para construção civil no Brasil. A arquitetura deve proteger isolamento por organização, cálculos financeiros oficiais, auditoria e evolução incremental por módulos.

## Stack

- Frontend: React, Vite, TypeScript strict.
- Backend: Supabase, Postgres, RLS, Edge Functions, Storage e Realtime.
- Qualidade: TypeScript strict, ESLint, Prettier, testes automatizados e GitHub Actions.

## Estrutura do repositório

```text
apps/
  web/
packages/
  domain/
  shared/
  ui/
supabase/
  migrations/
  functions/
docs/
```

## Fronteiras

### `apps/web`

Aplicação React/Vite. Pode conter UI, rotas, providers, composição de features e integração com hooks.

Não deve conter cálculo financeiro oficial nem lógica de autorização sensível.

### `packages/domain`

Tipos e constantes de domínio compartilhados. Deve permanecer independente de React.

### `packages/shared`

Utilitários compartilhados sem dependência de produto específico.

### `packages/ui`

Componentes visuais reutilizáveis, sem regra de negócio sensível.

### `supabase/migrations`

Fonte de verdade para schema, RLS, constraints e policies.

### `supabase/functions`

Edge Functions em TypeScript. Toda função deve autenticar com `supabase.auth.getUser()` e nunca confiar em `organization_id`, `tenant_id` ou `user_id` vindos do body.

## Ordem de implementação

1. Core multi-tenant.
2. RLS e permissões.
3. Tipos.
4. Serviços.
5. Hooks.
6. UI.
7. Testes.
8. Documentação.

## Core multi-tenant

O Core deve nascer antes de novos módulos de produto:

- `organizations`
- `profiles`
- `organization_members`
- `audit_logs`

Toda tabela de negócio deve usar `organization_id`, exceto tabelas públicas de referência como SINAPI.

## Segurança

- RLS obrigatório para dados de organização.
- Membership em `organization_members` é a base de autorização.
- `organization_id` enviado pelo frontend é dado de entrada, não autorização.
- `service_role` só pode ser usado com autenticação, autorização e auditoria explícitas.
- Dados sensíveis devem ser minimizados.

## Financeiro

O frontend pode exibir simulações, mas cálculo oficial deve ficar em backend, SQL controlado ou serviço TypeScript centralizado.

Dinheiro deve usar `numeric` no Postgres.

## Axia

Axia é consultiva. Não aprova pagamentos, não altera orçamento oficial, não modifica contratos, não apaga dados e não é fonte oficial de cálculo financeiro.

Sugestões da Axia devem ser `draft` ou `suggested` até validação humana.

## Estado atual

O projeto possui fundação técnica React/Vite/TypeScript, Core multi-tenant e uma migration inicial de Orçamentos PME Fase 1.

Antes de avançar novos módulos de produto, validar o RLS real do Core e da migration PME em ambiente Supabase local/remoto.

## Frontend Orçamentos PME

A primeira interface funcional do módulo Orçamentos PME fica em `apps/web/src/features/pme-budgets`.

Ela cobre:

- listagem de orçamentos;
- criação e edição de orçamento;
- abas de resumo, ambientes, itens, materiais, mão de obra, margem/impostos e pagamento;
- React Hook Form com Zod;
- TanStack Query sobre um repositório local substituível por Supabase;
- prévia financeira usando o serviço centralizado de domínio.

Limites desta fase:

- sem PDF;
- Axia PME consultiva com sugestões `draft`/`suggested`;
- conversão inicial de orçamento aprovado para projeto via Edge Function;
- SINAPI simplificado e opcional, sem importador automático completo;
- sem cliente Supabase/autenticação real no frontend.

## SINAPI Simplificado

O SINAPI é tratado como referência técnica e de custo, nunca como obrigação comercial.

Nesta fase:

- tabelas públicas de referência têm leitura para usuários autenticados;
- escrita de referência não é exposta por policy comum;
- itens SINAPI usados em orçamento geram snapshot em `pme_saved_sinapi_items`;
- a UI avisa quando o usuário mistura UF ou mês/ano de referência;
- a adaptação de preço é feita por serviço de domínio com produtividade, perda e margem.

## Conversão PME Para Projeto

A Edge Function `pme-budget-convert-to-project` converte um orçamento PME aprovado em `projects`.

Regras arquiteturais:

- autentica com `supabase.auth.getUser()`;
- não confia em `organization_id` do body;
- deriva organização do orçamento lido via RLS;
- valida role de gestão antes de converter;
- usa serviço centralizado para previsão financeira inicial;
- registra snapshot em `audit_logs`.

Limite atual: como ainda não existem tabelas oficiais de orçamento da obra e financeiro completo, os ambientes, itens e previsões iniciais ficam no audit log como snapshot de conversão.

## Axia PME Assistant

A primeira versão da Axia para Orçamentos PME fica em `axia-pme-budget-assistant`.

Regras arquiteturais:

- Edge Function autentica o usuário;
- organização é derivada por RLS/membership, não pelo body;
- contexto é sanitizado antes de log/prompt;
- execução gera `axia_runs`;
- contexto sanitizado gera `axia_context_snapshots`;
- sugestões estruturadas geram `axia_insights`;
- nenhuma sugestão altera orçamento oficial sem validação humana.

Nesta fase a resposta é estruturada localmente, sem provedor externo. Quando um modelo externo for plugado, ele deve receber apenas o contexto sanitizado e manter o mesmo schema de resposta.
