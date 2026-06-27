-- Align Orçamentos PME phase 1 with the approved contract.
-- This is incremental: the original phase 1 migration is already part of history.

alter table public.pme_budget_environments
  add column if not exists subtotal_price numeric(14, 2) not null default 0;

update public.pme_budget_environments
set subtotal_price = final_price
where subtotal_price = 0
  and final_price > 0;

alter table public.pme_budget_items
  add column if not exists cost_center_id uuid,
  add column if not exists item_code text,
  add column if not exists category text not null default 'servico',
  add column if not exists source_type text not null default 'manual',
  add column if not exists source_reference_id uuid,
  add column if not exists waste_percentage numeric(7, 4) not null default 0,
  add column if not exists margin_percentage numeric(7, 4) not null default 0,
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists total_price numeric(14, 2) not null default 0,
  add column if not exists notes text;

update public.pme_budget_items
set
  total_cost = subtotal_cost,
  total_price = final_price,
  category = case item_type
    when 'service' then 'servico'
    when 'material' then 'material'
    when 'labor' then 'mao_de_obra'
    when 'equipment' then 'equipamento'
    else 'outro'
  end
where total_cost = 0
  and total_price = 0;

alter table public.pme_budget_materials
  add column if not exists budget_item_id uuid,
  add column if not exists waste_percentage numeric(7, 4) not null default 0,
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists purchase_status text not null default 'not_purchased';

alter table public.pme_budget_materials
  alter column item_id drop not null;

update public.pme_budget_materials
set
  budget_item_id = item_id,
  total_cost = subtotal_cost
where budget_item_id is null;

alter table public.pme_budget_labor
  add column if not exists budget_item_id uuid,
  add column if not exists labor_type text not null default 'mao_de_obra',
  add column if not exists worker_name text,
  add column if not exists days numeric(10, 2) not null default 0,
  add column if not exists total_cost numeric(14, 2) not null default 0,
  add column if not exists contract_type text not null default 'empreitada';

alter table public.pme_budget_labor
  alter column item_id drop not null,
  alter column role_name drop not null;

update public.pme_budget_labor
set
  budget_item_id = item_id,
  labor_type = role_name,
  total_cost = subtotal_cost
where budget_item_id is null;

alter table public.pme_budget_payment_terms
  add column if not exists installment_number integer not null default 1,
  add column if not exists due_condition text not null default 'days_after_approval',
  add column if not exists due_date date;

update public.pme_budget_payment_terms
set installment_number = sort_order + 1
where installment_number = 1
  and sort_order > 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_environments_subtotal_price_check'
  ) then
    alter table public.pme_budget_environments
      add constraint pme_budget_environments_subtotal_price_check check (subtotal_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_category_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_category_check check (
        category in (
          'material',
          'mao_de_obra',
          'servico',
          'terceiro',
          'equipamento',
          'transporte',
          'descarte',
          'taxa',
          'outro'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_source_type_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_source_type_check check (
        source_type in (
          'manual',
          'meu_catalogo',
          'sinapi',
          'kit',
          'axia_suggestion',
          'supplier_quote'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_waste_percentage_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_waste_percentage_check check (
        waste_percentage >= 0 and waste_percentage <= 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_margin_percentage_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_margin_percentage_check check (
        margin_percentage >= 0 and margin_percentage <= 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_total_cost_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_total_cost_check check (total_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_total_price_check'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_total_price_check check (total_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_items_cost_center_org_fk'
  ) then
    alter table public.pme_budget_items
      add constraint pme_budget_items_cost_center_org_fk foreign key (organization_id, cost_center_id)
        references public.cost_centers(organization_id, id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_materials_budget_item_org_fk'
  ) then
    alter table public.pme_budget_materials
      add constraint pme_budget_materials_budget_item_org_fk foreign key (organization_id, budget_item_id)
        references public.pme_budget_items(organization_id, id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_materials_waste_percentage_check'
  ) then
    alter table public.pme_budget_materials
      add constraint pme_budget_materials_waste_percentage_check check (
        waste_percentage >= 0 and waste_percentage <= 100
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_materials_total_cost_check'
  ) then
    alter table public.pme_budget_materials
      add constraint pme_budget_materials_total_cost_check check (total_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_materials_purchase_status_check'
  ) then
    alter table public.pme_budget_materials
      add constraint pme_budget_materials_purchase_status_check check (
        purchase_status in ('not_purchased', 'quoted', 'purchased', 'delivered', 'used')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_labor_budget_item_org_fk'
  ) then
    alter table public.pme_budget_labor
      add constraint pme_budget_labor_budget_item_org_fk foreign key (organization_id, budget_item_id)
        references public.pme_budget_items(organization_id, id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_labor_labor_type_check'
  ) then
    alter table public.pme_budget_labor
      add constraint pme_budget_labor_labor_type_check check (length(trim(labor_type)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_labor_days_check'
  ) then
    alter table public.pme_budget_labor
      add constraint pme_budget_labor_days_check check (days >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_labor_total_cost_check'
  ) then
    alter table public.pme_budget_labor
      add constraint pme_budget_labor_total_cost_check check (total_cost >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_labor_contract_type_check'
  ) then
    alter table public.pme_budget_labor
      add constraint pme_budget_labor_contract_type_check check (length(trim(contract_type)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_payment_terms_installment_number_check'
  ) then
    alter table public.pme_budget_payment_terms
      add constraint pme_budget_payment_terms_installment_number_check check (
        installment_number > 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_payment_terms_due_condition_check'
  ) then
    alter table public.pme_budget_payment_terms
      add constraint pme_budget_payment_terms_due_condition_check check (
        length(trim(due_condition)) > 0
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_payment_terms_unique_installment'
  ) then
    alter table public.pme_budget_payment_terms
      add constraint pme_budget_payment_terms_unique_installment unique (
        budget_id,
        installment_number
      );
  end if;
end $$;

create index if not exists pme_budget_items_cost_center_idx
  on public.pme_budget_items(organization_id, cost_center_id);
create index if not exists pme_budget_items_source_idx
  on public.pme_budget_items(organization_id, source_type);
create index if not exists pme_budget_materials_status_idx
  on public.pme_budget_materials(organization_id, purchase_status);
create index if not exists pme_budget_labor_budget_idx
  on public.pme_budget_labor(organization_id, budget_id);
create index if not exists pme_budget_payment_terms_installment_idx
  on public.pme_budget_payment_terms(organization_id, budget_id, installment_number);

drop policy if exists "Members can read PME budgets" on public.pme_budgets;
drop policy if exists "Members can read PME environments" on public.pme_budget_environments;
drop policy if exists "Members can read PME items" on public.pme_budget_items;
drop policy if exists "Members can read PME materials" on public.pme_budget_materials;
drop policy if exists "Members can read PME labor" on public.pme_budget_labor;
drop policy if exists "Members can read PME payment terms" on public.pme_budget_payment_terms;
drop policy if exists "Members can read PME budget versions" on public.pme_budget_versions;
drop policy if exists "Members can read PME budget status history" on public.pme_budget_status_history;

create policy "Managers can read PME budgets"
on public.pme_budgets
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME environments"
on public.pme_budget_environments
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME items"
on public.pme_budget_items
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME materials"
on public.pme_budget_materials
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME labor"
on public.pme_budget_labor
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME payment terms"
on public.pme_budget_payment_terms
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME budget versions"
on public.pme_budget_versions
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME budget status history"
on public.pme_budget_status_history
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
