# Staging Validation Report - Obra Sys Brasil PME

Data: 2026-06-27

Responsavel: Antonio Cavalcanti / Codex

Project ref Supabase staging: `ndfivxfmijjwakeeunhd`

URL Supabase: `https://ndfivxfmijjwakeeunhd.supabase.co`

## Resultado Geral

Status:

- [x] Aprovado para homologacao
- [ ] Aprovado com ressalvas
- [ ] Reprovado

Resumo:

O ambiente remoto Supabase linkado recebeu as migrations PME, teve Edge Functions obrigatorias implantadas, secrets base confirmados, buckets privados criados e policies de Storage validadas. O seed de homologacao foi carregado e o fluxo E2E basico passou com usuario autenticado real.

Em 2026-06-27, o gate final de seguranca em staging tambem passou com JWT real, validando cross-tenant A/B, Storage privado, upload real, signed URLs, expiracao de signed URLs, Edge Functions com dados de outra organizacao e perfil sem permissao financeira.

## Migrations

Comando executado:

```bash
supabase db push --linked
```

Resultado:

- [x] Sucesso
- [ ] Falha

Migrations aplicadas:

- [x] Core multi-tenant
- [x] Orcamentos PME
- [x] Catalogo PME
- [x] SINAPI simplificado
- [x] Axia PME
- [x] Conversao PME para obra
- [x] Gestao de obras PME
- [x] Compras e fornecedores PME
- [x] Diario PME
- [x] Relatorios e fecho PME
- [x] Dashboard PME
- [x] Notificacoes PME
- [x] Helpers RLS e Storage staging

Observacoes:

- A migration remota concluiu com `Finished supabase db push`.
- Houve avisos `NOTICE` sobre constraint inexistente ao ajustar diario, sem falha de aplicacao.
- Durante a preparacao, foram corrigidas constraints compostas ausentes antes da aplicacao final.

## Schema Esperado

Confirmar tabelas:

- [x] `organizations`
- [x] `profiles`
- [x] `organization_members`
- [x] `projects`
- [x] `audit_logs`
- [x] `pme_budgets`
- [x] `pme_budget_items`
- [x] `pme_catalog_items`
- [x] `pme_project_*`
- [x] `pme_suppliers`
- [x] `pme_notifications`
- [x] `axia_*`

Gaps:

- Nenhum gap de schema confirmado apos `db push`.
- Seeds de homologacao ainda devem ser carregados somente quando a equipe confirmar que o staging pode receber usuarios/dados demo.

## RLS

Helpers validados:

- [x] `is_org_member`
- [x] `get_user_role`
- [x] `has_org_role`
- [x] `can_view_internal_costs`
- [x] `can_view_profit`
- [x] `can_manage_budget`
- [x] `can_manage_project`
- [x] `can_manage_purchase`
- [x] `can_close_project`

Testes:

- [x] Usuario da Organizacao A le dados da Organizacao A
- [x] Usuario da Organizacao A nao le dados da Organizacao B
- [x] Usuario sem permissao financeira nao consegue gerir custos/lucro
- [ ] Operacional nao fecha obra se nao tiver role permitido
- [x] Admin consegue fluxo E2E basico

Evidencias:

- Query de `pg_proc` retornou os 9 helpers esperados.
- Usuario `obrasys.pt@gmail.com` recebeu membership admin na Organizacao A e acessou orcamento PME demo via Edge Function autenticada.
- Validacao cross-tenant final executada no run `20260627185754`: 69 checks de tabela passaram com JWT real.
- Relatorio detalhado: `docs/cross-tenant-e2e-report.md`.

## Storage

Buckets privados:

- [x] `project-photos`
- [x] `project-attachments`
- [x] `budget-proposals`
- [x] `project-reports`
- [x] `purchase-attachments`
- [x] `daily-log-photos`

Todos com `public = false`:

- [x] Sim
- [ ] Nao

Signed URLs:

- [x] Upload permitido para usuario autorizado
- [x] Signed URL gerada
- [x] Acesso cross-tenant bloqueado
- [x] Path sem `organization_id/` bloqueado

Evidencias:

- Query em `storage.buckets` retornou os 6 buckets com `public = false`.
- Query em `pg_policies` confirmou SELECT, INSERT, UPDATE e DELETE para `storage.objects`.
- Policies usam `storage_object_organization_id(name)` e helpers de permissao por dominio.
- Validacao Storage final executada no run `20260627185754`: 6 buckets passaram com upload real, signed URL autorizada, abertura antes de expirar, bloqueio apos expiracao e bloqueio para Organizacao B.
- Relatorio detalhado: `docs/storage-signed-url-report.md`.

## Edge Functions

Deploy:

- [x] `pme-budget-convert-to-project`
- [x] `pme-budget-generate-proposal`
- [x] `pme-project-create-actual-cost`
- [x] `pme-project-create-receipt`
- [x] `pme-project-lock-daily-log`
- [x] `pme-project-generate-report`
- [x] `pme-project-close`
- [x] `pme-notifications-generate`
- [x] `axia-pme-budget-assistant`
- [x] `pme-daily-log-process-voice`
- [x] `pme-daily-log-fetch-weather`

Seguranca:

- [x] Todas usam `supabase.auth.getUser()`
- [x] Nenhuma confia em `organization_id` do body
- [x] Membership real validado
- [x] Role/permissao validada em operacoes criticas
- [x] Auditoria gerada quando aplicavel

Observacoes:

- Todos os deploys retornaram `Deployed Functions on project ndfivxfmijjwakeeunhd`.
- `WARNING: Docker is not running` nao bloqueou deploy remoto.
- CLI reportou versao mais nova disponivel: `v2.108.0`; instalada: `v2.106.0`.
- As funcoes `pme-budget-generate-proposal`, `pme-project-generate-report`, `axia-pme-budget-assistant`, `pme-notifications-generate`, `pme-daily-log-process-voice` e `pme-daily-log-fetch-weather` foram redeployadas no staging apos hardening de payload contra aliases de autorizacao.

## Secrets

Secrets base confirmados no projeto:

- [x] `SUPABASE_ANON_KEY`
- [x] `SUPABASE_DB_URL`
- [x] `SUPABASE_JWKS`
- [x] `SUPABASE_PUBLISHABLE_KEYS`
- [x] `SUPABASE_SECRET_KEYS`
- [x] `SUPABASE_SERVICE_ROLE_KEY`
- [x] `SUPABASE_URL`

Observacoes:

- Supabase CLI nao permite setar manualmente secrets com prefixo reservado `SUPABASE_`.
- Esses secrets ja existem automaticamente no runtime.

## Seeds De Homologacao

Dados preparados em `supabase/seed.sql`:

- [x] Organizacao A
- [x] Organizacao B
- [x] usuario admin
- [x] usuario operacional
- [x] usuario sem permissao financeira
- [x] orcamento PME demo
- [x] obra demo
- [x] fornecedor demo
- [x] compra demo
- [x] diario demo
- [x] relatorio demo

Observacoes:

- Seed carregado no Supabase SQL Editor com resultado `Success. No rows returned`.
- Usuarios demo devem ser usados apenas em staging/local.
- O usuario real de staging `obrasys.pt@gmail.com` foi associado como admin da Organizacao A para executar o E2E.

## Fluxo E2E

- [x] Login admin
- [x] Abrir orcamento PME demo
- [x] Gerar proposta sanitizada
- [x] Converter orcamento em obra
- [x] Criar custo real
- [x] Criar recebimento
- [x] Bloquear diario
- [x] Gerar relatorio
- [x] Gerar notificacoes
- [x] Executar Axia consultiva sem acao critica autonoma

Falhas:

- Nenhuma falha bloqueante no E2E basico executado.
- O bloqueio de diario falhou inicialmente por `created_by` do seed antigo; foi ajustado no staging para o usuario `obrasys.pt@gmail.com` e retornou `status = locked`.
- Geracao de notificacoes foi validada no gate de seguranca final; payload com `organizationId` indevido passou a retornar erro seguro.

Evidencias:

- Login com `obrasys.pt@gmail.com`: retornou `access_token`.
- Proposta sanitizada: retornou `budgetNumber = PME-DEMO-001` e `hiddenFields = ["unit_cost","subtotal_cost","margin","profit","internal_snapshot"]`.
- Conversao: retornou `projectId = d738838c-a9d5-49c6-b168-84b84cc75de8` e `status = converted_to_project`.
- Custo real: retornou id de registro pela Edge Function `pme-project-create-actual-cost`.
- Recebimento: retornou `id = 9c70180e-7a3c-4a92-afe5-3e7c760c002b`.
- Relatorio cliente: retornou `visibility = client`, `financial = {}` e `hiddenFields = ["actual_cost","planned_cost","margin","profit","supplier_names"]`.
- Axia consultiva: retornou sugestoes `status = suggested`, `humanValidationRequired = true` e `runId = 884df937-ca81-41d0-aec7-4383a1c802be`.
- Diario: retornou `id = 60000000-0000-0000-0000-000000000001` e `status = locked`.

## Qualidade Local

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Resultados:

- Typecheck: passou
- Lint: passou
- Test: passou, 139 testes
- Build: passou

Observacoes:

- `npm run build` manteve aviso nao bloqueante do Vite sobre chunk acima de 500 kB.
- Testes focados apos ajustes de migrations passaram: 23/23.
- Apos o hardening final, `npm run test` passou com 140 testes.

## Riscos Restantes

- O project ref `ndfivxfmijjwakeeunhd` foi tratado como staging nesta validacao; manter confirmacao operacional para evitar aplicar rotinas de teste em producao.
- Os usuarios e fixtures criados pelo run `20260627185754` sao de homologacao e devem permanecer restritos ao staging.
- RBAC granular ainda depende do mapeamento Core atual (`owner`, `admin`, `manager`, `member`, `viewer`).
- Repetir cross-tenant e Storage sempre que novas tabelas, buckets ou Edge Functions forem adicionados.

## Decisao

Aprovado para piloto controlado.

Nao aprovado para producao ampla. Antes de producao real, repetir o gate em ambiente final, confirmar variaveis de ambiente definitivas, monitoramento, backup e plano de suporte operacional.

Assinatura:

Data: 2026-06-27
