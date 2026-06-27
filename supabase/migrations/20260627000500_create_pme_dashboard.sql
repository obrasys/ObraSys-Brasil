-- Dashboard PME e visao multi-obras.
-- Agregacoes leves, alertas e preferencias por organizacao/usuario.

create table if not exists public.pme_dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  snapshot_date date not null default current_date,
  total_projects integer not null default 0,
  active_projects integer not null default 0,
  delayed_projects integer not null default 0,
  closed_projects integer not null default 0,
  total_planned_revenue numeric(14, 2) not null default 0,
  total_received_revenue numeric(14, 2) not null default 0,
  total_pending_receivables numeric(14, 2) not null default 0,
  total_planned_cost numeric(14, 2) not null default 0,
  total_actual_cost numeric(14, 2) not null default 0,
  total_expected_profit numeric(14, 2) not null default 0,
  total_actual_profit numeric(14, 2) not null default 0,
  total_cost_variance numeric(14, 2) not null default 0,
  total_open_tasks integer not null default 0,
  total_blocked_tasks integer not null default 0,
  total_overdue_receipts integer not null default 0,
  total_late_purchases integer not null default 0,
  total_missing_daily_logs integer not null default 0,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint pme_dashboard_snapshots_counts_check check (
    total_projects >= 0 and active_projects >= 0 and delayed_projects >= 0 and
    closed_projects >= 0 and total_open_tasks >= 0 and total_blocked_tasks >= 0 and
    total_overdue_receipts >= 0 and total_late_purchases >= 0 and total_missing_daily_logs >= 0
  ),
  constraint pme_dashboard_snapshots_money_check check (
    total_planned_revenue >= 0 and total_received_revenue >= 0 and
    total_pending_receivables >= 0 and total_planned_cost >= 0 and total_actual_cost >= 0
  )
);

create table if not exists public.pme_dashboard_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid references public.projects(id) on delete cascade,
  alert_type text not null,
  severity text not null default 'medium',
  title text not null,
  description text not null,
  status text not null default 'open',
  source_table text,
  source_id uuid,
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  constraint pme_dashboard_alerts_title_check check (length(trim(title)) > 0),
  constraint pme_dashboard_alerts_description_check check (length(trim(description)) > 0),
  constraint pme_dashboard_alerts_type_check check (
    alert_type in (
      'cost_overrun',
      'low_margin',
      'overdue_receipt',
      'late_purchase',
      'blocked_task',
      'missing_daily_log',
      'project_delay',
      'open_occurrence',
      'closeout_pending',
      'no_recent_activity',
      'budget_not_converted',
      'other'
    )
  ),
  constraint pme_dashboard_alerts_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint pme_dashboard_alerts_status_check check (
    status in ('open', 'acknowledged', 'resolved', 'archived')
  ),
  constraint pme_dashboard_alerts_resolved_check check (
    status not in ('resolved', 'archived') or resolved_at is not null
  ),
  constraint pme_dashboard_alerts_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_dashboard_user_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  default_period text not null default '30d',
  show_profit_cards boolean not null default false,
  show_margin_cards boolean not null default false,
  show_closed_projects boolean not null default false,
  preferred_project_statuses jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_dashboard_user_preferences_period_check check (
    default_period in ('7d', '30d', '90d', 'current_month', 'custom')
  ),
  constraint pme_dashboard_user_preferences_unique unique (organization_id, user_id)
);

create unique index if not exists pme_dashboard_alerts_open_unique_idx
  on public.pme_dashboard_alerts (
    organization_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    alert_type,
    coalesce(source_table, ''),
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status = 'open';

create index if not exists pme_dashboard_snapshots_org_date_idx
  on public.pme_dashboard_snapshots (organization_id, snapshot_date desc);
create index if not exists pme_dashboard_alerts_org_status_idx
  on public.pme_dashboard_alerts (organization_id, status, severity, created_at desc);
create index if not exists pme_dashboard_alerts_project_idx
  on public.pme_dashboard_alerts (organization_id, project_id, status);
create index if not exists pme_dashboard_user_preferences_user_idx
  on public.pme_dashboard_user_preferences (organization_id, user_id);

alter table public.pme_dashboard_snapshots enable row level security;
alter table public.pme_dashboard_alerts enable row level security;
alter table public.pme_dashboard_user_preferences enable row level security;

create policy "Members can read PME dashboard snapshots"
  on public.pme_dashboard_snapshots for select
  using (public.is_organization_member(organization_id));

create policy "Managers can create PME dashboard snapshots"
  on public.pme_dashboard_snapshots for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME dashboard alerts"
  on public.pme_dashboard_alerts for select
  using (public.is_organization_member(organization_id));

create policy "Managers can create PME dashboard alerts"
  on public.pme_dashboard_alerts for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can update PME dashboard alerts"
  on public.pme_dashboard_alerts for update
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Users can read own PME dashboard preferences"
  on public.pme_dashboard_user_preferences for select
  using (public.is_organization_member(organization_id) and user_id = auth.uid());

create policy "Users can create own PME dashboard preferences"
  on public.pme_dashboard_user_preferences for insert
  with check (public.is_organization_member(organization_id) and user_id = auth.uid());

create policy "Users can update own PME dashboard preferences"
  on public.pme_dashboard_user_preferences for update
  using (public.is_organization_member(organization_id) and user_id = auth.uid())
  with check (public.is_organization_member(organization_id) and user_id = auth.uid());
