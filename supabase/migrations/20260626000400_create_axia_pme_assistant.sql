-- Axia PME Assistant - prompts, runs, context snapshots and insights.
-- Axia is consultative: suggestions are draft/suggested and never mutate official budgets.

create table if not exists public.axia_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version integer not null,
  title text not null,
  system_prompt text not null,
  response_schema jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint axia_prompts_key_check check (length(trim(prompt_key)) > 0),
  constraint axia_prompts_version_check check (version > 0),
  constraint axia_prompts_title_check check (length(trim(title)) > 0),
  constraint axia_prompts_system_prompt_check check (length(trim(system_prompt)) > 0),
  constraint axia_prompts_unique_version unique (prompt_key, version)
);

create table if not exists public.axia_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  budget_id uuid,
  prompt_id uuid not null references public.axia_prompts(id) on delete restrict,
  task text not null,
  status text not null default 'completed',
  model text not null default 'axia-local-structured-v1',
  created_by uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  constraint axia_runs_org_id_unique unique (organization_id, id),
  constraint axia_runs_task_check check (
    task in (
      'suggest_missing_items',
      'draft_from_text',
      'draft_from_renovation_description',
      'suggest_environments_services',
      'low_margin_alert',
      'compare_sinapi_reference',
      'commercial_proposal_text',
      'execution_checklist'
    )
  ),
  constraint axia_runs_status_check check (status in ('completed', 'failed')),
  constraint axia_runs_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.axia_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.axia_runs(id) on delete cascade,
  budget_id uuid,
  purpose text not null,
  sanitized_context jsonb not null default '{}'::jsonb,
  removed_fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint axia_context_snapshots_purpose_check check (length(trim(purpose)) > 0),
  constraint axia_context_snapshots_run_org_unique unique (organization_id, run_id),
  constraint axia_context_snapshots_run_org_fk foreign key (organization_id, run_id)
    references public.axia_runs(organization_id, id) on delete cascade,
  constraint axia_context_snapshots_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create table if not exists public.axia_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  run_id uuid not null references public.axia_runs(id) on delete cascade,
  budget_id uuid,
  insight_type text not null,
  status text not null default 'suggested',
  title text not null,
  summary text not null,
  evidence jsonb not null default '[]'::jsonb,
  suggested_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint axia_insights_type_check check (
    insight_type in (
      'missing_item',
      'draft_budget',
      'environment_service',
      'margin_alert',
      'sinapi_comparison',
      'commercial_text',
      'execution_checklist'
    )
  ),
  constraint axia_insights_status_check check (status in ('draft', 'suggested')),
  constraint axia_insights_title_check check (length(trim(title)) > 0),
  constraint axia_insights_summary_check check (length(trim(summary)) > 0),
  constraint axia_insights_run_org_fk foreign key (organization_id, run_id)
    references public.axia_runs(organization_id, id) on delete cascade,
  constraint axia_insights_budget_org_fk foreign key (organization_id, budget_id)
    references public.pme_budgets(organization_id, id) on delete restrict
);

create index if not exists axia_prompts_active_idx
  on public.axia_prompts(prompt_key, is_active, version desc);
create index if not exists axia_runs_organization_created_idx
  on public.axia_runs(organization_id, started_at desc);
create index if not exists axia_runs_budget_idx on public.axia_runs(budget_id);
create index if not exists axia_context_snapshots_run_idx on public.axia_context_snapshots(run_id);
create index if not exists axia_insights_run_idx on public.axia_insights(run_id);
create index if not exists axia_insights_budget_idx on public.axia_insights(budget_id);

alter table public.axia_prompts enable row level security;
alter table public.axia_runs enable row level security;
alter table public.axia_context_snapshots enable row level security;
alter table public.axia_insights enable row level security;

create policy "Authenticated users can read active Axia prompts"
on public.axia_prompts
for select
to authenticated
using (is_active);

create policy "Members can read Axia runs"
on public.axia_runs
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create Axia runs"
on public.axia_runs
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_organization_member(organization_id)
);

create policy "Members can read Axia context snapshots"
on public.axia_context_snapshots
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create Axia context snapshots"
on public.axia_context_snapshots
for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy "Members can read Axia insights"
on public.axia_insights
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create Axia insights"
on public.axia_insights
for insert
to authenticated
with check (
  status in ('draft', 'suggested')
  and public.is_organization_member(organization_id)
);

insert into public.axia_prompts (
  id,
  prompt_key,
  version,
  title,
  system_prompt,
  response_schema,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000401',
  'pme_budget_assistant',
  1,
  'Axia PME Budget Assistant v1',
  'Você é a Axia, uma IA consultiva do Obra Sys Brasil para Orçamentos PME. Responda apenas com JSON estruturado. Não aprove orçamentos, não altere orçamento oficial, não converta orçamento em obra, não altere preço final e marque toda sugestão como draft ou suggested. Não solicite CPF, dados bancários, tokens, senhas ou dados sensíveis.',
  '{
    "type": "object",
    "required": ["task", "status", "insights"],
    "properties": {
      "task": { "type": "string" },
      "status": { "type": "string", "enum": ["draft", "suggested"] },
      "insights": { "type": "array" }
    }
  }'::jsonb,
  true
)
on conflict (prompt_key, version) do nothing;
