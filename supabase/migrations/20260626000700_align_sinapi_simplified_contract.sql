-- Alinha SINAPI Simplificado ao contrato de Orçamentos PME.
-- A migration é incremental: preserva a estrutura anterior e adiciona o contrato canônico novo.

create table if not exists public.sinapi_states (
  id uuid primary key default gen_random_uuid(),
  uf char(2) not null unique,
  name text not null,
  region text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sinapi_states_uf_check check (uf ~ '^[A-Z]{2}$'),
  constraint sinapi_states_name_check check (length(trim(name)) > 0),
  constraint sinapi_states_region_check check (length(trim(region)) > 0)
);

alter table public.sinapi_versions
  add column if not exists uf char(2),
  add column if not exists status text not null default 'published';

update public.sinapi_versions
set uf = state_code
where uf is null;

alter table public.sinapi_versions
  alter column uf set not null,
  add constraint sinapi_versions_uf_check check (uf ~ '^[A-Z]{2}$') not valid,
  add constraint sinapi_versions_status_check check (
    status in ('draft', 'processing', 'published', 'failed', 'archived')
  ) not valid;

alter table public.sinapi_import_batches
  add column if not exists uf char(2),
  add column if not exists source_file_url text;

update public.sinapi_import_batches
set uf = state_code
where uf is null;

alter table public.sinapi_import_batches
  alter column uf set not null,
  add constraint sinapi_import_batches_uf_check check (uf ~ '^[A-Z]{2}$') not valid,
  drop constraint if exists sinapi_import_batches_status_check,
  add constraint sinapi_import_batches_status_check check (
    status in ('draft', 'processing', 'published', 'failed', 'archived')
  ) not valid;

alter table public.sinapi_compositions
  add column if not exists version_id uuid references public.sinapi_versions(id) on delete restrict,
  add column if not exists uf char(2),
  add column if not exists reference_month integer,
  add column if not exists reference_year integer,
  add column if not exists regime text not null default 'nao_desonerado',
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists labor_cost numeric(14, 2),
  add column if not exists material_cost numeric(14, 2),
  add column if not exists equipment_cost numeric(14, 2),
  add column if not exists is_active boolean not null default true;

update public.sinapi_compositions c
set
  version_id = coalesce(c.version_id, p.version_id),
  uf = coalesce(c.uf, p.state_code),
  reference_month = coalesce(c.reference_month, p.reference_month),
  reference_year = coalesce(c.reference_year, p.reference_year),
  total_cost = coalesce(nullif(c.total_cost, 0), p.unit_cost)
from public.sinapi_prices p
where p.composition_id = c.id;

alter table public.sinapi_compositions
  add constraint sinapi_compositions_uf_check check (uf is null or uf ~ '^[A-Z]{2}$') not valid,
  add constraint sinapi_compositions_reference_month_check check (
    reference_month is null or (reference_month >= 1 and reference_month <= 12)
  ) not valid,
  add constraint sinapi_compositions_reference_year_check check (
    reference_year is null or reference_year >= 2000
  ) not valid,
  add constraint sinapi_compositions_regime_check check (
    regime in ('desonerado', 'nao_desonerado')
  ) not valid,
  add constraint sinapi_compositions_total_cost_check check (total_cost >= 0) not valid,
  add constraint sinapi_compositions_labor_cost_check check (
    labor_cost is null or labor_cost >= 0
  ) not valid,
  add constraint sinapi_compositions_material_cost_check check (
    material_cost is null or material_cost >= 0
  ) not valid,
  add constraint sinapi_compositions_equipment_cost_check check (
    equipment_cost is null or equipment_cost >= 0
  ) not valid;

alter table public.sinapi_composition_items
  alter column input_id drop not null,
  add column if not exists input_code text,
  add column if not exists coefficient numeric(14, 6),
  add column if not exists unit_cost numeric(14, 2) not null default 0,
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists item_type text not null default 'outro',
  add column if not exists description text;

update public.sinapi_composition_items ci
set
  input_code = coalesce(ci.input_code, i.code),
  description = coalesce(ci.description, i.description),
  coefficient = coalesce(ci.coefficient, ci.quantity),
  item_type = case
    when ci.item_role = 'labor' then 'mao_de_obra'
    when ci.item_role = 'material' then 'material'
    when ci.item_role = 'equipment' then 'equipamento'
    when ci.item_role = 'component' then 'outro'
    else 'outro'
  end
from public.sinapi_inputs i
where ci.input_id = i.id;

alter table public.sinapi_composition_items
  alter column description set not null,
  alter column coefficient set not null,
  add constraint sinapi_composition_items_coefficient_check check (coefficient > 0) not valid,
  add constraint sinapi_composition_items_unit_cost_check check (unit_cost >= 0) not valid,
  add constraint sinapi_composition_items_total_cost_check check (total_cost >= 0) not valid,
  add constraint sinapi_composition_items_item_type_check check (
    item_type in ('material', 'mao_de_obra', 'equipamento', 'servico', 'outro')
  ) not valid;

alter table public.sinapi_inputs
  add column if not exists version_id uuid references public.sinapi_versions(id) on delete restrict,
  add column if not exists uf char(2),
  add column if not exists reference_month integer,
  add column if not exists reference_year integer,
  add column if not exists regime text not null default 'nao_desonerado',
  add column if not exists unit_cost numeric(14, 2) not null default 0,
  add column if not exists is_active boolean not null default true;

alter table public.sinapi_inputs
  add constraint sinapi_inputs_uf_check check (uf is null or uf ~ '^[A-Z]{2}$') not valid,
  add constraint sinapi_inputs_reference_month_check check (
    reference_month is null or (reference_month >= 1 and reference_month <= 12)
  ) not valid,
  add constraint sinapi_inputs_reference_year_check check (
    reference_year is null or reference_year >= 2000
  ) not valid,
  add constraint sinapi_inputs_regime_check check (regime in ('desonerado', 'nao_desonerado')) not valid,
  add constraint sinapi_inputs_unit_cost_check check (unit_cost >= 0) not valid;

alter table public.sinapi_prices
  add column if not exists uf char(2),
  add column if not exists regime text not null default 'nao_desonerado',
  add column if not exists code text,
  add column if not exists description text,
  add column if not exists unit text,
  add column if not exists price_type text;

update public.sinapi_prices p
set
  uf = coalesce(p.uf, p.state_code),
  code = coalesce(p.code, c.code, i.code),
  description = coalesce(p.description, c.description, i.description),
  unit = coalesce(p.unit, c.unit, i.unit),
  price_type = coalesce(p.price_type, case when p.composition_id is not null then 'composicao' else 'insumo' end)
from public.sinapi_compositions c
full join public.sinapi_inputs i on false
where (p.composition_id = c.id or p.input_id = i.id);

alter table public.sinapi_prices
  add constraint sinapi_prices_uf_check check (uf is null or uf ~ '^[A-Z]{2}$') not valid,
  add constraint sinapi_prices_regime_check check (regime in ('desonerado', 'nao_desonerado')) not valid,
  add constraint sinapi_prices_price_type_check check (price_type in ('composicao', 'insumo')) not valid;

alter table public.pme_saved_sinapi_items
  alter column budget_id drop not null,
  alter column sinapi_composition_id drop not null,
  add column if not exists sinapi_composition_id_new uuid references public.sinapi_compositions(id) on delete restrict,
  add column if not exists uf char(2),
  add column if not exists regime text not null default 'nao_desonerado',
  add column if not exists original_unit text,
  add column if not exists original_total_cost numeric(14, 2),
  add column if not exists original_labor_cost numeric(14, 2),
  add column if not exists original_material_cost numeric(14, 2),
  add column if not exists original_equipment_cost numeric(14, 2),
  add column if not exists adapted_description text,
  add column if not exists adapted_unit text,
  add column if not exists adapted_unit_cost numeric(14, 2),
  add column if not exists saved_to_catalog_item_id uuid,
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

update public.pme_saved_sinapi_items
set
  uf = coalesce(uf, state_code),
  sinapi_composition_id_new = coalesce(sinapi_composition_id_new, sinapi_composition_id),
  original_total_cost = coalesce(original_total_cost, original_unit_cost),
  adapted_description = coalesce(adapted_description, sinapi_description),
  adapted_unit_cost = coalesce(adapted_unit_cost, original_unit_cost),
  adapted_unit_price = adapted_unit_price,
  adapted_unit = coalesce(adapted_unit, (snapshot ->> 'unit')),
  original_unit = coalesce(original_unit, (snapshot ->> 'unit')),
  created_at = coalesce(created_at, used_at);

alter table public.pme_saved_sinapi_items
  add constraint pme_saved_sinapi_items_uf_check check (uf is null or uf ~ '^[A-Z]{2}$') not valid,
  add constraint pme_saved_sinapi_items_regime_check check (
    regime in ('desonerado', 'nao_desonerado')
  ) not valid,
  add constraint pme_saved_sinapi_items_original_total_cost_check check (
    original_total_cost is null or original_total_cost >= 0
  ) not valid,
  add constraint pme_saved_sinapi_items_adapted_unit_cost_check check (
    adapted_unit_cost is null or adapted_unit_cost >= 0
  ) not valid;

create table if not exists public.pme_budget_sinapi_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid not null references public.pme_budgets(id) on delete cascade,
  budget_item_id uuid not null,
  sinapi_composition_id uuid references public.sinapi_compositions(id) on delete restrict,
  sinapi_code text not null,
  sinapi_description text not null,
  uf char(2) not null,
  reference_month integer not null,
  reference_year integer not null,
  regime text not null,
  original_unit text not null,
  original_total_cost numeric(14, 2) not null,
  original_labor_cost numeric(14, 2),
  original_material_cost numeric(14, 2),
  original_equipment_cost numeric(14, 2),
  adapted_description text not null,
  adapted_unit text not null,
  adapted_quantity numeric(14, 4) not null,
  adapted_unit_cost numeric(14, 2) not null,
  adapted_unit_price numeric(14, 2) not null,
  waste_percentage numeric(7, 4) not null default 0,
  productivity_adjustment_percentage numeric(7, 4) not null default 0,
  margin_percentage numeric(7, 4) not null default 0,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_budget_sinapi_snapshots_code_check check (length(trim(sinapi_code)) > 0),
  constraint pme_budget_sinapi_snapshots_description_check check (
    length(trim(sinapi_description)) > 0
  ),
  constraint pme_budget_sinapi_snapshots_uf_check check (uf ~ '^[A-Z]{2}$'),
  constraint pme_budget_sinapi_snapshots_reference_month_check check (
    reference_month >= 1 and reference_month <= 12
  ),
  constraint pme_budget_sinapi_snapshots_reference_year_check check (reference_year >= 2000),
  constraint pme_budget_sinapi_snapshots_regime_check check (
    regime in ('desonerado', 'nao_desonerado')
  ),
  constraint pme_budget_sinapi_snapshots_original_total_cost_check check (original_total_cost >= 0),
  constraint pme_budget_sinapi_snapshots_adapted_quantity_check check (adapted_quantity > 0),
  constraint pme_budget_sinapi_snapshots_adapted_unit_cost_check check (adapted_unit_cost >= 0),
  constraint pme_budget_sinapi_snapshots_adapted_unit_price_check check (adapted_unit_price >= 0),
  constraint pme_budget_sinapi_snapshots_waste_check check (
    waste_percentage >= 0 and waste_percentage <= 100
  ),
  constraint pme_budget_sinapi_snapshots_productivity_check check (
    productivity_adjustment_percentage >= -90 and productivity_adjustment_percentage <= 300
  ),
  constraint pme_budget_sinapi_snapshots_margin_check check (
    margin_percentage >= 0 and margin_percentage <= 100
  ),
  constraint pme_budget_sinapi_snapshots_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_budget_sinapi_snapshots_item_org_fk foreign key (
    organization_id,
    budget_item_id
  ) references public.pme_budget_items(organization_id, id) on delete restrict
);

create index if not exists sinapi_states_uf_idx
  on public.sinapi_states(uf)
  where is_active = true;
create index if not exists sinapi_versions_uf_reference_idx
  on public.sinapi_versions(uf, reference_year, reference_month, regime, status);
create index if not exists sinapi_import_batches_uf_reference_idx
  on public.sinapi_import_batches(uf, reference_year, reference_month, regime, status);
create index if not exists sinapi_compositions_reference_idx
  on public.sinapi_compositions(uf, reference_year, reference_month, regime, code)
  where is_active = true;
create index if not exists sinapi_compositions_description_trgm_idx
  on public.sinapi_compositions using gin (
    to_tsvector('portuguese', coalesce(code, '') || ' ' || coalesce(description, ''))
  );
create index if not exists sinapi_inputs_reference_idx
  on public.sinapi_inputs(uf, reference_year, reference_month, regime, code)
  where is_active = true;
create index if not exists sinapi_prices_reference_idx
  on public.sinapi_prices(uf, reference_year, reference_month, regime, code, price_type);
create index if not exists pme_saved_sinapi_items_org_reference_idx
  on public.pme_saved_sinapi_items(organization_id, uf, reference_year, reference_month, regime);
create index if not exists pme_budget_sinapi_snapshots_budget_idx
  on public.pme_budget_sinapi_snapshots(organization_id, budget_id, budget_item_id);
create index if not exists pme_budget_sinapi_snapshots_reference_idx
  on public.pme_budget_sinapi_snapshots(organization_id, uf, reference_year, reference_month, regime);

alter table public.sinapi_states enable row level security;
alter table public.pme_budget_sinapi_snapshots enable row level security;

drop policy if exists "Authenticated users can read SINAPI versions"
on public.sinapi_versions;
drop policy if exists "Authenticated users can read SINAPI import batches"
on public.sinapi_import_batches;
drop policy if exists "Authenticated users can read SINAPI inputs"
on public.sinapi_inputs;
drop policy if exists "Authenticated users can read SINAPI compositions"
on public.sinapi_compositions;
drop policy if exists "Authenticated users can read SINAPI composition items"
on public.sinapi_composition_items;
drop policy if exists "Authenticated users can read SINAPI prices"
on public.sinapi_prices;

create policy "Authenticated users can read active SINAPI states"
on public.sinapi_states
for select
to authenticated
using (is_active = true);

create policy "Authenticated users can read published SINAPI versions"
on public.sinapi_versions
for select
to authenticated
using (status = 'published');

create policy "Authenticated users can read published SINAPI import batches"
on public.sinapi_import_batches
for select
to authenticated
using (status = 'published');

create policy "Authenticated users can read active SINAPI inputs"
on public.sinapi_inputs
for select
to authenticated
using (is_active = true);

create policy "Authenticated users can read active SINAPI compositions"
on public.sinapi_compositions
for select
to authenticated
using (is_active = true);

create policy "Authenticated users can read SINAPI composition items"
on public.sinapi_composition_items
for select
to authenticated
using (true);

create policy "Authenticated users can read SINAPI published prices"
on public.sinapi_prices
for select
to authenticated
using (
  exists (
    select 1
    from public.sinapi_versions v
    where v.id = sinapi_prices.version_id
      and v.status = 'published'
  )
);

create policy "Members can read PME budget SINAPI snapshots"
on public.pme_budget_sinapi_snapshots
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME budget SINAPI snapshots"
on public.pme_budget_sinapi_snapshots
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

insert into public.sinapi_states (uf, name, region)
values
  ('AC', 'Acre', 'Norte'),
  ('AL', 'Alagoas', 'Nordeste'),
  ('AP', 'Amapá', 'Norte'),
  ('AM', 'Amazonas', 'Norte'),
  ('BA', 'Bahia', 'Nordeste'),
  ('CE', 'Ceará', 'Nordeste'),
  ('DF', 'Distrito Federal', 'Centro-Oeste'),
  ('ES', 'Espírito Santo', 'Sudeste'),
  ('GO', 'Goiás', 'Centro-Oeste'),
  ('MA', 'Maranhão', 'Nordeste'),
  ('MT', 'Mato Grosso', 'Centro-Oeste'),
  ('MS', 'Mato Grosso do Sul', 'Centro-Oeste'),
  ('MG', 'Minas Gerais', 'Sudeste'),
  ('PA', 'Pará', 'Norte'),
  ('PB', 'Paraíba', 'Nordeste'),
  ('PR', 'Paraná', 'Sul'),
  ('PE', 'Pernambuco', 'Nordeste'),
  ('PI', 'Piauí', 'Nordeste'),
  ('RJ', 'Rio de Janeiro', 'Sudeste'),
  ('RN', 'Rio Grande do Norte', 'Nordeste'),
  ('RS', 'Rio Grande do Sul', 'Sul'),
  ('RO', 'Rondônia', 'Norte'),
  ('RR', 'Roraima', 'Norte'),
  ('SC', 'Santa Catarina', 'Sul'),
  ('SP', 'São Paulo', 'Sudeste'),
  ('SE', 'Sergipe', 'Nordeste'),
  ('TO', 'Tocantins', 'Norte')
on conflict (uf) do update
set name = excluded.name,
    region = excluded.region,
    is_active = true;
