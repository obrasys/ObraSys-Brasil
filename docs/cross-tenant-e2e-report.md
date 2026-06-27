# Cross-Tenant E2E Report — Obra Sys Brasil PME

Data: 2026-06-27

Ambiente: Supabase staging `ndfivxfmijjwakeeunhd`

Run ID: `20260627185754`

## Resultado

Status: Aprovado

Usuario da Organizacao A nao conseguiu acessar, inserir, atualizar ou apagar registros da Organizacao B nos testes executados com JWT real.

## Usuarios testados

Organizacao A:

- `admin-org-a-20260627185754@staging.obrasys.local` — `admin`
- `engenheiro-obra-a-20260627185754@staging.obrasys.local` — `manager`
- `mestre-obra-a-20260627185754@staging.obrasys.local` — `member`
- `sem-financeiro-a-20260627185754@staging.obrasys.local` — `member`

Organizacao B:

- `admin-org-b-20260627185754@staging.obrasys.local` — `admin`
- `engenheiro-obra-b-20260627185754@staging.obrasys.local` — `manager`

## Organizacoes

- Organizacao A: `10000000-0000-0000-0000-000000000001`
- Organizacao B: `10000000-0000-0000-0000-000000000002`

## Tabelas testadas

Foram executados 69 checks de tabela combinando `SELECT`, `INSERT`, `UPDATE` e `DELETE`, conforme aplicavel.

- `pme_budgets`
- `pme_budget_items`
- `projects`
- `pme_project_tasks`
- `pme_project_actual_costs`
- `pme_project_receipts`
- `pme_project_daily_logs`
- `pme_project_photos`
- `pme_project_attachments`
- `pme_suppliers`
- `pme_purchase_orders`
- `pme_project_reports`
- `pme_project_report_exports`
- `pme_notifications`
- `axia_runs`
- `axia_context_snapshots`
- `audit_logs`

Observacao: `pme_budget_exports` nao existe no schema atual do staging, entao foi registrado como nao aplicavel nesta rodada.

## Edge Functions testadas

Todas exigiram JWT e bloquearam tentativa de acao do usuario A sobre dados da Organizacao B.

| Edge Function                    | Resultado                 |
| -------------------------------- | ------------------------- |
| `pme-budget-convert-to-project`  | Bloqueada com erro seguro |
| `pme-budget-generate-proposal`   | Bloqueada com erro seguro |
| `pme-project-create-actual-cost` | Bloqueada com erro seguro |
| `pme-project-create-receipt`     | Bloqueada com erro seguro |
| `pme-project-lock-daily-log`     | Bloqueada com erro seguro |
| `pme-project-generate-report`    | Bloqueada com erro seguro |
| `pme-project-close`              | Bloqueada com erro seguro |
| `pme-notifications-generate`     | Bloqueada com erro seguro |
| `axia-pme-budget-assistant`      | Bloqueada com erro seguro |
| `pme-daily-log-process-voice`    | Bloqueada com erro seguro |
| `pme-daily-log-fetch-weather`    | Bloqueada com erro seguro |

## Permissoes financeiras

Usuario sem permissao financeira da Organizacao A foi validado contra:

- orcamento;
- custos de obra;
- relatorios;
- notificacoes.

Resultado: aprovado. O usuario nao recebeu valores internos de custo, margem ou lucro. Em relatorio cliente, a lista `hiddenFields` foi tratada como metadado declarativo de ocultacao, sem valores financeiros internos.

## Falhas encontradas

- P1: `pme-notifications-generate`, `pme-daily-log-process-voice` e `pme-daily-log-fetch-weather` aceitavam aliases de autorizacao no payload, embora nao os usassem como fonte de autorizacao.
- P1 operacional: `pme-daily-log-fetch-weather` precisou de redeploy isolado para aparecer como `ACTIVE` no Supabase staging.

## Falhas corrigidas

- Edge Functions reforcadas para rejeitar `organization_id`, `organizationId`, `tenant_id`, `tenantId`, `user_id` e `userId` no body.
- Edge Functions afetadas foram implantadas novamente no staging.
- Validacao E2E repetida apos deploy, com resultado aprovado.

## Riscos restantes

- Os usuarios e fixtures criados sao de homologacao e devem permanecer restritos ao staging.
- O RBAC granular ainda depende do mapeamento Core atual (`owner`, `admin`, `manager`, `member`, `viewer`).

## Recomendacao

Aprovado para piloto controlado quanto a isolamento cross-tenant.
