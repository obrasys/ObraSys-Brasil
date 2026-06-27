# Staging Setup Supabase - Obra Sys Brasil PME

Este roteiro prepara um ambiente real de staging para validar schema, RLS, Storage privado e Edge Functions do Obra Sys Brasil PME.

## 1. Criar Projeto Supabase Staging

1. Criar um novo projeto Supabase para staging.
2. Usar uma senha forte de banco e guardar no cofre de secrets.
3. Confirmar regiao, plano e versao do Postgres.
4. Registrar:
   - project ref;
   - database password;
   - anon key;
   - service role key;
   - API URL.

## 2. Confirmar Project Ref

No painel Supabase, copiar o `Project Ref`.

No repositorio:

```bash
cat supabase/.temp/project-ref
```

Se o ref local nao for o staging desejado, relinkar.

## 3. Linkar CLI

```bash
supabase login
supabase link --project-ref <STAGING_PROJECT_REF>
supabase projects list
```

Confirmar que o projeto linkado e o staging, nao producao.

## 4. Aplicar Migrations

Antes de aplicar, revisar:

```bash
ls -1 supabase/migrations
supabase migration list
```

Aplicar:

```bash
supabase db push --linked
```

Validar que as migrations criaram:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Validar RLS:

```sql
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and (
    tablename in ('organizations', 'profiles', 'organization_members', 'projects', 'audit_logs')
    or tablename like 'pme_%'
    or tablename like 'axia_%'
  )
order by tablename;
```

## 5. Carregar Seeds De Homologacao

Somente em staging/local:

```bash
supabase db reset
```

Ou, se o schema ja estiver aplicado no staging e a equipe decidir carregar seed manualmente:

```bash
psql "$STAGING_DATABASE_URL" -f supabase/seed.sql
```

Usuarios demo:

- `admin@obrasys.local`
- `operacional@obrasys.local`
- `sem-financeiro@obrasys.local`

Senha demo, apenas staging/local: `ObraSysDemo#2026`.

## 6. Deploy Das Edge Functions

Deploy obrigatorio do fluxo PME staging:

```bash
supabase functions deploy pme-budget-convert-to-project --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-budget-generate-proposal --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-create-actual-cost --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-create-receipt --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-lock-daily-log --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-generate-report --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-close --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-notifications-generate --project-ref <STAGING_PROJECT_REF>
supabase functions deploy axia-pme-budget-assistant --project-ref <STAGING_PROJECT_REF>
```

Funcoes adicionais existentes podem ser implantadas conforme o roteiro E2E:

```bash
supabase functions deploy pme-budget-calculate --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-project-calculate-summary --project-ref <STAGING_PROJECT_REF>
supabase functions deploy pme-dashboard-summary --project-ref <STAGING_PROJECT_REF>
```

## 7. Configurar Secrets

Configurar secrets sem commitar valores:

```bash
supabase secrets set SUPABASE_URL="https://<STAGING_PROJECT_REF>.supabase.co" --project-ref <STAGING_PROJECT_REF>
supabase secrets set SUPABASE_ANON_KEY="<STAGING_ANON_KEY>" --project-ref <STAGING_PROJECT_REF>
```

Se algum provedor externo for usado depois, adicionar secrets especificos. A Axia atual de staging nao deve receber CPF, dados bancarios, tokens ou dados sensiveis desnecessarios.

## 8. Criar Buckets Privados

Os buckets sao declarados em `supabase/config.toml` e criados pela migration `20260627000700_prepare_staging_rls_helpers_and_storage.sql`.

Buckets esperados:

- `project-photos`
- `project-attachments`
- `budget-proposals`
- `project-reports`
- `purchase-attachments`
- `daily-log-photos`

Confirmar:

```sql
select id, name, public
from storage.buckets
where id in (
  'project-photos',
  'project-attachments',
  'budget-proposals',
  'project-reports',
  'purchase-attachments',
  'daily-log-photos'
)
order by id;
```

Todos devem estar com `public = false`.

## 9. Testar RLS

Validar isolamento minimo:

1. Login como `admin@obrasys.local`.
2. Ler Organizacao A e dados PME demo.
3. Login como `sem-financeiro@obrasys.local`.
4. Confirmar leitura basica autorizada e ausencia de permissoes de gestao financeira.
5. Criar usuario que pertence apenas a Organizacao B.
6. Confirmar que ele nao enxerga dados da Organizacao A.

SQL de apoio:

```sql
select public.is_org_member('10000000-0000-0000-0000-000000000001');
select public.get_user_role('10000000-0000-0000-0000-000000000001');
select public.can_view_internal_costs('10000000-0000-0000-0000-000000000001');
select public.can_manage_budget('10000000-0000-0000-0000-000000000001');
select public.can_close_project('10000000-0000-0000-0000-000000000001');
```

## 10. Testar Storage Com Signed URLs

Paths devem comecar com `organization_id/`.

Exemplo valido:

```text
10000000-0000-0000-0000-000000000001/projects/30000000-0000-0000-0000-000000000001/photo.jpg
```

Validar:

1. Upload no bucket `project-photos` como gestor da Organizacao A.
2. Gerar signed URL.
3. Acessar signed URL.
4. Tentar upload/leitura com usuario sem membership da Organizacao A.
5. Confirmar bloqueio cross-tenant.

## 11. Rodar Fluxo E2E

Fluxo minimo:

1. Login admin.
2. Abrir orcamento PME demo.
3. Gerar proposta sanitizada via `pme-budget-generate-proposal`.
4. Converter orcamento aprovado em obra via `pme-budget-convert-to-project`.
5. Criar custo real via `pme-project-create-actual-cost`.
6. Criar recebimento via `pme-project-create-receipt`.
7. Criar/fechar diario via `pme-project-lock-daily-log`.
8. Gerar relatorio via `pme-project-generate-report`.
9. Gerar notificacoes via `pme-notifications-generate`.
10. Testar Axia via `axia-pme-budget-assistant`, confirmando que sugestoes ficam consultivas/draft.

## 12. Checklist Final

Rodar localmente antes de liberar staging para homologacao:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Registrar o resultado em `docs/staging-validation-report-template.md`.
