-- Relatorios PME e fecho simples da obra.
-- Consolida resultado financeiro/operacional sem substituir o motor financeiro oficial.

create table if not exists public.pme_project_closeouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_pme_budget_id uuid references public.pme_budgets(id) on delete set null,
  status text not null default 'draft',
  planned_cost numeric(14, 2) not null default 0,
  actual_cost numeric(14, 2) not null default 0,
  planned_revenue numeric(14, 2) not null default 0,
  received_revenue numeric(14, 2) not null default 0,
  pending_receivables numeric(14, 2) not null default 0,
  expected_profit numeric(14, 2) not null default 0,
  actual_profit numeric(14, 2) not null default 0,
  profit_variance numeric(14, 2) not null default 0,
  cost_variance numeric(14, 2) not null default 0,
  progress_percentage numeric(5, 2) not null default 0,
  completed_tasks_count integer not null default 0,
  pending_tasks_count integer not null default 0,
  unresolved_occurrences_count integer not null default 0,
  open_purchases_count integer not null default 0,
  unpaid_costs_count integer not null default 0,
  overdue_receipts_count integer not null default 0,
  closed_by uuid references auth.users(id) on delete restrict,
  closed_at timestamptz,
  reopened_by uuid references auth.users(id) on delete restrict,
  reopened_at timestamptz,
  closeout_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_closeouts_status_check check (
    status in ('draft', 'ready_to_close', 'closed', 'reopened', 'cancelled')
  ),
  constraint pme_project_closeouts_money_check check (
    planned_cost >= 0 and actual_cost >= 0 and planned_revenue >= 0 and
    received_revenue >= 0 and pending_receivables >= 0
  ),
  constraint pme_project_closeouts_counts_check check (
    completed_tasks_count >= 0 and pending_tasks_count >= 0 and
    unresolved_occurrences_count >= 0 and open_purchases_count >= 0 and
    unpaid_costs_count >= 0 and overdue_receipts_count >= 0
  ),
  constraint pme_project_closeouts_progress_check check (
    progress_percentage >= 0 and progress_percentage <= 100
  ),
  constraint pme_project_closeouts_close_check check (
    status <> 'closed' or (closed_by is not null and closed_at is not null)
  ),
  constraint pme_project_closeouts_reopen_check check (
    status <> 'reopened' or (reopened_by is not null and reopened_at is not null)
  ),
  constraint pme_project_closeouts_project_unique unique (organization_id, project_id),
  constraint pme_project_closeouts_org_id_unique unique (organization_id, id),
  constraint pme_project_closeouts_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_closeouts_source_budget_org_fk foreign key (
    organization_id,
    source_pme_budget_id
  ) references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_closeout_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  closeout_id uuid not null references public.pme_project_closeouts(id) on delete cascade,
  title text not null,
  description text,
  item_type text not null default 'outro',
  status text not null default 'pending',
  is_required boolean not null default true,
  checked_by uuid references auth.users(id) on delete restrict,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_closeout_checklist_title_check check (length(trim(title)) > 0),
  constraint pme_project_closeout_checklist_type_check check (
    item_type in ('financeiro', 'operacional', 'cliente', 'documentos', 'fotos', 'compras', 'recebimentos', 'qualidade', 'outro')
  ),
  constraint pme_project_closeout_checklist_status_check check (
    status in ('pending', 'completed', 'waived')
  ),
  constraint pme_project_closeout_checklist_checked_check check (
    status = 'pending' or checked_at is not null
  ),
  constraint pme_project_closeout_checklist_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_closeout_checklist_closeout_org_fk foreign key (
    organization_id,
    closeout_id
  ) references public.pme_project_closeouts(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_closeout_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  closeout_id uuid not null references public.pme_project_closeouts(id) on delete cascade,
  snapshot_data jsonb not null,
  generated_by uuid not null references auth.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint pme_project_closeout_snapshots_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_closeout_snapshots_closeout_org_fk foreign key (
    organization_id,
    closeout_id
  ) references public.pme_project_closeouts(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  report_type text not null,
  title text not null,
  description text,
  visibility text not null default 'internal',
  data_snapshot jsonb not null,
  generated_by uuid not null references auth.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint pme_project_reports_title_check check (length(trim(title)) > 0),
  constraint pme_project_reports_type_check check (
    report_type in ('financial_summary', 'operational_summary', 'purchases_summary', 'receipts_summary', 'daily_logs_summary', 'client_delivery', 'closeout_internal', 'closeout_client')
  ),
  constraint pme_project_reports_visibility_check check (
    visibility in ('internal', 'client', 'management')
  ),
  constraint pme_project_reports_client_type_check check (
    visibility <> 'client' or report_type in ('client_delivery', 'closeout_client')
  ),
  constraint pme_project_reports_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_reports_org_id_unique unique (organization_id, id)
);

create table if not exists public.pme_project_report_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  report_id uuid not null references public.pme_project_reports(id) on delete cascade,
  export_type text not null,
  file_url text,
  html_snapshot text,
  generated_by uuid not null references auth.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint pme_project_report_exports_type_check check (export_type in ('html', 'pdf', 'print_view')),
  constraint pme_project_report_exports_payload_check check (
    file_url is not null or html_snapshot is not null
  ),
  constraint pme_project_report_exports_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_report_exports_report_org_fk foreign key (organization_id, report_id)
    references public.pme_project_reports(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_report_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  show_internal_costs boolean not null default false,
  show_profit boolean not null default false,
  show_margin boolean not null default false,
  show_purchase_details boolean not null default true,
  show_supplier_names boolean not null default false,
  show_payment_status boolean not null default true,
  show_daily_logs boolean not null default true,
  show_photos boolean not null default true,
  show_occurrences boolean not null default true,
  show_pending_items boolean not null default true,
  show_client_notes boolean not null default true,
  custom_intro_text text,
  custom_footer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_report_settings_project_unique unique (organization_id, project_id),
  constraint pme_project_report_settings_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create index if not exists pme_project_closeouts_project_idx
  on public.pme_project_closeouts (organization_id, project_id, status);
create index if not exists pme_project_closeout_checklist_project_idx
  on public.pme_project_closeout_checklist_items (organization_id, project_id, closeout_id, status);
create index if not exists pme_project_closeout_snapshots_project_idx
  on public.pme_project_closeout_snapshots (organization_id, project_id, closeout_id, generated_at desc);
create index if not exists pme_project_reports_project_type_idx
  on public.pme_project_reports (organization_id, project_id, report_type, generated_at desc);
create index if not exists pme_project_report_exports_report_idx
  on public.pme_project_report_exports (organization_id, report_id, export_type, generated_at desc);
create index if not exists pme_project_report_settings_project_idx
  on public.pme_project_report_settings (organization_id, project_id);

alter table public.pme_project_closeouts enable row level security;
alter table public.pme_project_closeout_checklist_items enable row level security;
alter table public.pme_project_closeout_snapshots enable row level security;
alter table public.pme_project_reports enable row level security;
alter table public.pme_project_report_exports enable row level security;
alter table public.pme_project_report_settings enable row level security;

create policy "Members can read PME project closeouts"
  on public.pme_project_closeouts for select
  using (public.is_organization_member(organization_id));

create policy "Managers can manage PME project closeouts"
  on public.pme_project_closeouts for all
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME project closeout checklist"
  on public.pme_project_closeout_checklist_items for select
  using (public.is_organization_member(organization_id));

create policy "Managers can manage PME project closeout checklist"
  on public.pme_project_closeout_checklist_items for all
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project closeout snapshots"
  on public.pme_project_closeout_snapshots for select
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can create PME project closeout snapshots"
  on public.pme_project_closeout_snapshots for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read safe PME project reports"
  on public.pme_project_reports for select
  using (
    public.is_organization_member(organization_id)
    and (
      visibility = 'client'
      or public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
    )
  );

create policy "Managers can create PME project reports"
  on public.pme_project_reports for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can update PME project reports"
  on public.pme_project_reports for update
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read safe PME project report exports"
  on public.pme_project_report_exports for select
  using (
    public.is_organization_member(organization_id)
    and exists (
      select 1
      from public.pme_project_reports report
      where report.organization_id = pme_project_report_exports.organization_id
        and report.id = pme_project_report_exports.report_id
        and (
          report.visibility = 'client'
          or public.has_organization_role(pme_project_report_exports.organization_id, array['owner', 'admin', 'manager'])
        )
    )
  );

create policy "Managers can create PME project report exports"
  on public.pme_project_report_exports for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can read PME project report settings"
  on public.pme_project_report_settings for select
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can manage PME project report settings"
  on public.pme_project_report_settings for all
  using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
