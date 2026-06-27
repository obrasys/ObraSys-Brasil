-- Notificacoes, lembretes e alertas PME.
-- Centro interno in-app com preferencias, eventos, entregas e historico de status.

create table if not exists public.pme_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  budget_id uuid references public.pme_budgets(id) on delete cascade,
  source_table text,
  source_id uuid,
  notification_type text not null,
  severity text not null default 'medium',
  title text not null,
  message text not null,
  action_url text,
  status text not null default 'unread',
  due_date date,
  read_at timestamptz,
  archived_at timestamptz,
  resolved_at timestamptz,
  created_by_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_notifications_title_check check (length(trim(title)) > 0),
  constraint pme_notifications_message_check check (length(trim(message)) > 0),
  constraint pme_notifications_action_url_check check (
    action_url is null or action_url ~ '^/app/'
  ),
  constraint pme_notifications_type_check check (
    notification_type in (
      'overdue_receipt',
      'late_purchase',
      'blocked_task',
      'missing_daily_log',
      'cost_overrun',
      'low_margin',
      'budget_follow_up',
      'budget_approved_not_converted',
      'project_ready_to_close',
      'critical_occurrence',
      'pending_cost',
      'purchase_without_actual_cost',
      'daily_log_pending_review',
      'closeout_pending',
      'system_notice',
      'other'
    )
  ),
  constraint pme_notifications_severity_check check (
    severity in ('info', 'low', 'medium', 'high', 'critical')
  ),
  constraint pme_notifications_status_check check (
    status in ('unread', 'read', 'archived', 'resolved', 'dismissed')
  ),
  constraint pme_notifications_read_check check (status <> 'read' or read_at is not null),
  constraint pme_notifications_archived_check check (status <> 'archived' or archived_at is not null),
  constraint pme_notifications_resolved_check check (status <> 'resolved' or resolved_at is not null),
  constraint pme_notifications_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_notifications_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete cascade,
  constraint pme_notifications_org_id_unique unique (organization_id, id)
);

create table if not exists public.pme_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  push_enabled boolean not null default false,
  frequency text not null default 'immediate',
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_notification_preferences_type_check check (
    notification_type in (
      'overdue_receipt',
      'late_purchase',
      'blocked_task',
      'missing_daily_log',
      'cost_overrun',
      'low_margin',
      'budget_follow_up',
      'budget_approved_not_converted',
      'project_ready_to_close',
      'critical_occurrence',
      'pending_cost',
      'purchase_without_actual_cost',
      'daily_log_pending_review',
      'closeout_pending',
      'system_notice',
      'other'
    )
  ),
  constraint pme_notification_preferences_frequency_check check (
    frequency in ('immediate', 'daily_digest', 'weekly_digest', 'disabled')
  ),
  constraint pme_notification_preferences_unique unique (
    organization_id,
    user_id,
    notification_type
  )
);

create table if not exists public.pme_notification_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  rule_key text not null,
  notification_type text not null,
  title_template text not null,
  message_template text not null,
  severity text not null default 'medium',
  is_active boolean not null default true,
  threshold_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_notification_rules_key_check check (length(trim(rule_key)) > 0),
  constraint pme_notification_rules_template_check check (
    length(trim(title_template)) > 0 and length(trim(message_template)) > 0
  ),
  constraint pme_notification_rules_unique unique (organization_id, rule_key),
  constraint pme_notification_rules_severity_check check (
    severity in ('info', 'low', 'medium', 'high', 'critical')
  )
);

create table if not exists public.pme_notification_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid references public.pme_notifications(id) on delete cascade,
  event_type text not null,
  source_table text,
  source_id uuid,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint pme_notification_events_type_check check (
    event_type in (
      'generated',
      'read',
      'archived',
      'resolved',
      'dismissed',
      'delivery_attempted',
      'delivery_failed'
    )
  ),
  constraint pme_notification_events_notification_org_fk foreign key (
    organization_id,
    notification_id
  ) references public.pme_notifications(organization_id, id) on delete cascade
);

create table if not exists public.pme_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.pme_notifications(id) on delete cascade,
  channel text not null,
  status text not null default 'pending',
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  constraint pme_notification_deliveries_channel_check check (channel in ('in_app', 'email', 'push')),
  constraint pme_notification_deliveries_status_check check (
    status in ('pending', 'delivered', 'failed', 'skipped')
  ),
  constraint pme_notification_deliveries_notification_org_fk foreign key (
    organization_id,
    notification_id
  ) references public.pme_notifications(organization_id, id) on delete cascade
);

create table if not exists public.pme_notification_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  notification_id uuid not null references public.pme_notifications(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  notes text,
  constraint pme_notification_status_history_status_check check (
    new_status in ('unread', 'read', 'archived', 'resolved', 'dismissed')
  ),
  constraint pme_notification_status_history_notification_org_fk foreign key (
    organization_id,
    notification_id
  ) references public.pme_notifications(organization_id, id) on delete cascade
);

create unique index if not exists pme_notifications_active_source_unique_idx
  on public.pme_notifications (
    organization_id,
    coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid),
    notification_type,
    coalesce(source_table, ''),
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where status in ('unread', 'read');

create index if not exists pme_notifications_org_user_status_idx
  on public.pme_notifications (organization_id, user_id, status, created_at desc);
create index if not exists pme_notifications_org_type_idx
  on public.pme_notifications (organization_id, notification_type, severity, created_at desc);
create index if not exists pme_notifications_source_idx
  on public.pme_notifications (organization_id, source_table, source_id);
create index if not exists pme_notification_preferences_user_idx
  on public.pme_notification_preferences (organization_id, user_id, notification_type);
create index if not exists pme_notification_events_notification_idx
  on public.pme_notification_events (organization_id, notification_id, created_at desc);
create index if not exists pme_notification_deliveries_notification_idx
  on public.pme_notification_deliveries (organization_id, notification_id, channel);
create index if not exists pme_notification_status_history_notification_idx
  on public.pme_notification_status_history (organization_id, notification_id, changed_at desc);

alter table public.pme_notifications enable row level security;
alter table public.pme_notification_preferences enable row level security;
alter table public.pme_notification_rules enable row level security;
alter table public.pme_notification_events enable row level security;
alter table public.pme_notification_deliveries enable row level security;
alter table public.pme_notification_status_history enable row level security;

create policy "Users can read own and organization PME notifications"
  on public.pme_notifications for select
  using (
    public.is_organization_member(organization_id)
    and (
      user_id = auth.uid()
      or (
        user_id is null
        and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
      )
    )
  );

create policy "Managers can create PME notifications"
  on public.pme_notifications for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Users can update accessible PME notifications"
  on public.pme_notifications for update
  using (
    public.is_organization_member(organization_id)
    and (
      user_id = auth.uid()
      or public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
    )
  )
  with check (
    public.is_organization_member(organization_id)
    and (
      user_id = auth.uid()
      or public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
    )
  );

create policy "Users can read own PME notification preferences"
  on public.pme_notification_preferences for select
  using (public.is_organization_member(organization_id) and user_id = auth.uid());

create policy "Users can manage own PME notification preferences"
  on public.pme_notification_preferences for all
  using (public.is_organization_member(organization_id) and user_id = auth.uid())
  with check (public.is_organization_member(organization_id) and user_id = auth.uid());

create policy "Members can read PME notification rules"
  on public.pme_notification_rules for select
  using (organization_id is null or public.is_organization_member(organization_id));

create policy "Managers can manage PME notification rules"
  on public.pme_notification_rules for all
  using (organization_id is not null and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
  with check (organization_id is not null and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME notification events"
  on public.pme_notification_events for select
  using (public.is_organization_member(organization_id));

create policy "Managers can create PME notification events"
  on public.pme_notification_events for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME notification deliveries"
  on public.pme_notification_deliveries for select
  using (public.is_organization_member(organization_id));

create policy "Managers can create PME notification deliveries"
  on public.pme_notification_deliveries for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME notification status history"
  on public.pme_notification_status_history for select
  using (public.is_organization_member(organization_id));

create policy "Managers can create PME notification status history"
  on public.pme_notification_status_history for insert
  with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
