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

- rotas internas `/app/orcamentos-pme`, `/app/orcamentos-pme/novo`, `/app/orcamentos-pme/:budgetId` e `/app/orcamentos-pme/:budgetId/editar`;
- listagem de orçamentos com filtros por status, cliente, período e texto;
- criação rápida, visualização e edição de orçamento;
- abas de resumo, ambientes, itens, materiais, mão de obra, margem/impostos e pagamento;
- integração visual opcional com Meu Catálogo;
- ação interna para converter orçamento aprovado em obra;
- React Hook Form com Zod;
- TanStack Query sobre um repositório local substituível por Supabase;
- prévia financeira usando o serviço centralizado de domínio por uma fronteira de client/hook.

Limites desta fase:

- sem PDF;
- sem Axia na interface de orçamento;
- sem SINAPI completo na interface de orçamento;
- sem cliente Supabase/autenticação real no frontend.

Nesta fase não há migration nova. A UI não deve enviar `organization_id` como autorização e não
deve tratar cálculo feito em componente React como fonte oficial. O ponto de troca para Supabase e
Edge Function fica concentrado em `services/pmeBudgetClient.ts`.

## SINAPI Simplificado

O SINAPI é tratado como referência técnica e de custo, nunca como obrigação comercial.

Nesta fase:

- tabelas públicas de referência têm leitura para usuários autenticados;
- escrita de referência não é exposta por policy comum;
- itens SINAPI usados em orçamento geram snapshot imutável em `pme_budget_sinapi_snapshots`;
- itens SINAPI adaptados para reutilização podem ser salvos em `pme_saved_sinapi_items` e/ou Meu Catálogo;
- a UI avisa quando o usuário mistura UF ou mês/ano de referência;
- a adaptação de preço é feita por serviço de domínio com produtividade, perda e margem.

A ação crítica de adicionar composição SINAPI ao orçamento deve passar pela Edge Function
`pme-sinapi-add-composition-to-budget`, que autentica o usuário, deriva a organização pelo
orçamento, cria `pme_budget_items`, grava snapshot, recalcula com `calculatePmeBudget` e registra
`audit_logs`.

## Conversão PME Para Projeto

A Edge Function `pme-budget-convert-to-project` converte um orçamento PME aprovado em `projects`.

Regras arquiteturais:

- autentica com `supabase.auth.getUser()`;
- não confia em `organization_id` do body;
- deriva organização do orçamento lido via RLS;
- valida role de gestão antes de converter;
- bloqueia orçamento não aprovado e orçamento já convertido;
- cria ou reaproveita projeto com origem `pme_budget`;
- usa serviço centralizado para cálculo e previsão financeira inicial;
- persiste snapshot em `pme_project_budget_snapshots`;
- persiste previsões staging em `pme_project_cost_forecasts` e `pme_project_receivable_forecasts`;
- preserva `pme_budget_sinapi_snapshots` dentro do snapshot de conversão;
- registra `pme_budget_conversion_logs`, histórico de status e `audit_logs`.

Limite atual: como ainda não existem tabelas oficiais de orçamento da obra e financeiro completo,
as previsões ficam em tabelas staging PME. A operação usa constraints e checagens idempotentes;
uma RPC transacional única deve ser criada quando o motor financeiro oficial existir.

## Axia PME Assistant

A primeira versão da Axia para Orçamentos PME fica em `axia-pme-budget-assistant`.

Regras arquiteturais:

- Edge Function autentica o usuário;
- organização é derivada por RLS/membership, não pelo body;
- contexto é sanitizado antes de log/prompt;
- execução gera `axia_runs`;
- contexto sanitizado gera `axia_context_snapshots`;
- remoções LGPD geram `axia_redaction_logs`;
- sugestões estruturadas geram `axia_suggestions` e `axia_suggestion_items`;
- a interface exibe um painel Axia na edição do orçamento PME;
- aceitar ou aplicar sugestão exige ação humana;
- nenhuma sugestão altera orçamento oficial sem validação humana.

Nesta fase a resposta é estruturada localmente, sem provedor externo. Quando um modelo externo for plugado, ele deve receber apenas o contexto sanitizado, manter o mesmo schema de resposta e registrar falhas sem quebrar o orçamento.

## Gestão Simples da Obra PME

A primeira versão da gestão operacional PME fica em `apps/web/src/features/pme-projects` e nas Edge Functions
`pme-project-create-actual-cost`, `pme-project-create-receipt`, `pme-project-calculate-summary` e
`pme-project-lock-daily-log`.

Regras arquiteturais:

- a rota `/app/obras` lista obras e `/app/obras/:projectId` mostra a gestão simples da obra;
- a UI usa TanStack Query, React Hook Form e Zod;
- a tela separa previsto, realizado, recebido, pendente, lucro previsto e lucro real;
- lucro/margem passam por `PmeProjectPermissionGate` para permitir ocultação por perfil;
- custos, recebimentos, diário e fotos ficam em tabelas próprias com `organization_id`;
- cálculo oficial do resumo financeiro fica em `calculatePmeProjectFinancialSummary` e na Edge Function `pme-project-calculate-summary`;
- o frontend exibe o resumo, mas não é a fonte oficial de lucro/custo realizado;
- diário `locked` não pode ser editado;
- fotos/anexos devem usar paths por `organization_id/project_id` quando Storage real for plugado.

Limites desta fase:

- não há motor financeiro avançado, BM, EAC, compras com aprovação ou diário técnico assinado;
- a UI usa repositório local substituível por Supabase enquanto os clientes reais não são conectados;
- permissões granulares por papéis específicos devem ser reforçadas quando o RBAC final existir.

## Compras e Fornecedores PME

A primeira versão de compras PME fica em `apps/web/src/features/pme-purchases` e nas Edge Functions
`pme-purchase-select-quote`, `pme-purchase-create-order`, `pme-purchase-register-delivery` e
`pme-purchase-create-actual-cost`.

Regras arquiteturais:

## Relatorios PME e Fecho Simples da Obra

A primeira versão de relatórios e fecho PME fica em `apps/web/src/features/pme-project-reports`
e nas Edge Functions `pme-project-calculate-closeout`, `pme-project-generate-report`,
`pme-project-export-report`, `pme-project-close` e `pme-project-reopen`.

Regras arquiteturais:

- as rotas `/app/obras/:projectId/relatorios` e `/app/obras/:projectId/fecho` ficam separadas do
  dashboard operacional da obra;
- cálculo oficial de fecho fica no serviço de domínio/Edge Function, nunca em componente React;
- relatórios internos podem mostrar custo, lucro, margem e desvio apenas para perfis autorizados;
- relatórios para cliente são gerados com snapshot sanitizado, sem custo interno, margem, lucro,
  fornecedores internos, notas internas ou audit logs;
- fechar obra cria snapshot append-only, atualiza status do projeto quando possível e registra
  `audit_logs`;
- reabrir obra exige motivo e também registra auditoria;
- snapshots guardam referências de fotos/anexos, não arquivos pesados.

Limites desta fase:

- não há BI multi-obra, DRE avançada, contabilidade oficial, assinatura digital ou envio automático;
- Axia fica apenas como ponto de extensão futuro para textos e explicações, sem ação autônoma.

## Dashboard PME e Visao Multi-Obras

A primeira versão do dashboard PME fica em `apps/web/src/features/pme-dashboard` e nas Edge
Functions `pme-dashboard-summary`, `pme-dashboard-generate-alerts` e `pme-dashboard-resolve-alert`.

Regras arquiteturais:

- a rota `/app/dashboard` mostra a visão consolidada de obras PME;
- cards financeiros e alertas usam agregação centralizada em `packages/domain/src/pme-dashboard`;
- lucro, margem e custo interno são ocultados para perfis sem permissão;
- o frontend não carrega fotos/anexos nem recalcula financeiro oficial;
- alertas evitam duplicidade por tipo, obra e origem;
- resolução e geração manual de alertas registram `audit_logs`;
- Axia fica apenas como ponto de extensão consultivo para explicar alertas e prioridades.

Limites desta fase:

- sem BI avançado, gráficos pesados, forecast/EAC, envio automático ou dashboard multiempresa.

## Notificacoes, Lembretes e Alertas PME

A primeira versão do centro de notificações PME fica em `apps/web/src/features/pme-notifications`
e nas Edge Functions `pme-notifications-generate`, `pme-notifications-mark-read` e
`pme-notifications-resolve`.

Regras arquiteturais:

- notificações são internas/in-app nesta fase;
- email e push ficam apenas preparados em preferências/entregas;
- geração de notificações usa regras centralizadas em `packages/domain/src/pme-notifications`;
- notificações usam `source_table/source_id` para evitar duplicidade ativa;
- mensagens financeiras devem ser sanitizadas para perfis sem permissão;
- ações críticas de geração manual, resolução e preferências sensíveis registram auditoria;
- Axia pode explicar prioridades futuramente, mas não resolve nem esconde notificações.

Limites desta fase:

- sem WhatsApp, SMS, email transacional real, push mobile nativo ou escalonamento complexo.

- `/app/fornecedores` lista e cria fornecedores;
- `/app/obras/:projectId/compras` mostra compras, solicitações, cotações e pedidos da obra;
- compra manual é permitida sem cotação;
- cotações são opcionais e servem para comparação simples;
- pedidos guardam snapshot do fornecedor;
- entrega e geração de custo real passam por backend/Edge Function;
- cálculo oficial de totais, comparação e resumo fica em `packages/domain/src/pme-purchases`;
- anexos de compra devem usar Storage com path por `organization_id/project_id/purchases` quando upload real for plugado.

## Diário de Obra PME Guiado

A evolução do diário de obra PME fica em `apps/web/src/features/pme-daily-logs` e nas Edge Functions
`pme-daily-log-process-voice`, `pme-daily-log-fetch-weather`, `pme-daily-log-complete`,
`pme-daily-log-lock` e `pme-daily-log-export`.

Regras arquiteturais:

- o diário simples existente é evoluído por migration additive-first;
- o fluxo guiado é mobile/tablet-first e permite salvar rascunho por etapas;
- voz/Axia gera sugestões estruturadas, nunca aplicação automática;
- clima automático é opcional e sempre tem fallback manual;
- conclusão valida campos mínimos;
- bloqueio impede edição comum;
- relatório HTML/print view é gerado sem assinatura digital avançada nesta fase;
- fotos/anexos devem usar path por `organization_id/project_id/daily_logs` quando Storage real for plugado.
