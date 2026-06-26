-- Core SaaS multi-tenant - Obra Sys Brasil

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document_number text,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_check check (length(trim(name)) > 0),
  constraint organizations_status_check check (status in ('active', 'suspended', 'archived'))
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check check (
    role in ('owner', 'admin', 'manager', 'member', 'viewer')
  ),
  constraint organization_members_status_check check (status in ('active', 'invited', 'disabled')),
  constraint organization_members_unique_user_org unique (organization_id, user_id),
  constraint organization_members_org_id_unique unique (organization_id, id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  name text not null,
  code text,
  description text,
  status text not null default 'planning',
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_check check (length(trim(name)) > 0),
  constraint projects_status_check check (
    status in ('planning', 'active', 'paused', 'completed', 'cancelled')
  ),
  constraint projects_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on),
  constraint projects_org_id_unique unique (organization_id, id),
  constraint projects_code_unique unique (organization_id, code)
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  parent_id uuid references public.cost_centers(id) on delete restrict,
  is_system_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_centers_code_check check (length(trim(code)) > 0),
  constraint cost_centers_name_check check (length(trim(name)) > 0),
  constraint cost_centers_org_id_unique unique (organization_id, id),
  constraint cost_centers_code_unique unique (organization_id, code),
  constraint cost_centers_parent_org_fk foreign key (organization_id, parent_id)
    references public.cost_centers(organization_id, id) on delete restrict
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_check check (length(trim(action)) > 0),
  constraint audit_logs_entity_table_check check (length(trim(entity_table)) > 0)
);

create index if not exists organizations_status_idx on public.organizations(status);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_org_role_idx
  on public.organization_members(organization_id, role, status);
create index if not exists projects_organization_id_idx on public.projects(organization_id);
create index if not exists projects_status_idx on public.projects(organization_id, status);
create index if not exists cost_centers_organization_id_idx on public.cost_centers(organization_id);
create index if not exists cost_centers_parent_id_idx on public.cost_centers(parent_id);
create index if not exists audit_logs_organization_id_created_at_idx
  on public.audit_logs(organization_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger organization_members_touch_updated_at
before update on public.organization_members
for each row execute function public.touch_updated_at();

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

create trigger cost_centers_touch_updated_at
before update on public.cost_centers
for each row execute function public.touch_updated_at();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and om.role = any(allowed_roles)
  );
$$;

create or replace function public.organization_has_members(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_organization_id
  );
$$;

create or replace function public.create_default_cost_centers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.cost_centers (organization_id, created_by, code, name, is_system_default)
  values
    (new.id, new.created_by, 'CC-1000', 'Terreno e Aquisições', true),
    (new.id, new.created_by, 'CC-2000', 'Custos Diretos', true),
    (new.id, new.created_by, 'CC-2100', 'Infraestrutura e Estrutura', true),
    (new.id, new.created_by, 'CC-2200', 'Arquitetura e Acabamentos', true),
    (new.id, new.created_by, 'CC-2300', 'Instalações Elétricas e Hidráulicas', true),
    (new.id, new.created_by, 'CC-3000', 'Custo Indireto', true),
    (new.id, new.created_by, 'CC-4000', 'Custos Administrativos da Obra', true),
    (new.id, new.created_by, 'CC-5000', 'Comercial e Marketing', true),
    (new.id, new.created_by, 'CC-6000', 'Receitas de Vendas', true),
    (new.id, new.created_by, 'CC-7000', 'Contingência', true),
    (new.id, new.created_by, 'CC-8000', 'Impostos, Taxas e Legalização', true);

  return new;
end;
$$;

create trigger organizations_create_default_cost_centers
after insert on public.organizations
for each row execute function public.create_default_cost_centers();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.cost_centers enable row level security;
alter table public.audit_logs enable row level security;

create policy "Authenticated users can create organizations"
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Members can read their organizations"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

create policy "Organization admins can update organizations"
on public.organizations
for update
to authenticated
using (public.has_organization_role(id, array['owner', 'admin']))
with check (public.has_organization_role(id, array['owner', 'admin']));

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can create own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Members can read organization members"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Users can bootstrap own organization membership"
on public.organization_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and status = 'active'
  and not public.organization_has_members(organization_id)
);

create policy "Organization admins can invite members"
on public.organization_members
for insert
to authenticated
with check (
  public.has_organization_role(organization_id, array['owner', 'admin'])
);

create policy "Organization admins can update members"
on public.organization_members
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin']))
with check (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Organization owners can delete members"
on public.organization_members
for delete
to authenticated
using (
  public.has_organization_role(organization_id, array['owner'])
  and user_id <> auth.uid()
);

create policy "Members can read projects"
on public.projects
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create projects"
on public.projects
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update projects"
on public.projects
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Admins can delete projects"
on public.projects
for delete
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin']));

create policy "Members can read cost centers"
on public.cost_centers
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create cost centers"
on public.cost_centers
for insert
to authenticated
with check (
  public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can update cost centers"
on public.cost_centers
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Admins can delete custom cost centers"
on public.cost_centers
for delete
to authenticated
using (
  not is_system_default
  and public.has_organization_role(organization_id, array['owner', 'admin'])
);

create policy "Members can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create audit logs"
on public.audit_logs
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and public.is_organization_member(organization_id)
);
