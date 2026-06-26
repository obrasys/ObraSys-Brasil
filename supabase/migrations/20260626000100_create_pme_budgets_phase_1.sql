-- Orçamentos PME Brasil - base de banco e segurança
-- Prerequisites: Core SaaS multi-tenant migration.

create table if not exists public.pme_budgets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  converted_project_id uuid references public.projects(id) on delete set null,
  client_name text not null,
  client_phone text,
  client_email text,
  work_address text,
  budget_number text not null,
  title text not null,
  description text,
  budget_type text not null default 'service',
  status text not null default 'draft',
  pricing_mode text not null default 'margin',
  subtotal_cost numeric(14, 2) not null default 0,
  overhead_percentage numeric(7, 4) not null default 0,
  tax_percentage numeric(7, 4) not null default 0,
  profit_percentage numeric(7, 4) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  final_price numeric(14, 2) not null default 0,
  valid_until date,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budgets_status_check check (
    status in (
      'draft',
      'sent',
      'negotiation',
      'approved',
      'rejected',
      'converted_to_project',
      'cancelled'
    )
  ),
  constraint pme_budgets_budget_type_check check (
    budget_type in ('service', 'renovation', 'construction', 'maintenance')
  ),
  constraint pme_budgets_pricing_mode_check check (
    pricing_mode in ('margin', 'markup', 'fixed_price')
  ),
  constraint pme_budgets_client_name_check check (length(trim(client_name)) > 0),
  constraint pme_budgets_budget_number_check check (length(trim(budget_number)) > 0),
  constraint pme_budgets_title_check check (length(trim(title)) > 0),
  constraint pme_budgets_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budgets_overhead_percentage_check check (
    overhead_percentage >= 0 and overhead_percentage <= 100
  ),
  constraint pme_budgets_tax_percentage_check check (
    tax_percentage >= 0 and tax_percentage <= 100
  ),
  constraint pme_budgets_profit_percentage_check check (
    profit_percentage >= 0 and profit_percentage <= 100
  ),
  constraint pme_budgets_discount_amount_check check (discount_amount >= 0),
  constraint pme_budgets_final_price_check check (final_price >= 0),
  constraint pme_budgets_approved_at_check check (
    (status in ('approved', 'converted_to_project') and approved_at is not null)
    or (status not in ('approved', 'converted_to_project'))
  ),
  constraint pme_budgets_org_id_unique unique (organization_id, id),
  constraint pme_budgets_number_unique unique (organization_id, budget_number),
  constraint pme_budgets_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete restrict,
  constraint pme_budgets_converted_project_org_fk foreign key (organization_id, converted_project_id)
    references public.projects(organization_id, id) on delete restrict
);

create table if not exists public.pme_budget_environments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  subtotal_cost numeric(14, 2) not null default 0,
  final_price numeric(14, 2) not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budget_environments_name_check check (length(trim(name)) > 0),
  constraint pme_budget_environments_sort_order_check check (sort_order >= 0),
  constraint pme_budget_environments_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budget_environments_final_price_check check (final_price >= 0),
  constraint pme_budget_environments_unique_order unique (budget_id, sort_order),
  constraint pme_budget_environments_org_id_unique unique (organization_id, id),
  constraint pme_budget_environments_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade
);

create table if not exists public.pme_budget_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  environment_id uuid references public.pme_budget_environments(id) on delete restrict,
  item_type text not null default 'service',
  description text not null,
  unit text not null default 'un',
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  subtotal_cost numeric(14, 2) not null default 0,
  unit_price numeric(14, 2) not null default 0,
  final_price numeric(14, 2) not null default 0,
  is_optional boolean not null default false,
  show_on_proposal boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budget_items_type_check check (
    item_type in ('service', 'material', 'labor', 'equipment', 'other')
  ),
  constraint pme_budget_items_description_check check (length(trim(description)) > 0),
  constraint pme_budget_items_quantity_check check (quantity > 0),
  constraint pme_budget_items_unit_cost_check check (unit_cost >= 0),
  constraint pme_budget_items_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budget_items_unit_price_check check (unit_price >= 0),
  constraint pme_budget_items_final_price_check check (final_price >= 0),
  constraint pme_budget_items_sort_order_check check (sort_order >= 0),
  constraint pme_budget_items_org_id_unique unique (organization_id, id),
  constraint pme_budget_items_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_budget_items_environment_org_fk foreign key (organization_id, environment_id)
    references public.pme_budget_environments(organization_id, id) on delete restrict
);

create table if not exists public.pme_budget_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  item_id uuid not null references public.pme_budget_items(id) on delete cascade,
  description text not null,
  unit text not null default 'un',
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  subtotal_cost numeric(14, 2) not null default 0,
  supplier_name text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budget_materials_description_check check (length(trim(description)) > 0),
  constraint pme_budget_materials_quantity_check check (quantity > 0),
  constraint pme_budget_materials_unit_cost_check check (unit_cost >= 0),
  constraint pme_budget_materials_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budget_materials_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_budget_materials_item_org_fk foreign key (organization_id, item_id)
    references public.pme_budget_items(organization_id, id) on delete cascade
);

create table if not exists public.pme_budget_labor (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  item_id uuid not null references public.pme_budget_items(id) on delete cascade,
  role_name text not null,
  unit text not null default 'h',
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  subtotal_cost numeric(14, 2) not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budget_labor_role_name_check check (length(trim(role_name)) > 0),
  constraint pme_budget_labor_quantity_check check (quantity > 0),
  constraint pme_budget_labor_unit_cost_check check (unit_cost >= 0),
  constraint pme_budget_labor_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budget_labor_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_budget_labor_item_org_fk foreign key (organization_id, item_id)
    references public.pme_budget_items(organization_id, id) on delete cascade
);

create table if not exists public.pme_budget_payment_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  description text not null,
  due_offset_days integer not null default 0,
  amount numeric(14, 2),
  percentage numeric(7, 4),
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_budget_payment_terms_description_check check (length(trim(description)) > 0),
  constraint pme_budget_payment_terms_due_offset_days_check check (due_offset_days >= 0),
  constraint pme_budget_payment_terms_amount_check check (amount is null or amount >= 0),
  constraint pme_budget_payment_terms_percentage_check check (
    percentage is null or (percentage > 0 and percentage <= 100)
  ),
  constraint pme_budget_payment_terms_value_check check (
    (amount is not null and percentage is null)
    or (amount is null and percentage is not null)
  ),
  constraint pme_budget_payment_terms_sort_order_check check (sort_order >= 0),
  constraint pme_budget_payment_terms_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade
);

create table if not exists public.pme_budget_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  version_number integer not null,
  status text not null,
  subtotal_cost numeric(14, 2) not null,
  overhead_percentage numeric(7, 4) not null,
  tax_percentage numeric(7, 4) not null,
  profit_percentage numeric(7, 4) not null,
  discount_amount numeric(14, 2) not null,
  final_price numeric(14, 2) not null,
  proposal_snapshot jsonb not null default '{}'::jsonb,
  internal_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_budget_versions_number_check check (version_number > 0),
  constraint pme_budget_versions_status_check check (
    status in (
      'draft',
      'sent',
      'negotiation',
      'approved',
      'rejected',
      'converted_to_project',
      'cancelled'
    )
  ),
  constraint pme_budget_versions_subtotal_cost_check check (subtotal_cost >= 0),
  constraint pme_budget_versions_overhead_percentage_check check (
    overhead_percentage >= 0 and overhead_percentage <= 100
  ),
  constraint pme_budget_versions_tax_percentage_check check (
    tax_percentage >= 0 and tax_percentage <= 100
  ),
  constraint pme_budget_versions_profit_percentage_check check (
    profit_percentage >= 0 and profit_percentage <= 100
  ),
  constraint pme_budget_versions_discount_amount_check check (discount_amount >= 0),
  constraint pme_budget_versions_final_price_check check (final_price >= 0),
  constraint pme_budget_versions_unique unique (budget_id, version_number),
  constraint pme_budget_versions_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade
);

create table if not exists public.pme_budget_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  from_status text,
  to_status text not null,
  notes text,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint pme_budget_status_history_from_status_check check (
    from_status is null
    or from_status in (
      'draft',
      'sent',
      'negotiation',
      'approved',
      'rejected',
      'converted_to_project',
      'cancelled'
    )
  ),
  constraint pme_budget_status_history_to_status_check check (
    to_status in (
      'draft',
      'sent',
      'negotiation',
      'approved',
      'rejected',
      'converted_to_project',
      'cancelled'
    )
  ),
  constraint pme_budget_status_history_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade
);

create index if not exists pme_budgets_organization_id_idx on public.pme_budgets(organization_id);
create index if not exists pme_budgets_project_id_idx on public.pme_budgets(project_id);
create index if not exists pme_budgets_status_idx on public.pme_budgets(organization_id, status);
create index if not exists pme_budgets_valid_until_idx on public.pme_budgets(organization_id, valid_until);
create index if not exists pme_budget_environments_budget_id_idx on public.pme_budget_environments(budget_id);
create index if not exists pme_budget_items_budget_id_idx on public.pme_budget_items(budget_id);
create index if not exists pme_budget_items_environment_id_idx on public.pme_budget_items(environment_id);
create index if not exists pme_budget_materials_item_id_idx on public.pme_budget_materials(item_id);
create index if not exists pme_budget_labor_item_id_idx on public.pme_budget_labor(item_id);
create index if not exists pme_budget_payment_terms_budget_id_idx on public.pme_budget_payment_terms(budget_id);
create index if not exists pme_budget_versions_budget_id_idx on public.pme_budget_versions(budget_id);
create index if not exists pme_budget_status_history_budget_id_idx
  on public.pme_budget_status_history(budget_id, changed_at desc);

create trigger pme_budgets_touch_updated_at
before update on public.pme_budgets
for each row execute function public.touch_updated_at();

create trigger pme_budget_environments_touch_updated_at
before update on public.pme_budget_environments
for each row execute function public.touch_updated_at();

create trigger pme_budget_items_touch_updated_at
before update on public.pme_budget_items
for each row execute function public.touch_updated_at();

create trigger pme_budget_materials_touch_updated_at
before update on public.pme_budget_materials
for each row execute function public.touch_updated_at();

create trigger pme_budget_labor_touch_updated_at
before update on public.pme_budget_labor
for each row execute function public.touch_updated_at();

create trigger pme_budget_payment_terms_touch_updated_at
before update on public.pme_budget_payment_terms
for each row execute function public.touch_updated_at();

alter table public.pme_budgets enable row level security;
alter table public.pme_budget_environments enable row level security;
alter table public.pme_budget_items enable row level security;
alter table public.pme_budget_materials enable row level security;
alter table public.pme_budget_labor enable row level security;
alter table public.pme_budget_payment_terms enable row level security;
alter table public.pme_budget_versions enable row level security;
alter table public.pme_budget_status_history enable row level security;

create policy "Members can read PME budgets"
on public.pme_budgets
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME budgets"
on public.pme_budgets
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME budgets"
on public.pme_budgets
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Admins can delete draft or cancelled PME budgets"
on public.pme_budgets
for delete
to authenticated
using (
  status in ('draft', 'cancelled')
  and public.has_organization_role(organization_id, array['owner', 'admin'])
);

create policy "Members can read PME environments"
on public.pme_budget_environments
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME environments"
on public.pme_budget_environments
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME environments"
on public.pme_budget_environments
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME environments"
on public.pme_budget_environments
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME items"
on public.pme_budget_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME items"
on public.pme_budget_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME items"
on public.pme_budget_items
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME items"
on public.pme_budget_items
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME materials"
on public.pme_budget_materials
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME materials"
on public.pme_budget_materials
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME materials"
on public.pme_budget_materials
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME materials"
on public.pme_budget_materials
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME labor"
on public.pme_budget_labor
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME labor"
on public.pme_budget_labor
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME labor"
on public.pme_budget_labor
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME labor"
on public.pme_budget_labor
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME payment terms"
on public.pme_budget_payment_terms
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME payment terms"
on public.pme_budget_payment_terms
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME payment terms"
on public.pme_budget_payment_terms
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME payment terms"
on public.pme_budget_payment_terms
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME budget versions"
on public.pme_budget_versions
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME budget versions"
on public.pme_budget_versions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Members can read PME budget status history"
on public.pme_budget_status_history
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME budget status history"
on public.pme_budget_status_history
for insert
to authenticated
with check (
  changed_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);
