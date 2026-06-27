-- Align Meu Catalogo PME with the approved reusable catalog contract.
-- Incremental migration: keeps the original catalog migration intact.

alter table public.pme_catalog_items
  add column if not exists category text not null default 'servico',
  add column if not exists default_unit_cost numeric(14, 2) not null default 0,
  add column if not exists default_unit_price numeric(14, 2) not null default 0,
  add column if not exists default_margin_percentage numeric(7, 4) not null default 0,
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_reference_id uuid,
  add column if not exists sinapi_code text,
  add column if not exists uf text,
  add column if not exists reference_month integer,
  add column if not exists reference_year integer;

update public.pme_catalog_items
set
  category = case item_type
    when 'material' then 'material'
    when 'labor' then 'mao_de_obra'
    when 'service' then 'servico'
    when 'third_party' then 'terceiro'
    when 'equipment' then 'equipamento'
    when 'transport' then 'transporte'
    when 'disposal' then 'descarte'
    when 'fee' then 'taxa'
    else 'outro'
  end,
  default_unit_cost = unit_cost,
  default_unit_price = unit_price,
  source_type = origin
where default_unit_cost = 0
  and default_unit_price = 0;

alter table public.pme_catalog_compositions
  add column if not exists total_unit_cost numeric(14, 2) not null default 0,
  add column if not exists total_unit_price numeric(14, 2) not null default 0,
  add column if not exists default_margin_percentage numeric(7, 4) not null default 0;

update public.pme_catalog_compositions
set
  total_unit_cost = total_cost,
  total_unit_price = total_price
where total_unit_cost = 0
  and total_unit_price = 0;

alter table public.pme_catalog_composition_items
  add column if not exists description text,
  add column if not exists category text not null default 'servico',
  add column if not exists unit text not null default 'un',
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists total_price numeric(14, 2) not null default 0;

alter table public.pme_catalog_composition_items
  alter column catalog_item_id drop not null;

update public.pme_catalog_composition_items
set
  total_cost = round(quantity * unit_cost, 2),
  total_price = round(quantity * unit_price, 2)
where total_cost = 0
  and total_price = 0;

alter table public.pme_catalog_kits
  add column if not exists kit_type text not null default 'personalizado',
  add column if not exists default_environment text,
  add column if not exists total_estimated_cost numeric(14, 2) not null default 0,
  add column if not exists total_estimated_price numeric(14, 2) not null default 0;

update public.pme_catalog_kits
set
  kit_type = case category
    when 'bathroom_renovation' then 'reforma_banheiro'
    when 'kitchen_renovation' then 'reforma_cozinha'
    when 'painting' then 'pintura'
    when 'flooring' then 'troca_piso'
    else 'personalizado'
  end,
  total_estimated_cost = total_cost,
  total_estimated_price = total_price
where total_estimated_cost = 0
  and total_estimated_price = 0;

alter table public.pme_catalog_kit_items
  add column if not exists description text,
  add column if not exists category text not null default 'servico',
  add column if not exists unit text not null default 'un',
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists total_price numeric(14, 2) not null default 0,
  add column if not exists is_optional boolean not null default false;

update public.pme_catalog_kit_items
set
  total_cost = round(quantity * unit_cost, 2),
  total_price = round(quantity * unit_price, 2)
where total_cost = 0
  and total_price = 0;

create table if not exists public.pme_catalog_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  notes text,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint pme_catalog_status_history_entity_type_check check (
    entity_type in ('item', 'composition', 'kit')
  ),
  constraint pme_catalog_status_history_status_check check (
    to_status in ('active', 'inactive')
    and (from_status is null or from_status in ('active', 'inactive'))
  )
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_category_v2_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_category_v2_check check (
        category in (
          'material',
          'mao_de_obra',
          'servico',
          'terceiro',
          'equipamento',
          'transporte',
          'descarte',
          'taxa',
          'composicao',
          'outro'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_source_type_v2_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_source_type_v2_check check (
        source_type in (
          'manual',
          'sinapi',
          'supplier_quote',
          'axia_suggestion',
          'imported',
          'budget_item'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_default_unit_cost_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_default_unit_cost_check check (default_unit_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_default_unit_price_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_default_unit_price_check check (default_unit_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_default_margin_percentage_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_default_margin_percentage_check check (
        default_margin_percentage >= 0 and default_margin_percentage <= 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_items_reference_month_check'
  ) then
    alter table public.pme_catalog_items
      add constraint pme_catalog_items_reference_month_check check (
        reference_month is null or (reference_month >= 1 and reference_month <= 12)
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_compositions_total_unit_cost_check'
  ) then
    alter table public.pme_catalog_compositions
      add constraint pme_catalog_compositions_total_unit_cost_check check (total_unit_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_compositions_total_unit_price_check'
  ) then
    alter table public.pme_catalog_compositions
      add constraint pme_catalog_compositions_total_unit_price_check check (total_unit_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_composition_items_category_check'
  ) then
    alter table public.pme_catalog_composition_items
      add constraint pme_catalog_composition_items_category_check check (
        category in (
          'material',
          'mao_de_obra',
          'servico',
          'terceiro',
          'equipamento',
          'transporte',
          'descarte',
          'taxa',
          'composicao',
          'outro'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_composition_items_total_cost_check'
  ) then
    alter table public.pme_catalog_composition_items
      add constraint pme_catalog_composition_items_total_cost_check check (total_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_composition_items_total_price_check'
  ) then
    alter table public.pme_catalog_composition_items
      add constraint pme_catalog_composition_items_total_price_check check (total_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kits_type_check'
  ) then
    alter table public.pme_catalog_kits
      add constraint pme_catalog_kits_type_check check (
        kit_type in (
          'reforma_banheiro',
          'reforma_cozinha',
          'pintura',
          'troca_piso',
          'reforma_apartamento',
          'eletrica',
          'hidraulica',
          'gesso_drywall',
          'telhado',
          'area_externa',
          'manutencao',
          'personalizado'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kits_total_estimated_cost_check'
  ) then
    alter table public.pme_catalog_kits
      add constraint pme_catalog_kits_total_estimated_cost_check check (total_estimated_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kits_total_estimated_price_check'
  ) then
    alter table public.pme_catalog_kits
      add constraint pme_catalog_kits_total_estimated_price_check check (total_estimated_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kit_items_category_check'
  ) then
    alter table public.pme_catalog_kit_items
      add constraint pme_catalog_kit_items_category_check check (
        category in (
          'material',
          'mao_de_obra',
          'servico',
          'terceiro',
          'equipamento',
          'transporte',
          'descarte',
          'taxa',
          'composicao',
          'outro'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kit_items_total_cost_check'
  ) then
    alter table public.pme_catalog_kit_items
      add constraint pme_catalog_kit_items_total_cost_check check (total_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_catalog_kit_items_total_price_check'
  ) then
    alter table public.pme_catalog_kit_items
      add constraint pme_catalog_kit_items_total_price_check check (total_price >= 0);
  end if;
end $$;

create index if not exists pme_catalog_items_category_v2_idx
  on public.pme_catalog_items(organization_id, category, is_active);
create index if not exists pme_catalog_items_source_type_v2_idx
  on public.pme_catalog_items(organization_id, source_type);
create index if not exists pme_catalog_compositions_active_idx
  on public.pme_catalog_compositions(organization_id, is_active);
create index if not exists pme_catalog_kits_type_v2_idx
  on public.pme_catalog_kits(organization_id, kit_type, is_active);
create index if not exists pme_catalog_status_history_entity_idx
  on public.pme_catalog_status_history(organization_id, entity_type, entity_id, changed_at desc);

alter table public.pme_catalog_status_history enable row level security;

drop policy if exists "Managers can delete inactive PME catalog items" on public.pme_catalog_items;
drop policy if exists "Managers can delete inactive PME catalog compositions" on public.pme_catalog_compositions;
drop policy if exists "Managers can delete inactive PME catalog kits" on public.pme_catalog_kits;

create policy "Members can read PME catalog status history"
on public.pme_catalog_status_history
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog status history"
on public.pme_catalog_status_history
for insert
to authenticated
with check (
  changed_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create or replace function public.seed_pme_catalog_kits_for_organization(
  target_organization_id uuid,
  target_created_by uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pme_catalog_kits (
    organization_id,
    name,
    description,
    category,
    kit_type,
    default_environment,
    suggested_tier,
    is_seed,
    created_by
  )
  values
    (
      target_organization_id,
      'Reforma de Banheiro Econômico',
      'Kit inicial para reforma simples de banheiro com foco em custo baixo.',
      'bathroom_renovation',
      'reforma_banheiro',
      'Banheiro',
      'economic',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Banheiro Médio',
      'Kit inicial para reforma de banheiro com padrão intermediário.',
      'bathroom_renovation',
      'reforma_banheiro',
      'Banheiro',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Banheiro Premium',
      'Kit inicial para reforma de banheiro com padrão superior.',
      'bathroom_renovation',
      'reforma_banheiro',
      'Banheiro',
      'premium',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Cozinha',
      'Kit inicial para reforma de cozinha residencial.',
      'kitchen_renovation',
      'reforma_cozinha',
      'Cozinha',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Pintura Apartamento 60m²',
      'Kit inicial para pintura de apartamento de aproximadamente 60 metros quadrados.',
      'painting',
      'pintura',
      'Apartamento',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Troca de Piso',
      'Kit inicial para troca de piso em ambiente residencial.',
      'flooring',
      'troca_piso',
      'Ambiente principal',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Apartamento',
      'Kit inicial para reforma geral de apartamento residencial.',
      'apartment_renovation',
      'reforma_apartamento',
      'Apartamento',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Elétrica Residencial Básica',
      'Kit inicial para revisão e adequação elétrica residencial básica.',
      'electrical',
      'eletrica',
      'Instalações elétricas',
      'basic',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Hidráulica Residencial Básica',
      'Kit inicial para manutenção e adequação hidráulica residencial básica.',
      'plumbing',
      'hidraulica',
      'Instalações hidráulicas',
      'basic',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Gesso e Drywall Básico',
      'Kit inicial para serviços simples de gesso e drywall.',
      'drywall',
      'gesso_drywall',
      'Gesso e drywall',
      'basic',
      true,
      target_created_by
    )
  on conflict (organization_id, name) do update
  set
    description = excluded.description,
    category = excluded.category,
    kit_type = excluded.kit_type,
    default_environment = excluded.default_environment,
    suggested_tier = excluded.suggested_tier,
    is_seed = true;
end;
$$;

insert into public.pme_catalog_kits (
  organization_id,
  name,
  description,
  category,
  kit_type,
  default_environment,
  suggested_tier,
  is_seed,
  created_by
)
select
  organizations.id,
  seed.name,
  seed.description,
  seed.category,
  seed.kit_type,
  seed.default_environment,
  seed.suggested_tier,
  true,
  organizations.created_by
from public.organizations
cross join (
  values
    (
      'Reforma de Apartamento',
      'Kit inicial para reforma geral de apartamento residencial.',
      'apartment_renovation',
      'reforma_apartamento',
      'Apartamento',
      'standard'
    ),
    (
      'Elétrica Residencial Básica',
      'Kit inicial para revisão e adequação elétrica residencial básica.',
      'electrical',
      'eletrica',
      'Instalações elétricas',
      'basic'
    ),
    (
      'Hidráulica Residencial Básica',
      'Kit inicial para manutenção e adequação hidráulica residencial básica.',
      'plumbing',
      'hidraulica',
      'Instalações hidráulicas',
      'basic'
    ),
    (
      'Gesso e Drywall Básico',
      'Kit inicial para serviços simples de gesso e drywall.',
      'drywall',
      'gesso_drywall',
      'Gesso e drywall',
      'basic'
    )
) as seed(name, description, category, kit_type, default_environment, suggested_tier)
on conflict (organization_id, name) do update
set
  description = excluded.description,
  category = excluded.category,
  kit_type = excluded.kit_type,
  default_environment = excluded.default_environment,
  suggested_tier = excluded.suggested_tier,
  is_seed = true;
