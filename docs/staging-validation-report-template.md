# Staging Validation Report - Obra Sys Brasil PME

Data:

Responsavel:

Project ref Supabase staging:

## Resultado Geral

Status:

- [ ] Aprovado para homologacao
- [ ] Aprovado com ressalvas
- [ ] Reprovado

Resumo:

## Migrations

Comando executado:

```bash
supabase db push --linked
```

Resultado:

- [ ] Sucesso
- [ ] Falha

Migrations aplicadas:

- [ ] Core multi-tenant
- [ ] Orçamentos PME
- [ ] Catalogo PME
- [ ] SINAPI simplificado
- [ ] Axia PME
- [ ] Conversao PME para obra
- [ ] Gestao de obras PME
- [ ] Compras e fornecedores PME
- [ ] Diario PME
- [ ] Relatorios e fecho PME
- [ ] Dashboard PME
- [ ] Notificacoes PME
- [ ] Helpers RLS e Storage staging

Observacoes:

## Schema Esperado

Confirmar tabelas:

- [ ] `organizations`
- [ ] `profiles`
- [ ] `organization_members`
- [ ] `projects`
- [ ] `audit_logs`
- [ ] `pme_budgets`
- [ ] `pme_budget_items`
- [ ] `pme_catalog_items`
- [ ] `pme_project_*`
- [ ] `pme_suppliers`
- [ ] `pme_notifications`
- [ ] `axia_*`

Gaps:

## RLS

Helpers validados:

- [ ] `is_org_member`
- [ ] `get_user_role`
- [ ] `has_org_role`
- [ ] `can_view_internal_costs`
- [ ] `can_view_profit`
- [ ] `can_manage_budget`
- [ ] `can_manage_project`
- [ ] `can_manage_purchase`
- [ ] `can_close_project`

Testes:

- [ ] Usuario da Organizacao A le dados da Organizacao A
- [ ] Usuario da Organizacao A nao le dados da Organizacao B
- [ ] Usuario sem permissao financeira nao consegue gerir custos/lucro
- [ ] Operacional nao fecha obra se nao tiver role permitido
- [ ] Admin consegue fluxo completo

Evidencias:

## Storage

Buckets privados:

- [ ] `project-photos`
- [ ] `project-attachments`
- [ ] `budget-proposals`
- [ ] `project-reports`
- [ ] `purchase-attachments`
- [ ] `daily-log-photos`

Todos com `public = false`:

- [ ] Sim
- [ ] Nao

Signed URLs:

- [ ] Upload permitido para usuario autorizado
- [ ] Signed URL gerada
- [ ] Acesso cross-tenant bloqueado
- [ ] Path sem `organization_id/` bloqueado

Evidencias:

## Edge Functions

Deploy:

- [ ] `pme-budget-convert-to-project`
- [ ] `pme-budget-generate-proposal`
- [ ] `pme-project-create-actual-cost`
- [ ] `pme-project-create-receipt`
- [ ] `pme-project-lock-daily-log`
- [ ] `pme-project-generate-report`
- [ ] `pme-project-close`
- [ ] `pme-notifications-generate`
- [ ] `axia-pme-budget-assistant`

Seguranca:

- [ ] Todas usam `supabase.auth.getUser()`
- [ ] Nenhuma confia em `organization_id` do body
- [ ] Membership real validado
- [ ] Role/permissao validada em operacoes criticas
- [ ] Auditoria gerada quando aplicavel

Observacoes:

## Seeds De Homologacao

Dados criados:

- [ ] Organizacao A
- [ ] Organizacao B
- [ ] usuario admin
- [ ] usuario operacional
- [ ] usuario sem permissao financeira
- [ ] orcamento PME demo
- [ ] obra demo
- [ ] fornecedor demo
- [ ] compra demo
- [ ] diario demo
- [ ] relatorio demo

Observacoes:

## Fluxo E2E

- [ ] Login admin
- [ ] Abrir orcamento PME demo
- [ ] Gerar proposta sanitizada
- [ ] Converter orcamento em obra
- [ ] Criar custo real
- [ ] Criar recebimento
- [ ] Bloquear diario
- [ ] Gerar relatorio
- [ ] Gerar notificacoes
- [ ] Executar Axia consultiva sem acao critica autonoma

Falhas:

## Qualidade Local

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Resultados:

- Typecheck:
- Lint:
- Test:
- Build:

## Riscos Restantes

-

## Decisao

Assinatura:

Data:
