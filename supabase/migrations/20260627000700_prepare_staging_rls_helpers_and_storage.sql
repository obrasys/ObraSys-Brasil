-- Staging hardening helpers and private Storage buckets for Obra Sys Brasil PME.

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_organization_member(target_organization_id);
$$;

create or replace function public.get_user_role(
  target_organization_id uuid,
  target_user_id uuid default auth.uid()
)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select om.role
  from public.organization_members om
  where om.organization_id = target_organization_id
    and om.user_id = target_user_id
    and om.status = 'active'
  limit 1;
$$;

create or replace function public.has_org_role(
  target_organization_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_organization_role(target_organization_id, allowed_roles);
$$;

create or replace function public.can_view_internal_costs(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin', 'manager']);
$$;

create or replace function public.can_view_profit(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin', 'manager']);
$$;

create or replace function public.can_manage_budget(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin', 'manager']);
$$;

create or replace function public.can_manage_project(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin', 'manager']);
$$;

create or replace function public.can_manage_purchase(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin', 'manager']);
$$;

create or replace function public.can_close_project(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_org_role(target_organization_id, array['owner', 'admin']);
$$;

create or replace function public.storage_object_organization_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = public
as $$
declare
  first_folder text;
begin
  first_folder := split_part(object_name, '/', 1);

  if first_folder = '' then
    return null;
  end if;

  return first_folder::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

insert into storage.buckets (id, name, public)
values
  ('project-photos', 'project-photos', false),
  ('project-attachments', 'project-attachments', false),
  ('budget-proposals', 'budget-proposals', false),
  ('project-reports', 'project-reports', false),
  ('purchase-attachments', 'purchase-attachments', false),
  ('daily-log-photos', 'daily-log-photos', false)
on conflict (id) do update
set public = false;

create policy "Members can read private PME Storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id in (
    'project-photos',
    'project-attachments',
    'budget-proposals',
    'project-reports',
    'purchase-attachments',
    'daily-log-photos'
  )
  and public.is_org_member(public.storage_object_organization_id(name))
);

create policy "Project managers can upload project photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('project-photos', 'daily-log-photos')
  and public.can_manage_project(public.storage_object_organization_id(name))
);

create policy "Project managers can upload project attachments and reports"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('project-attachments', 'project-reports')
  and public.can_manage_project(public.storage_object_organization_id(name))
);

create policy "Budget managers can upload budget proposals"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'budget-proposals'
  and public.can_manage_budget(public.storage_object_organization_id(name))
);

create policy "Purchase managers can upload purchase attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'purchase-attachments'
  and public.can_manage_purchase(public.storage_object_organization_id(name))
);

create policy "Managers can update private PME Storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id in (
    'project-photos',
    'project-attachments',
    'budget-proposals',
    'project-reports',
    'purchase-attachments',
    'daily-log-photos'
  )
  and (
    public.can_manage_project(public.storage_object_organization_id(name))
    or public.can_manage_budget(public.storage_object_organization_id(name))
    or public.can_manage_purchase(public.storage_object_organization_id(name))
  )
)
with check (
  bucket_id in (
    'project-photos',
    'project-attachments',
    'budget-proposals',
    'project-reports',
    'purchase-attachments',
    'daily-log-photos'
  )
  and (
    public.can_manage_project(public.storage_object_organization_id(name))
    or public.can_manage_budget(public.storage_object_organization_id(name))
    or public.can_manage_purchase(public.storage_object_organization_id(name))
  )
);

create policy "Managers can delete private PME Storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id in (
    'project-photos',
    'project-attachments',
    'budget-proposals',
    'project-reports',
    'purchase-attachments',
    'daily-log-photos'
  )
  and (
    public.can_manage_project(public.storage_object_organization_id(name))
    or public.can_manage_budget(public.storage_object_organization_id(name))
    or public.can_manage_purchase(public.storage_object_organization_id(name))
  )
);
