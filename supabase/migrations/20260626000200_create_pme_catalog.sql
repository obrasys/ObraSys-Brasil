-- Meu Catálogo PME Brasil - itens, composições e kits reutilizáveis.
-- Prerequisites: Core SaaS multi-tenant migration.

create table if not exists public.pme_catalog_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  item_type text not null,
  origin text not null default 'manual',
  unit text not null default 'un',
  unit_cost numeric(14, 2) not null default 0,
  unit_price numeric(14, 2) not null default 0,
  supplier_name text,
  source_reference text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_catalog_items_name_check check (length(trim(name)) > 0),
  constraint pme_catalog_items_type_check check (
    item_type in (
      'material',
      'labor',
      'service',
      'third_party',
      'equipment',
      'transport',
      'disposal',
      'fee',
      'other'
    )
  ),
  constraint pme_catalog_items_origin_check check (
    origin in ('manual', 'sinapi', 'supplier_quote', 'axia_suggestion')
  ),
  constraint pme_catalog_items_unit_check check (length(trim(unit)) > 0),
  constraint pme_catalog_items_unit_cost_check check (unit_cost >= 0),
  constraint pme_catalog_items_unit_price_check check (unit_price >= 0),
  constraint pme_catalog_items_org_id_unique unique (organization_id, id),
  constraint pme_catalog_items_name_unique unique (organization_id, name, item_type)
);

create table if not exists public.pme_catalog_compositions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  origin text not null default 'manual',
  unit text not null default 'un',
  total_cost numeric(14, 2) not null default 0,
  total_price numeric(14, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_catalog_compositions_name_check check (length(trim(name)) > 0),
  constraint pme_catalog_compositions_origin_check check (
    origin in ('manual', 'sinapi', 'supplier_quote', 'axia_suggestion')
  ),
  constraint pme_catalog_compositions_unit_check check (length(trim(unit)) > 0),
  constraint pme_catalog_compositions_total_cost_check check (total_cost >= 0),
  constraint pme_catalog_compositions_total_price_check check (total_price >= 0),
  constraint pme_catalog_compositions_org_id_unique unique (organization_id, id),
  constraint pme_catalog_compositions_name_unique unique (organization_id, name)
);

create table if not exists public.pme_catalog_composition_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  composition_id uuid not null references public.pme_catalog_compositions(id) on delete cascade,
  catalog_item_id uuid not null references public.pme_catalog_items(id) on delete restrict,
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  unit_price numeric(14, 2) not null default 0,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_catalog_composition_items_quantity_check check (quantity > 0),
  constraint pme_catalog_composition_items_unit_cost_check check (unit_cost >= 0),
  constraint pme_catalog_composition_items_unit_price_check check (unit_price >= 0),
  constraint pme_catalog_composition_items_sort_order_check check (sort_order >= 0),
  constraint pme_catalog_composition_items_org_id_unique unique (organization_id, id),
  constraint pme_catalog_composition_items_unique unique (composition_id, catalog_item_id),
  constraint pme_catalog_composition_items_composition_org_fk foreign key (
    organization_id,
    composition_id
  ) references public.pme_catalog_compositions(organization_id, id) on delete cascade,
  constraint pme_catalog_composition_items_item_org_fk foreign key (
    organization_id,
    catalog_item_id
  ) references public.pme_catalog_items(organization_id, id) on delete restrict
);

create table if not exists public.pme_catalog_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  description text,
  category text not null default 'renovation',
  suggested_tier text,
  total_cost numeric(14, 2) not null default 0,
  total_price numeric(14, 2) not null default 0,
  is_seed boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_catalog_kits_name_check check (length(trim(name)) > 0),
  constraint pme_catalog_kits_category_check check (length(trim(category)) > 0),
  constraint pme_catalog_kits_total_cost_check check (total_cost >= 0),
  constraint pme_catalog_kits_total_price_check check (total_price >= 0),
  constraint pme_catalog_kits_org_id_unique unique (organization_id, id),
  constraint pme_catalog_kits_name_unique unique (organization_id, name)
);

create table if not exists public.pme_catalog_kit_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kit_id uuid not null references public.pme_catalog_kits(id) on delete cascade,
  catalog_item_id uuid references public.pme_catalog_items(id) on delete restrict,
  composition_id uuid references public.pme_catalog_compositions(id) on delete restrict,
  quantity numeric(14, 4) not null default 1,
  unit_cost numeric(14, 2) not null default 0,
  unit_price numeric(14, 2) not null default 0,
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_catalog_kit_items_target_check check (
    (catalog_item_id is not null and composition_id is null)
    or (catalog_item_id is null and composition_id is not null)
  ),
  constraint pme_catalog_kit_items_quantity_check check (quantity > 0),
  constraint pme_catalog_kit_items_unit_cost_check check (unit_cost >= 0),
  constraint pme_catalog_kit_items_unit_price_check check (unit_price >= 0),
  constraint pme_catalog_kit_items_sort_order_check check (sort_order >= 0),
  constraint pme_catalog_kit_items_kit_org_fk foreign key (organization_id, kit_id)
    references public.pme_catalog_kits(organization_id, id) on delete cascade,
  constraint pme_catalog_kit_items_item_org_fk foreign key (organization_id, catalog_item_id)
    references public.pme_catalog_items(organization_id, id) on delete restrict,
  constraint pme_catalog_kit_items_composition_org_fk foreign key (organization_id, composition_id)
    references public.pme_catalog_compositions(organization_id, id) on delete restrict
);

create index if not exists pme_catalog_items_organization_id_idx
  on public.pme_catalog_items(organization_id);
create index if not exists pme_catalog_items_type_idx
  on public.pme_catalog_items(organization_id, item_type, is_active);
create index if not exists pme_catalog_items_origin_idx
  on public.pme_catalog_items(organization_id, origin);
create index if not exists pme_catalog_compositions_organization_id_idx
  on public.pme_catalog_compositions(organization_id);
create index if not exists pme_catalog_composition_items_composition_id_idx
  on public.pme_catalog_composition_items(composition_id);
create index if not exists pme_catalog_kits_organization_id_idx
  on public.pme_catalog_kits(organization_id);
create index if not exists pme_catalog_kits_category_idx
  on public.pme_catalog_kits(organization_id, category, is_active);
create index if not exists pme_catalog_kit_items_kit_id_idx
  on public.pme_catalog_kit_items(kit_id);

create trigger pme_catalog_items_touch_updated_at
before update on public.pme_catalog_items
for each row execute function public.touch_updated_at();

create trigger pme_catalog_compositions_touch_updated_at
before update on public.pme_catalog_compositions
for each row execute function public.touch_updated_at();

create trigger pme_catalog_composition_items_touch_updated_at
before update on public.pme_catalog_composition_items
for each row execute function public.touch_updated_at();

create trigger pme_catalog_kits_touch_updated_at
before update on public.pme_catalog_kits
for each row execute function public.touch_updated_at();

create trigger pme_catalog_kit_items_touch_updated_at
before update on public.pme_catalog_kit_items
for each row execute function public.touch_updated_at();

alter table public.pme_catalog_items enable row level security;
alter table public.pme_catalog_compositions enable row level security;
alter table public.pme_catalog_composition_items enable row level security;
alter table public.pme_catalog_kits enable row level security;
alter table public.pme_catalog_kit_items enable row level security;

create policy "Members can read PME catalog items"
on public.pme_catalog_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog items"
on public.pme_catalog_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME catalog items"
on public.pme_catalog_items
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete inactive PME catalog items"
on public.pme_catalog_items
for delete
to authenticated
using (
  is_active = false
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Members can read PME catalog compositions"
on public.pme_catalog_compositions
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog compositions"
on public.pme_catalog_compositions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME catalog compositions"
on public.pme_catalog_compositions
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete inactive PME catalog compositions"
on public.pme_catalog_compositions
for delete
to authenticated
using (
  is_active = false
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Members can read PME catalog composition items"
on public.pme_catalog_composition_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog composition items"
on public.pme_catalog_composition_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME catalog composition items"
on public.pme_catalog_composition_items
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME catalog composition items"
on public.pme_catalog_composition_items
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME catalog kits"
on public.pme_catalog_kits
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog kits"
on public.pme_catalog_kits
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME catalog kits"
on public.pme_catalog_kits
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete inactive PME catalog kits"
on public.pme_catalog_kits
for delete
to authenticated
using (
  is_active = false
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Members can read PME catalog kit items"
on public.pme_catalog_kit_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create PME catalog kit items"
on public.pme_catalog_kit_items
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update PME catalog kit items"
on public.pme_catalog_kit_items
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can delete PME catalog kit items"
on public.pme_catalog_kit_items
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

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
      'economic',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Banheiro Médio',
      'Kit inicial para reforma de banheiro com padrão intermediário.',
      'bathroom_renovation',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Banheiro Premium',
      'Kit inicial para reforma de banheiro com padrão superior.',
      'bathroom_renovation',
      'premium',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Pintura Apartamento 60m²',
      'Kit inicial para pintura de apartamento de aproximadamente 60 metros quadrados.',
      'painting',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Troca de Piso',
      'Kit inicial para troca de piso em ambiente residencial.',
      'flooring',
      'standard',
      true,
      target_created_by
    ),
    (
      target_organization_id,
      'Reforma de Cozinha',
      'Kit inicial para reforma de cozinha residencial.',
      'kitchen_renovation',
      'standard',
      true,
      target_created_by
    )
  on conflict (organization_id, name) do nothing;
end;
$$;

create or replace function public.seed_pme_catalog_kits_on_organization_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_pme_catalog_kits_for_organization(new.id, new.created_by);
  return new;
end;
$$;

create trigger organizations_seed_pme_catalog_kits
after insert on public.organizations
for each row execute function public.seed_pme_catalog_kits_on_organization_created();

revoke execute on function public.seed_pme_catalog_kits_for_organization(uuid, uuid)
from public, anon, authenticated;

revoke execute on function public.seed_pme_catalog_kits_on_organization_created()
from public, anon, authenticated;

select public.seed_pme_catalog_kits_for_organization(id, created_by)
from public.organizations;
