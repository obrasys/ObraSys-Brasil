-- Align Axia PME Assistant with the structured suggestion contract.
-- Axia remains consultative: suggestions never mutate official budgets automatically.

alter table public.axia_prompts
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists module text not null default 'pme_budgets',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'axia_prompts_module_check'
  ) then
    alter table public.axia_prompts
      add constraint axia_prompts_module_check check (length(trim(module)) > 0);
  end if;
end $$;

create trigger axia_prompts_touch_updated_at
before update on public.axia_prompts
for each row execute function public.touch_updated_at();

alter table public.axia_runs
  add column if not exists project_id uuid,
  add column if not exists module text not null default 'pme_budgets',
  add column if not exists action_type text,
  add column if not exists input_summary text not null default '',
  add column if not exists output_summary text,
  add column if not exists model_provider text,
  add column if not exists model_name text,
  add column if not exists token_usage jsonb,
  add column if not exists created_at timestamptz not null default now();

update public.axia_runs
set action_type = case task
  when 'draft_from_text' then 'create_budget_draft'
  when 'draft_from_renovation_description' then 'create_budget_draft'
  when 'suggest_environments_services' then 'create_budget_draft'
  when 'low_margin_alert' then 'review_budget_margin'
  when 'compare_sinapi_reference' then 'compare_with_sinapi'
  when 'commercial_proposal_text' then 'generate_proposal_text'
  when 'execution_checklist' then 'generate_execution_checklist'
  else task
end
where action_type is null;

update public.axia_runs
set
  model_provider = coalesce(model_provider, 'local'),
  model_name = coalesce(model_name, model),
  input_summary = coalesce(nullif(input_summary, ''), task)
where model_provider is null
   or model_name is null
   or input_summary = '';

alter table public.axia_runs
  alter column action_type set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'axia_runs_status_check'
  ) then
    alter table public.axia_runs drop constraint axia_runs_status_check;
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'axia_runs_task_check'
  ) then
    alter table public.axia_runs drop constraint axia_runs_task_check;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'axia_runs_action_type_check'
  ) then
    alter table public.axia_runs
      add constraint axia_runs_action_type_check check (
        action_type in (
          'create_budget_draft',
          'suggest_missing_items',
          'review_budget_margin',
          'compare_with_sinapi',
          'generate_proposal_text',
          'generate_execution_checklist',
          'explain_budget_to_client'
        )
      );
  end if;

  alter table public.axia_runs
    add constraint axia_runs_status_check check (
      status in ('queued', 'processing', 'completed', 'failed', 'cancelled')
    );

  if not exists (
    select 1 from pg_constraint where conname = 'axia_runs_module_check'
  ) then
    alter table public.axia_runs
      add constraint axia_runs_module_check check (length(trim(module)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'axia_runs_project_org_fk'
  ) then
    alter table public.axia_runs
      add constraint axia_runs_project_org_fk foreign key (organization_id, project_id)
        references public.projects(organization_id, id) on delete restrict;
  end if;
end $$;

alter table public.axia_context_snapshots
  add column if not exists axia_run_id uuid,
  add column if not exists project_id uuid,
  add column if not exists redaction_summary jsonb not null default '{}'::jsonb;

update public.axia_context_snapshots
set axia_run_id = run_id
where axia_run_id is null;

alter table public.axia_context_snapshots
  alter column axia_run_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'axia_context_snapshots_axia_run_org_fk'
  ) then
    alter table public.axia_context_snapshots
      add constraint axia_context_snapshots_axia_run_org_fk foreign key (organization_id, axia_run_id)
        references public.axia_runs(organization_id, id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'axia_context_snapshots_project_org_fk'
  ) then
    alter table public.axia_context_snapshots
      add constraint axia_context_snapshots_project_org_fk foreign key (organization_id, project_id)
        references public.projects(organization_id, id) on delete restrict;
  end if;
end $$;

create table if not exists public.axia_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  axia_run_id uuid not null references public.axia_runs(id) on delete cascade,
  budget_id uuid references public.pme_budgets(id) on delete restrict,
  project_id uuid references public.projects(id) on delete restrict,
  suggestion_type text not null,
  title text not null,
  summary text not null,
  severity text not null default 'low',
  status text not null default 'suggested',
  confidence_score numeric(5, 4),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint axia_suggestions_org_id_unique unique (organization_id, id),
  constraint axia_suggestions_type_check check (
    suggestion_type in (
      'budget_draft',
      'missing_item',
      'margin_alert',
      'sinapi_comparison',
      'proposal_text',
      'execution_checklist',
      'client_explanation',
      'risk_alert'
    )
  ),
  constraint axia_suggestions_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint axia_suggestions_status_check check (
    status in ('suggested', 'accepted', 'rejected', 'applied', 'archived')
  ),
  constraint axia_suggestions_confidence_check check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
  ),
  constraint axia_suggestions_title_check check (length(trim(title)) > 0),
  constraint axia_suggestions_summary_check check (length(trim(summary)) > 0),
  constraint axia_suggestions_run_org_fk foreign key (organization_id, axia_run_id)
    references public.axia_runs(organization_id, id) on delete cascade,
  constraint axia_suggestions_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict,
  constraint axia_suggestions_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete restrict
);

create table if not exists public.axia_suggestion_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  suggestion_id uuid not null references public.axia_suggestions(id) on delete cascade,
  budget_id uuid references public.pme_budgets(id) on delete restrict,
  suggested_action text not null,
  suggested_payload jsonb not null default '{}'::jsonb,
  status text not null default 'suggested',
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint axia_suggestion_items_action_check check (
    suggested_action in (
      'create_environment',
      'create_budget_item',
      'create_material',
      'create_labor',
      'update_margin_warning',
      'create_proposal_text',
      'create_checklist_item',
      'add_note'
    )
  ),
  constraint axia_suggestion_items_status_check check (
    status in ('suggested', 'accepted', 'rejected', 'applied', 'archived')
  ),
  constraint axia_suggestion_items_suggestion_org_fk foreign key (organization_id, suggestion_id)
    references public.axia_suggestions(organization_id, id) on delete cascade,
  constraint axia_suggestion_items_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.axia_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  axia_run_id uuid not null references public.axia_runs(id) on delete cascade,
  suggestion_id uuid,
  rating integer not null,
  comment text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint axia_feedback_rating_check check (rating >= 1 and rating <= 5),
  constraint axia_feedback_run_org_fk foreign key (organization_id, axia_run_id)
    references public.axia_runs(organization_id, id) on delete cascade,
  constraint axia_feedback_suggestion_org_fk foreign key (organization_id, suggestion_id)
    references public.axia_suggestions(organization_id, id) on delete restrict
);

create table if not exists public.axia_redaction_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  axia_run_id uuid not null references public.axia_runs(id) on delete cascade,
  redacted_fields jsonb not null default '[]'::jsonb,
  redaction_reason text not null,
  created_at timestamptz not null default now(),
  constraint axia_redaction_logs_reason_check check (length(trim(redaction_reason)) > 0),
  constraint axia_redaction_logs_run_org_fk foreign key (organization_id, axia_run_id)
    references public.axia_runs(organization_id, id) on delete cascade
);

create index if not exists axia_prompts_module_active_idx
  on public.axia_prompts(module, prompt_key, is_active, version desc);
create index if not exists axia_runs_action_created_idx
  on public.axia_runs(organization_id, action_type, created_at desc);
create index if not exists axia_context_snapshots_axia_run_idx
  on public.axia_context_snapshots(axia_run_id);
create index if not exists axia_suggestions_budget_status_idx
  on public.axia_suggestions(organization_id, budget_id, status, created_at desc);
create index if not exists axia_suggestions_run_idx
  on public.axia_suggestions(axia_run_id);
create index if not exists axia_suggestion_items_suggestion_idx
  on public.axia_suggestion_items(suggestion_id);
create index if not exists axia_feedback_run_idx
  on public.axia_feedback(axia_run_id);
create index if not exists axia_redaction_logs_run_idx
  on public.axia_redaction_logs(axia_run_id);

alter table public.axia_suggestions enable row level security;
alter table public.axia_suggestion_items enable row level security;
alter table public.axia_feedback enable row level security;
alter table public.axia_redaction_logs enable row level security;

create policy "Members can read Axia suggestions"
on public.axia_suggestions
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create Axia suggestions"
on public.axia_suggestions
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])
);

create policy "Managers can review Axia suggestions"
on public.axia_suggestions
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read Axia suggestion items"
on public.axia_suggestion_items
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can create Axia suggestion items"
on public.axia_suggestion_items
for insert
to authenticated
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can update Axia suggestion items"
on public.axia_suggestion_items
for update
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']))
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can create Axia feedback"
on public.axia_feedback
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_organization_member(organization_id)
);

create policy "Members can read Axia feedback"
on public.axia_feedback
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can read Axia redaction logs"
on public.axia_redaction_logs
for select
to authenticated
using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Managers can create Axia redaction logs"
on public.axia_redaction_logs
for insert
to authenticated
with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

insert into public.axia_prompts (
  organization_id,
  module,
  prompt_key,
  version,
  title,
  system_prompt,
  response_schema,
  is_active,
  created_by
)
values (
  null,
  'pme_budgets',
  'pme_budget_assistant',
  2,
  'Axia PME Budget Assistant v2',
  'Você é a Axia, inteligência operacional do Obra Sys Brasil, especializada em orçamento para pequenas construtoras, empreiteiros e empresas de reformas no Brasil. Seu papel é ajudar o usuário a criar, revisar e melhorar orçamentos de forma prática, clara e segura. Você pode sugerir ambientes, serviços, materiais, mão de obra, textos comerciais, checklists e alertas de margem. Você não pode aprovar orçamento, alterar valores oficiais, converter orçamento em obra, apagar dados, aprovar pagamentos ou tomar decisões autônomas. Toda sugestão deve ser tratada como rascunho para validação humana.',
  '{
    "type": "object",
    "required": ["summary", "suggestions", "warnings", "human_validation_required"],
    "properties": {
      "summary": { "type": "string" },
      "suggestions": { "type": "array" },
      "warnings": { "type": "array" },
      "human_validation_required": { "type": "boolean", "const": true }
    }
  }'::jsonb,
  true,
  null
)
on conflict (prompt_key, version) do nothing;
