-- SINAPI simplificado para Orçamentos PME.
-- Prerequisites: Core SaaS multi-tenant, Orçamentos PME e Meu Catálogo.

create table if not exists public.sinapi_versions (
  id uuid primary key default gen_random_uuid(),
  state_code char(2) not null,
  reference_month integer not null,
  reference_year integer not null,
  regime text not null default 'nao_desonerado',
  source_label text not null,
  published_at date,
  created_at timestamptz not null default now(),
  constraint sinapi_versions_state_code_check check (state_code ~ '^[A-Z]{2}$'),
  constraint sinapi_versions_reference_month_check check (
    reference_month >= 1 and reference_month <= 12
  ),
  constraint sinapi_versions_reference_year_check check (reference_year >= 2000),
  constraint sinapi_versions_regime_check check (regime in ('desonerado', 'nao_desonerado')),
  constraint sinapi_versions_unique unique (
    state_code,
    reference_month,
    reference_year,
    regime
  )
);

create table if not exists public.sinapi_import_batches (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sinapi_versions(id) on delete restrict,
  state_code char(2) not null,
  reference_month integer not null,
  reference_year integer not null,
  regime text not null,
  source_file_name text,
  status text not null default 'draft',
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  constraint sinapi_import_batches_state_code_check check (state_code ~ '^[A-Z]{2}$'),
  constraint sinapi_import_batches_reference_month_check check (
    reference_month >= 1 and reference_month <= 12
  ),
  constraint sinapi_import_batches_reference_year_check check (reference_year >= 2000),
  constraint sinapi_import_batches_regime_check check (regime in ('desonerado', 'nao_desonerado')),
  constraint sinapi_import_batches_status_check check (
    status in ('draft', 'imported', 'failed', 'archived')
  )
);

create table if not exists public.sinapi_inputs (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null,
  input_type text not null,
  unit text not null,
  created_at timestamptz not null default now(),
  constraint sinapi_inputs_code_check check (length(trim(code)) > 0),
  constraint sinapi_inputs_description_check check (length(trim(description)) > 0),
  constraint sinapi_inputs_input_type_check check (
    input_type in ('material', 'labor', 'equipment', 'transport', 'service', 'other')
  ),
  constraint sinapi_inputs_unit_check check (length(trim(unit)) > 0),
  constraint sinapi_inputs_code_unique unique (code)
);

create table if not exists public.sinapi_compositions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text not null,
  unit text not null,
  category text,
  created_at timestamptz not null default now(),
  constraint sinapi_compositions_code_check check (length(trim(code)) > 0),
  constraint sinapi_compositions_description_check check (length(trim(description)) > 0),
  constraint sinapi_compositions_unit_check check (length(trim(unit)) > 0),
  constraint sinapi_compositions_code_unique unique (code)
);

create table if not exists public.sinapi_composition_items (
  id uuid primary key default gen_random_uuid(),
  composition_id uuid not null references public.sinapi_compositions(id) on delete cascade,
  input_id uuid not null references public.sinapi_inputs(id) on delete restrict,
  quantity numeric(14, 6) not null,
  unit text not null,
  item_role text not null default 'component',
  created_at timestamptz not null default now(),
  constraint sinapi_composition_items_quantity_check check (quantity > 0),
  constraint sinapi_composition_items_unit_check check (length(trim(unit)) > 0),
  constraint sinapi_composition_items_role_check check (
    item_role in ('component', 'labor', 'material', 'equipment', 'other')
  ),
  constraint sinapi_composition_items_unique unique (composition_id, input_id)
);

create table if not exists public.sinapi_prices (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.sinapi_versions(id) on delete restrict,
  state_code char(2) not null,
  reference_month integer not null,
  reference_year integer not null,
  composition_id uuid references public.sinapi_compositions(id) on delete cascade,
  input_id uuid references public.sinapi_inputs(id) on delete cascade,
  unit_cost numeric(14, 2) not null,
  source_label text not null,
  created_at timestamptz not null default now(),
  constraint sinapi_prices_state_code_check check (state_code ~ '^[A-Z]{2}$'),
  constraint sinapi_prices_reference_month_check check (
    reference_month >= 1 and reference_month <= 12
  ),
  constraint sinapi_prices_reference_year_check check (reference_year >= 2000),
  constraint sinapi_prices_unit_cost_check check (unit_cost >= 0),
  constraint sinapi_prices_target_check check (
    (composition_id is not null and input_id is null)
    or (composition_id is null and input_id is not null)
  ),
  constraint sinapi_prices_composition_unique unique (version_id, state_code, composition_id),
  constraint sinapi_prices_input_unique unique (version_id, state_code, input_id)
);

create table if not exists public.pme_saved_sinapi_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  budget_item_id uuid,
  catalog_item_id uuid,
  sinapi_composition_id uuid references public.sinapi_compositions(id) on delete restrict,
  sinapi_version_id uuid references public.sinapi_versions(id) on delete restrict,
  sinapi_code text not null,
  sinapi_description text not null,
  state_code char(2) not null,
  reference_month integer not null,
  reference_year integer not null,
  original_unit_cost numeric(14, 2) not null,
  adapted_unit_price numeric(14, 2) not null,
  quantity numeric(14, 4) not null default 1,
  productivity_factor numeric(10, 4) not null default 1,
  waste_percentage numeric(7, 4) not null default 0,
  margin_percentage numeric(7, 4) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  used_at timestamptz not null default now(),
  constraint pme_saved_sinapi_items_code_check check (length(trim(sinapi_code)) > 0),
  constraint pme_saved_sinapi_items_description_check check (
    length(trim(sinapi_description)) > 0
  ),
  constraint pme_saved_sinapi_items_state_code_check check (state_code ~ '^[A-Z]{2}$'),
  constraint pme_saved_sinapi_items_reference_month_check check (
    reference_month >= 1 and reference_month <= 12
  ),
  constraint pme_saved_sinapi_items_reference_year_check check (reference_year >= 2000),
  constraint pme_saved_sinapi_items_original_unit_cost_check check (original_unit_cost >= 0),
  constraint pme_saved_sinapi_items_adapted_unit_price_check check (adapted_unit_price >= 0),
  constraint pme_saved_sinapi_items_quantity_check check (quantity > 0),
  constraint pme_saved_sinapi_items_productivity_factor_check check (productivity_factor > 0),
  constraint pme_saved_sinapi_items_waste_percentage_check check (
    waste_percentage >= 0 and waste_percentage <= 100
  ),
  constraint pme_saved_sinapi_items_margin_percentage_check check (
    margin_percentage >= 0 and margin_percentage <= 100
  ),
  constraint pme_saved_sinapi_items_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_saved_sinapi_items_budget_item_org_fk foreign key (
    organization_id,
    budget_item_id
  ) references public.pme_budget_items(organization_id, id) on delete restrict,
  constraint pme_saved_sinapi_items_catalog_item_org_fk foreign key (
    organization_id,
    catalog_item_id
  ) references public.pme_catalog_items(organization_id, id) on delete restrict
);

create index if not exists sinapi_versions_reference_idx
  on public.sinapi_versions(state_code, reference_year, reference_month);
create index if not exists sinapi_compositions_search_idx
  on public.sinapi_compositions using gin (
    to_tsvector('portuguese', code || ' ' || description)
  );
create index if not exists sinapi_prices_composition_idx
  on public.sinapi_prices(state_code, reference_year, reference_month, composition_id);
create index if not exists pme_saved_sinapi_items_budget_id_idx
  on public.pme_saved_sinapi_items(budget_id);
create index if not exists pme_saved_sinapi_items_reference_idx
  on public.pme_saved_sinapi_items(organization_id, state_code, reference_year, reference_month);

alter table public.sinapi_versions enable row level security;
alter table public.sinapi_import_batches enable row level security;
alter table public.sinapi_inputs enable row level security;
alter table public.sinapi_compositions enable row level security;
alter table public.sinapi_composition_items enable row level security;
alter table public.sinapi_prices enable row level security;
alter table public.pme_saved_sinapi_items enable row level security;

create policy "Authenticated users can read SINAPI versions"
on public.sinapi_versions
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI import batches"
on public.sinapi_import_batches
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI inputs"
on public.sinapi_inputs
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI compositions"
on public.sinapi_compositions
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI composition items"
on public.sinapi_composition_items
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI prices"
on public.sinapi_prices
for select
to authenticated
using (true);

create policy "Members can read saved PME SINAPI snapshots"
on public.pme_saved_sinapi_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create saved PME SINAPI snapshots"
on public.pme_saved_sinapi_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

insert into public.sinapi_versions (
  id,
  state_code,
  reference_month,
  reference_year,
  regime,
  source_label,
  published_at
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'SP',
    6,
    2026,
    'nao_desonerado',
    'SINAPI exemplo simplificado',
    '2026-06-15'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'RJ',
    6,
    2026,
    'nao_desonerado',
    'SINAPI exemplo simplificado',
    '2026-06-15'
  )
on conflict (state_code, reference_month, reference_year, regime) do nothing;

insert into public.sinapi_import_batches (
  id,
  version_id,
  state_code,
  reference_month,
  reference_year,
  regime,
  source_file_name,
  status,
  imported_at
)
values
  (
    '00000000-0000-4000-8000-000000000311',
    '00000000-0000-4000-8000-000000000301',
    'SP',
    6,
    2026,
    'nao_desonerado',
    'sinapi-sp-2026-06-exemplo.csv',
    'imported',
    now()
  ),
  (
    '00000000-0000-4000-8000-000000000312',
    '00000000-0000-4000-8000-000000000302',
    'RJ',
    6,
    2026,
    'nao_desonerado',
    'sinapi-rj-2026-06-exemplo.csv',
    'imported',
    now()
  )
on conflict do nothing;

insert into public.sinapi_inputs (id, code, description, input_type, unit)
values
  (
    '00000000-0000-4000-8000-000000000321',
    'I-88309',
    'Pedreiro com encargos complementares',
    'labor',
    'h'
  ),
  (
    '00000000-0000-4000-8000-000000000322',
    'I-00001379',
    'Cimento Portland composto CP II-32',
    'material',
    'kg'
  )
on conflict (code) do nothing;

insert into public.sinapi_compositions (id, code, description, unit, category)
values
  (
    '00000000-0000-4000-8000-000000000331',
    '87267',
    'Revestimento cerâmico para parede com placas tipo esmaltada',
    'm2',
    'revestimento'
  ),
  (
    '00000000-0000-4000-8000-000000000332',
    '88489',
    'Aplicação manual de pintura com tinta látex acrílica em paredes',
    'm2',
    'pintura'
  )
on conflict (code) do nothing;

insert into public.sinapi_composition_items (
  composition_id,
  input_id,
  quantity,
  unit,
  item_role
)
values
  (
    '00000000-0000-4000-8000-000000000331',
    '00000000-0000-4000-8000-000000000321',
    0.72,
    'h',
    'labor'
  ),
  (
    '00000000-0000-4000-8000-000000000331',
    '00000000-0000-4000-8000-000000000322',
    4.86,
    'kg',
    'material'
  ),
  (
    '00000000-0000-4000-8000-000000000332',
    '00000000-0000-4000-8000-000000000321',
    0.21,
    'h',
    'labor'
  )
on conflict (composition_id, input_id) do nothing;

insert into public.sinapi_prices (
  version_id,
  state_code,
  reference_month,
  reference_year,
  composition_id,
  unit_cost,
  source_label
)
values
  (
    '00000000-0000-4000-8000-000000000301',
    'SP',
    6,
    2026,
    '00000000-0000-4000-8000-000000000331',
    84.35,
    'SINAPI exemplo simplificado'
  ),
  (
    '00000000-0000-4000-8000-000000000301',
    'SP',
    6,
    2026,
    '00000000-0000-4000-8000-000000000332',
    18.72,
    'SINAPI exemplo simplificado'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'RJ',
    6,
    2026,
    '00000000-0000-4000-8000-000000000331',
    88.90,
    'SINAPI exemplo simplificado'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    'RJ',
    6,
    2026,
    '00000000-0000-4000-8000-000000000332',
    19.55,
    'SINAPI exemplo simplificado'
  )
on conflict (version_id, state_code, composition_id) do nothing;
