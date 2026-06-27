-- Gestao simples da obra PME.
-- Camada operacional leve sobre projects e previsoes PME.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pme_budget_materials_org_id_unique'
  ) then
    alter table public.pme_budget_materials
      add constraint pme_budget_materials_org_id_unique unique (organization_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_project_cost_forecasts_org_id_unique'
  ) then
    alter table public.pme_project_cost_forecasts
      add constraint pme_project_cost_forecasts_org_id_unique unique (organization_id, id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'pme_project_receivable_forecasts_org_id_unique'
  ) then
    alter table public.pme_project_receivable_forecasts
      add constraint pme_project_receivable_forecasts_org_id_unique unique (organization_id, id);
  end if;
end $$;

create table if not exists public.pme_project_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  source_budget_environment_id uuid references public.pme_budget_environments(id) on delete set null,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  progress_percentage numeric(5, 2) not null default 0,
  status text not null default 'planned',
  sort_order integer not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_stages_name_check check (length(trim(name)) > 0),
  constraint pme_project_stages_progress_check check (
    progress_percentage >= 0 and progress_percentage <= 100
  ),
  constraint pme_project_stages_status_check check (
    status in ('planned', 'in_progress', 'paused', 'completed', 'cancelled')
  ),
  constraint pme_project_stages_dates_check check (
    planned_end_date is null or planned_start_date is null or planned_end_date >= planned_start_date
  ),
  constraint pme_project_stages_actual_dates_check check (
    actual_end_date is null or actual_start_date is null or actual_end_date >= actual_start_date
  ),
  constraint pme_project_stages_org_id_unique unique (organization_id, id),
  constraint pme_project_stages_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_stages_source_environment_org_fk foreign key (
    organization_id,
    source_budget_environment_id
  ) references public.pme_budget_environments(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.pme_project_stages(id) on delete set null,
  source_budget_item_id uuid references public.pme_budget_items(id) on delete set null,
  title text not null,
  description text,
  responsible_name text,
  planned_start_date date,
  planned_end_date date,
  actual_start_date date,
  actual_end_date date,
  progress_percentage numeric(5, 2) not null default 0,
  status text not null default 'todo',
  priority text not null default 'medium',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint pme_project_tasks_title_check check (length(trim(title)) > 0),
  constraint pme_project_tasks_progress_check check (
    progress_percentage >= 0 and progress_percentage <= 100
  ),
  constraint pme_project_tasks_status_check check (
    status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')
  ),
  constraint pme_project_tasks_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint pme_project_tasks_done_check check (
    status <> 'done' or completed_at is not null
  ),
  constraint pme_project_tasks_org_id_unique unique (organization_id, id),
  constraint pme_project_tasks_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_tasks_stage_org_fk foreign key (organization_id, stage_id)
    references public.pme_project_stages(organization_id, id) on delete restrict,
  constraint pme_project_tasks_source_item_org_fk foreign key (organization_id, source_budget_item_id)
    references public.pme_budget_items(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_name text,
  description text not null,
  status text not null default 'planned',
  expected_total_amount numeric(14, 2) not null default 0,
  actual_total_amount numeric(14, 2) not null default 0,
  purchase_date date,
  expected_delivery_date date,
  delivered_at timestamptz,
  source_type text not null default 'manual',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_purchases_description_check check (length(trim(description)) > 0),
  constraint pme_project_purchases_status_check check (
    status in ('planned', 'quoted', 'ordered', 'partially_delivered', 'delivered', 'cancelled')
  ),
  constraint pme_project_purchases_amount_check check (
    expected_total_amount >= 0 and actual_total_amount >= 0
  ),
  constraint pme_project_purchases_source_type_check check (
    source_type in ('budget_material', 'manual', 'catalog', 'sinapi_snapshot', 'other')
  ),
  constraint pme_project_purchases_org_id_unique unique (organization_id, id),
  constraint pme_project_purchases_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_purchase_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_id uuid not null references public.pme_project_purchases(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_budget_material_id uuid references public.pme_budget_materials(id) on delete set null,
  description text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  unit_cost numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  delivered_quantity numeric(14, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_purchase_items_description_check check (length(trim(description)) > 0),
  constraint pme_project_purchase_items_quantity_check check (quantity > 0),
  constraint pme_project_purchase_items_unit_check check (length(trim(unit)) > 0),
  constraint pme_project_purchase_items_cost_check check (
    unit_cost >= 0 and total_cost >= 0 and delivered_quantity >= 0
  ),
  constraint pme_project_purchase_items_purchase_org_fk foreign key (organization_id, purchase_id)
    references public.pme_project_purchases(organization_id, id) on delete cascade,
  constraint pme_project_purchase_items_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_purchase_items_material_org_fk foreign key (
    organization_id,
    source_budget_material_id
  ) references public.pme_budget_materials(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_actual_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  stage_id uuid references public.pme_project_stages(id) on delete set null,
  task_id uuid references public.pme_project_tasks(id) on delete set null,
  purchase_id uuid references public.pme_project_purchases(id) on delete set null,
  source_forecast_id uuid references public.pme_project_cost_forecasts(id) on delete set null,
  cost_type text not null,
  description text not null,
  amount numeric(14, 2) not null,
  payment_status text not null default 'pending',
  payment_date date,
  supplier_name text,
  fiscal_document_url text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_actual_costs_type_check check (
    cost_type in ('material', 'mao_de_obra', 'terceiro', 'equipamento', 'transporte', 'descarte', 'taxa', 'ajuste', 'outro')
  ),
  constraint pme_project_actual_costs_description_check check (length(trim(description)) > 0),
  constraint pme_project_actual_costs_amount_check check (amount >= 0),
  constraint pme_project_actual_costs_status_check check (payment_status in ('pending', 'paid', 'cancelled')),
  constraint pme_project_actual_costs_paid_check check (
    payment_status <> 'paid' or payment_date is not null
  ),
  constraint pme_project_actual_costs_org_id_unique unique (organization_id, id),
  constraint pme_project_actual_costs_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_actual_costs_stage_org_fk foreign key (organization_id, stage_id)
    references public.pme_project_stages(organization_id, id) on delete restrict,
  constraint pme_project_actual_costs_task_org_fk foreign key (organization_id, task_id)
    references public.pme_project_tasks(organization_id, id) on delete restrict,
  constraint pme_project_actual_costs_purchase_org_fk foreign key (organization_id, purchase_id)
    references public.pme_project_purchases(organization_id, id) on delete restrict,
  constraint pme_project_actual_costs_forecast_org_fk foreign key (organization_id, source_forecast_id)
    references public.pme_project_cost_forecasts(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_receivable_forecast_id uuid references public.pme_project_receivable_forecasts(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null,
  receipt_status text not null default 'planned',
  due_date date,
  received_at timestamptz,
  payment_method text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_receipts_description_check check (length(trim(description)) > 0),
  constraint pme_project_receipts_amount_check check (amount >= 0),
  constraint pme_project_receipts_status_check check (
    receipt_status in ('planned', 'invoiced', 'received', 'overdue', 'cancelled')
  ),
  constraint pme_project_receipts_received_check check (
    receipt_status <> 'received' or received_at is not null
  ),
  constraint pme_project_receipts_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_receipts_forecast_org_fk foreign key (
    organization_id,
    source_receivable_forecast_id
  ) references public.pme_project_receivable_forecasts(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_daily_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  log_date date not null,
  weather_morning text,
  weather_afternoon text,
  labor_count integer,
  work_performed text not null,
  issues text,
  next_steps text,
  materials_delivered text,
  client_notes text,
  photos_count integer not null default 0,
  status text not null default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_logs_work_check check (length(trim(work_performed)) > 0),
  constraint pme_project_daily_logs_labor_count_check check (labor_count is null or labor_count >= 0),
  constraint pme_project_daily_logs_photos_count_check check (photos_count >= 0),
  constraint pme_project_daily_logs_status_check check (status in ('draft', 'completed', 'locked')),
  constraint pme_project_daily_logs_org_id_unique unique (organization_id, id),
  constraint pme_project_daily_logs_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid references public.pme_project_daily_logs(id) on delete set null,
  stage_id uuid references public.pme_project_stages(id) on delete set null,
  task_id uuid references public.pme_project_tasks(id) on delete set null,
  file_url text not null,
  file_name text not null,
  caption text,
  taken_at timestamptz,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_project_photos_file_url_check check (length(trim(file_url)) > 0),
  constraint pme_project_photos_file_name_check check (length(trim(file_name)) > 0),
  constraint pme_project_photos_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_photos_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete restrict,
  constraint pme_project_photos_stage_org_fk foreign key (organization_id, stage_id)
    references public.pme_project_stages(organization_id, id) on delete restrict,
  constraint pme_project_photos_task_org_fk foreign key (organization_id, task_id)
    references public.pme_project_tasks(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  related_table text,
  related_id uuid,
  file_url text not null,
  file_name text not null,
  file_type text,
  description text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_project_attachments_file_url_check check (length(trim(file_url)) > 0),
  constraint pme_project_attachments_file_name_check check (length(trim(file_name)) > 0),
  constraint pme_project_attachments_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_date date not null,
  planned_progress_percentage numeric(5, 2),
  actual_progress_percentage numeric(5, 2) not null default 0,
  completed_tasks_count integer not null default 0,
  total_tasks_count integer not null default 0,
  total_actual_cost numeric(14, 2) not null default 0,
  total_received numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  constraint pme_project_progress_snapshots_progress_check check (
    (planned_progress_percentage is null or (planned_progress_percentage >= 0 and planned_progress_percentage <= 100))
    and actual_progress_percentage >= 0
    and actual_progress_percentage <= 100
  ),
  constraint pme_project_progress_snapshots_counts_check check (
    completed_tasks_count >= 0 and total_tasks_count >= 0
  ),
  constraint pme_project_progress_snapshots_amounts_check check (
    total_actual_cost >= 0 and total_received >= 0
  ),
  constraint pme_project_progress_snapshots_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_financial_summary (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_pme_budget_id uuid references public.pme_budgets(id) on delete set null,
  planned_cost numeric(14, 2) not null default 0,
  actual_cost numeric(14, 2) not null default 0,
  planned_revenue numeric(14, 2) not null default 0,
  received_revenue numeric(14, 2) not null default 0,
  pending_receivables numeric(14, 2) not null default 0,
  expected_profit numeric(14, 2) not null default 0,
  actual_profit numeric(14, 2) not null default 0,
  profit_variance numeric(14, 2) not null default 0,
  cost_variance numeric(14, 2) not null default 0,
  last_calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_financial_summary_project_unique unique (organization_id, project_id),
  constraint pme_project_financial_summary_non_negative_check check (
    planned_cost >= 0 and actual_cost >= 0 and planned_revenue >= 0 and received_revenue >= 0 and pending_receivables >= 0
  ),
  constraint pme_project_financial_summary_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_financial_summary_budget_org_fk foreign key (organization_id, source_pme_budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create index if not exists pme_project_stages_project_idx on public.pme_project_stages(organization_id, project_id, sort_order);
create index if not exists pme_project_tasks_project_status_idx on public.pme_project_tasks(organization_id, project_id, status);
create index if not exists pme_project_purchases_project_status_idx on public.pme_project_purchases(organization_id, project_id, status);
create index if not exists pme_project_actual_costs_project_idx on public.pme_project_actual_costs(organization_id, project_id, created_at desc);
create index if not exists pme_project_receipts_project_idx on public.pme_project_receipts(organization_id, project_id, created_at desc);
create index if not exists pme_project_daily_logs_project_date_idx on public.pme_project_daily_logs(organization_id, project_id, log_date desc);
create index if not exists pme_project_photos_project_created_idx on public.pme_project_photos(organization_id, project_id, created_at desc);
create index if not exists pme_project_attachments_project_idx on public.pme_project_attachments(organization_id, project_id, created_at desc);
create index if not exists pme_project_progress_snapshots_project_date_idx on public.pme_project_progress_snapshots(organization_id, project_id, snapshot_date desc);

create or replace function public.prevent_locked_pme_project_daily_log_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'locked' then
    raise exception 'Locked daily logs cannot be edited.';
  end if;

  return new;
end;
$$;

create trigger pme_project_stages_touch_updated_at before update on public.pme_project_stages for each row execute function public.touch_updated_at();
create trigger pme_project_tasks_touch_updated_at before update on public.pme_project_tasks for each row execute function public.touch_updated_at();
create trigger pme_project_purchases_touch_updated_at before update on public.pme_project_purchases for each row execute function public.touch_updated_at();
create trigger pme_project_purchase_items_touch_updated_at before update on public.pme_project_purchase_items for each row execute function public.touch_updated_at();
create trigger pme_project_actual_costs_touch_updated_at before update on public.pme_project_actual_costs for each row execute function public.touch_updated_at();
create trigger pme_project_receipts_touch_updated_at before update on public.pme_project_receipts for each row execute function public.touch_updated_at();
create trigger pme_project_daily_logs_touch_updated_at before update on public.pme_project_daily_logs for each row execute function public.touch_updated_at();
create trigger pme_project_daily_logs_locked_update_guard before update on public.pme_project_daily_logs for each row execute function public.prevent_locked_pme_project_daily_log_update();
create trigger pme_project_financial_summary_touch_updated_at before update on public.pme_project_financial_summary for each row execute function public.touch_updated_at();

alter table public.pme_project_stages enable row level security;
alter table public.pme_project_tasks enable row level security;
alter table public.pme_project_purchases enable row level security;
alter table public.pme_project_purchase_items enable row level security;
alter table public.pme_project_actual_costs enable row level security;
alter table public.pme_project_receipts enable row level security;
alter table public.pme_project_daily_logs enable row level security;
alter table public.pme_project_photos enable row level security;
alter table public.pme_project_attachments enable row level security;
alter table public.pme_project_progress_snapshots enable row level security;
alter table public.pme_project_financial_summary enable row level security;

create policy "Members can read PME project stages" on public.pme_project_stages for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME project stages" on public.pme_project_stages for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project tasks" on public.pme_project_tasks for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME project tasks" on public.pme_project_tasks for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project purchases" on public.pme_project_purchases for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME project purchases" on public.pme_project_purchases for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project purchase items" on public.pme_project_purchase_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME project purchase items" on public.pme_project_purchase_items for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project actual costs" on public.pme_project_actual_costs for select to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
create policy "Managers can manage PME project actual costs" on public.pme_project_actual_costs for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project receipts" on public.pme_project_receipts for select to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
create policy "Managers can manage PME project receipts" on public.pme_project_receipts for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project daily logs" on public.pme_project_daily_logs for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME project daily logs" on public.pme_project_daily_logs for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project photos" on public.pme_project_photos for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can create PME project photos" on public.pme_project_photos for insert to authenticated with check (uploaded_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project attachments" on public.pme_project_attachments for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can create PME project attachments" on public.pme_project_attachments for insert to authenticated with check (uploaded_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project progress snapshots" on public.pme_project_progress_snapshots for select to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
create policy "Managers can create PME project progress snapshots" on public.pme_project_progress_snapshots for insert to authenticated with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project financial summary" on public.pme_project_financial_summary for select to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
create policy "Managers can manage PME project financial summary" on public.pme_project_financial_summary for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
