-- Conversao de Orcamento PME aprovado em Obra/Projeto.
-- Estrutura staging ate a integracao com o motor financeiro completo.

alter table public.projects
  add column if not exists source_module text,
  add column if not exists source_id uuid,
  add column if not exists work_address text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'projects_source_module_check'
  ) then
    alter table public.projects
      add constraint projects_source_module_check check (
        source_module is null
        or source_module in ('pme_budget')
      );
  end if;
end $$;

create unique index if not exists projects_pme_budget_source_unique
  on public.projects(organization_id, source_module, source_id)
  where source_module = 'pme_budget' and source_id is not null;

create index if not exists pme_budgets_converted_project_id_idx
  on public.pme_budgets(converted_project_id)
  where converted_project_id is not null;

create table if not exists public.pme_project_budget_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_pme_budget_id uuid not null references public.pme_budgets(id) on delete restrict,
  version_code text not null,
  title text not null,
  subtotal_cost numeric(14, 2) not null default 0,
  final_price numeric(14, 2) not null default 0,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_project_budget_snapshots_version_code_check check (length(trim(version_code)) > 0),
  constraint pme_project_budget_snapshots_title_check check (length(trim(title)) > 0),
  constraint pme_project_budget_snapshots_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_project_budget_snapshots_final_price_check check (final_price >= 0),
  constraint pme_project_budget_snapshots_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_budget_snapshots_budget_org_fk foreign key (organization_id, source_pme_budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_cost_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_pme_budget_id uuid not null references public.pme_budgets(id) on delete restrict,
  source_budget_item_id uuid references public.pme_budget_items(id) on delete set null,
  source_type text not null,
  description text not null,
  category text,
  quantity numeric(14, 4) not null default 1,
  unit text not null,
  unit_cost numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  expected_date date,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  constraint pme_project_cost_forecasts_source_type_check check (
    source_type in ('item', 'material', 'labor', 'third_party', 'sinapi_snapshot', 'manual')
  ),
  constraint pme_project_cost_forecasts_description_check check (length(trim(description)) > 0),
  constraint pme_project_cost_forecasts_quantity_check check (quantity > 0),
  constraint pme_project_cost_forecasts_unit_check check (length(trim(unit)) > 0),
  constraint pme_project_cost_forecasts_unit_cost_check check (unit_cost >= 0),
  constraint pme_project_cost_forecasts_total_cost_check check (total_cost >= 0),
  constraint pme_project_cost_forecasts_status_check check (
    status in ('planned', 'committed', 'realized', 'cancelled')
  ),
  constraint pme_project_cost_forecasts_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_cost_forecasts_budget_org_fk foreign key (organization_id, source_pme_budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_receivable_forecasts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_pme_budget_id uuid not null references public.pme_budgets(id) on delete restrict,
  source_payment_term_id uuid references public.pme_budget_payment_terms(id) on delete set null,
  installment_number integer not null,
  description text not null,
  percentage numeric(7, 4),
  amount numeric(14, 2) not null default 0,
  due_condition text not null,
  due_date date,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  constraint pme_project_receivable_forecasts_installment_check check (installment_number > 0),
  constraint pme_project_receivable_forecasts_description_check check (length(trim(description)) > 0),
  constraint pme_project_receivable_forecasts_percentage_check check (
    percentage is null or (percentage >= 0 and percentage <= 100)
  ),
  constraint pme_project_receivable_forecasts_amount_check check (amount >= 0),
  constraint pme_project_receivable_forecasts_due_condition_check check (length(trim(due_condition)) > 0),
  constraint pme_project_receivable_forecasts_status_check check (
    status in ('planned', 'invoiced', 'received', 'overdue', 'cancelled')
  ),
  constraint pme_project_receivable_forecasts_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_receivable_forecasts_budget_org_fk foreign key (organization_id, source_pme_budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.pme_budget_conversion_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,
  converted_by uuid not null references auth.users(id) on delete restrict,
  converted_at timestamptz not null default now(),
  status text not null,
  source_budget_status text not null,
  source_budget_final_price numeric(14, 2) not null default 0,
  source_budget_subtotal_cost numeric(14, 2) not null default 0,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint pme_budget_conversion_logs_status_check check (
    status in ('success', 'failed', 'rolled_back')
  ),
  constraint pme_budget_conversion_logs_source_status_check check (length(trim(source_budget_status)) > 0),
  constraint pme_budget_conversion_logs_final_price_check check (source_budget_final_price >= 0),
  constraint pme_budget_conversion_logs_subtotal_cost_check check (source_budget_subtotal_cost >= 0),
  constraint pme_budget_conversion_logs_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict,
  constraint pme_budget_conversion_logs_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete restrict
);

create unique index if not exists pme_project_budget_snapshots_budget_unique
  on public.pme_project_budget_snapshots(organization_id, source_pme_budget_id);

create unique index if not exists pme_budget_conversion_logs_success_unique
  on public.pme_budget_conversion_logs(organization_id, budget_id)
  where status = 'success';

create index if not exists pme_project_budget_snapshots_project_idx
  on public.pme_project_budget_snapshots(organization_id, project_id);

create index if not exists pme_project_cost_forecasts_project_idx
  on public.pme_project_cost_forecasts(organization_id, project_id);

create index if not exists pme_project_cost_forecasts_budget_idx
  on public.pme_project_cost_forecasts(organization_id, source_pme_budget_id);

create index if not exists pme_project_receivable_forecasts_project_idx
  on public.pme_project_receivable_forecasts(organization_id, project_id);

create index if not exists pme_project_receivable_forecasts_budget_idx
  on public.pme_project_receivable_forecasts(organization_id, source_pme_budget_id);

create index if not exists pme_budget_conversion_logs_budget_idx
  on public.pme_budget_conversion_logs(organization_id, budget_id, converted_at desc);

alter table public.pme_project_budget_snapshots enable row level security;
alter table public.pme_project_cost_forecasts enable row level security;
alter table public.pme_project_receivable_forecasts enable row level security;
alter table public.pme_budget_conversion_logs enable row level security;

create policy "Members can read PME project budget snapshots"
on public.pme_project_budget_snapshots
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME project budget snapshots"
on public.pme_project_budget_snapshots
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Members can read PME project cost forecasts"
on public.pme_project_cost_forecasts
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME project cost forecasts"
on public.pme_project_cost_forecasts
for insert
to authenticated
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project receivable forecasts"
on public.pme_project_receivable_forecasts
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME project receivable forecasts"
on public.pme_project_receivable_forecasts
for insert
to authenticated
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME budget conversion logs"
on public.pme_budget_conversion_logs
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME budget conversion logs"
on public.pme_budget_conversion_logs
for insert
to authenticated
with check (
  converted_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);
