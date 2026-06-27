-- Diario de Obra PME guiado com voz, fotos e meteorologia.
-- Migration additive-first: nao remove dados existentes do diario simples.

alter table public.pme_project_daily_logs
  add column if not exists weather_source text,
  add column if not exists weather_summary text,
  add column if not exists voice_summary text,
  add column if not exists completion_notes text,
  add column if not exists locked_by uuid references auth.users(id) on delete restrict,
  add column if not exists locked_at timestamptz,
  add column if not exists completed_by uuid references auth.users(id) on delete restrict,
  add column if not exists completed_at timestamptz,
  add column if not exists report_html_snapshot text,
  add column if not exists report_file_url text;

alter table public.pme_project_daily_logs
  drop constraint if exists pme_project_daily_logs_status_check;

alter table public.pme_project_daily_logs
  add constraint pme_project_daily_logs_status_check check (
    status in ('draft', 'in_review', 'completed', 'locked', 'cancelled')
  );

alter table public.pme_project_daily_logs
  drop constraint if exists pme_project_daily_logs_weather_source_check;

alter table public.pme_project_daily_logs
  add constraint pme_project_daily_logs_weather_source_check check (
    weather_source is null or weather_source in ('manual', 'automatic', 'imported')
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pme_project_daily_logs_org_id_unique'
  ) then
    alter table public.pme_project_daily_logs
      add constraint pme_project_daily_logs_org_id_unique unique (organization_id, id);
  end if;
end;
$$;

create table if not exists public.pme_project_daily_log_labor (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  worker_type text not null,
  worker_name text,
  company_name text,
  quantity numeric(14, 4) not null,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_labor_type_check check (
    worker_type in ('pedreiro', 'servente', 'pintor', 'eletricista', 'encanador', 'gesseiro', 'azulejista', 'marceneiro', 'jardineiro', 'mestre_de_obras', 'ajudante_geral', 'terceiro', 'outro')
  ),
  constraint pme_project_daily_log_labor_quantity_check check (quantity > 0),
  constraint pme_project_daily_log_labor_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_labor_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  stage_id uuid references public.pme_project_stages(id) on delete set null,
  task_id uuid references public.pme_project_tasks(id) on delete set null,
  title text not null,
  description text not null,
  progress_percentage numeric(5, 2),
  status text not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_activities_title_check check (length(trim(title)) > 0),
  constraint pme_project_daily_log_activities_description_check check (length(trim(description)) > 0),
  constraint pme_project_daily_log_activities_progress_check check (
    progress_percentage is null or (progress_percentage >= 0 and progress_percentage <= 100)
  ),
  constraint pme_project_daily_log_activities_status_check check (
    status in ('planned', 'in_progress', 'completed', 'blocked', 'cancelled')
  ),
  constraint pme_project_daily_log_activities_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_activities_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_activities_stage_org_fk foreign key (organization_id, stage_id)
    references public.pme_project_stages(organization_id, id) on delete restrict,
  constraint pme_project_daily_log_activities_task_org_fk foreign key (organization_id, task_id)
    references public.pme_project_tasks(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_daily_log_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  occurrence_type text not null,
  title text not null,
  description text not null,
  severity text not null,
  action_taken text,
  requires_follow_up boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_occurrences_type_check check (
    occurrence_type in ('atraso', 'problema_tecnico', 'falta_material', 'alteracao_cliente', 'acidente', 'clima', 'fornecedor', 'qualidade', 'seguranca', 'outro')
  ),
  constraint pme_project_daily_log_occurrences_severity_check check (
    severity in ('low', 'medium', 'high', 'critical')
  ),
  constraint pme_project_daily_log_occurrences_title_check check (length(trim(title)) > 0),
  constraint pme_project_daily_log_occurrences_description_check check (length(trim(description)) > 0),
  constraint pme_project_daily_log_occurrences_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_occurrences_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  material_name text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  usage_type text not null,
  supplier_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_materials_name_check check (length(trim(material_name)) > 0),
  constraint pme_project_daily_log_materials_quantity_check check (quantity > 0),
  constraint pme_project_daily_log_materials_unit_check check (length(trim(unit)) > 0),
  constraint pme_project_daily_log_materials_usage_check check (
    usage_type in ('delivered', 'used', 'returned', 'missing', 'damaged')
  ),
  constraint pme_project_daily_log_materials_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_materials_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  equipment_name text not null,
  quantity numeric(14, 4) not null,
  usage_hours numeric(10, 2),
  status text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_equipment_name_check check (length(trim(equipment_name)) > 0),
  constraint pme_project_daily_log_equipment_quantity_check check (quantity > 0),
  constraint pme_project_daily_log_equipment_hours_check check (usage_hours is null or usage_hours >= 0),
  constraint pme_project_daily_log_equipment_status_check check (
    status in ('available', 'in_use', 'broken', 'returned', 'not_used')
  ),
  constraint pme_project_daily_log_equipment_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_equipment_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_weather (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  weather_date date not null,
  location_label text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  source text not null,
  morning_condition text,
  afternoon_condition text,
  temperature_min numeric(5, 2),
  temperature_max numeric(5, 2),
  rain_probability numeric(5, 2),
  rainfall_mm numeric(8, 2),
  wind_speed numeric(8, 2),
  raw_weather_data jsonb,
  created_at timestamptz not null default now(),
  constraint pme_project_daily_log_weather_source_check check (source in ('manual', 'automatic', 'imported')),
  constraint pme_project_daily_log_weather_rain_check check (
    rain_probability is null or (rain_probability >= 0 and rain_probability <= 100)
  ),
  constraint pme_project_daily_log_weather_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_weather_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_voice_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  audio_file_url text,
  transcript_text text not null,
  structured_payload jsonb,
  processing_status text not null default 'pending',
  processed_by_axia_run_id uuid references public.axia_runs(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_voice_notes_transcript_check check (
    length(trim(transcript_text)) > 0 and length(transcript_text) <= 12000
  ),
  constraint pme_project_daily_log_voice_notes_status_check check (
    processing_status in ('pending', 'processing', 'completed', 'failed')
  ),
  constraint pme_project_daily_log_voice_notes_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_voice_notes_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_voice_notes_axia_org_fk foreign key (organization_id, processed_by_axia_run_id)
    references public.axia_runs(organization_id, id) on delete restrict
);

create table if not exists public.pme_project_daily_log_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  review_status text not null default 'pending',
  reviewed_by uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_project_daily_log_reviews_status_check check (
    review_status in ('pending', 'approved', 'rejected', 'changes_requested')
  ),
  constraint pme_project_daily_log_reviews_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_reviews_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create table if not exists public.pme_project_daily_log_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  daily_log_id uuid not null references public.pme_project_daily_logs(id) on delete cascade,
  export_type text not null,
  html_snapshot text,
  file_url text,
  generated_by uuid not null references auth.users(id) on delete restrict,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint pme_project_daily_log_exports_type_check check (export_type in ('html', 'pdf', 'print_view')),
  constraint pme_project_daily_log_exports_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_project_daily_log_exports_daily_log_org_fk foreign key (organization_id, daily_log_id)
    references public.pme_project_daily_logs(organization_id, id) on delete cascade
);

create index if not exists pme_daily_log_labor_log_idx on public.pme_project_daily_log_labor(organization_id, daily_log_id);
create index if not exists pme_daily_log_activities_log_idx on public.pme_project_daily_log_activities(organization_id, daily_log_id, status);
create index if not exists pme_daily_log_occurrences_log_idx on public.pme_project_daily_log_occurrences(organization_id, daily_log_id, severity);
create index if not exists pme_daily_log_materials_log_idx on public.pme_project_daily_log_materials(organization_id, daily_log_id);
create index if not exists pme_daily_log_equipment_log_idx on public.pme_project_daily_log_equipment(organization_id, daily_log_id);
create index if not exists pme_daily_log_weather_log_idx on public.pme_project_daily_log_weather(organization_id, daily_log_id, weather_date desc);
create index if not exists pme_daily_log_voice_notes_log_idx on public.pme_project_daily_log_voice_notes(organization_id, daily_log_id, processing_status);
create index if not exists pme_daily_log_reviews_log_idx on public.pme_project_daily_log_reviews(organization_id, daily_log_id, review_status);
create index if not exists pme_daily_log_exports_log_idx on public.pme_project_daily_log_exports(organization_id, daily_log_id, generated_at desc);

create trigger pme_daily_log_labor_touch_updated_at before update on public.pme_project_daily_log_labor for each row execute function public.touch_updated_at();
create trigger pme_daily_log_activities_touch_updated_at before update on public.pme_project_daily_log_activities for each row execute function public.touch_updated_at();
create trigger pme_daily_log_occurrences_touch_updated_at before update on public.pme_project_daily_log_occurrences for each row execute function public.touch_updated_at();
create trigger pme_daily_log_materials_touch_updated_at before update on public.pme_project_daily_log_materials for each row execute function public.touch_updated_at();
create trigger pme_daily_log_equipment_touch_updated_at before update on public.pme_project_daily_log_equipment for each row execute function public.touch_updated_at();
create trigger pme_daily_log_voice_notes_touch_updated_at before update on public.pme_project_daily_log_voice_notes for each row execute function public.touch_updated_at();
create trigger pme_daily_log_reviews_touch_updated_at before update on public.pme_project_daily_log_reviews for each row execute function public.touch_updated_at();

alter table public.pme_project_daily_log_labor enable row level security;
alter table public.pme_project_daily_log_activities enable row level security;
alter table public.pme_project_daily_log_occurrences enable row level security;
alter table public.pme_project_daily_log_materials enable row level security;
alter table public.pme_project_daily_log_equipment enable row level security;
alter table public.pme_project_daily_log_weather enable row level security;
alter table public.pme_project_daily_log_voice_notes enable row level security;
alter table public.pme_project_daily_log_reviews enable row level security;
alter table public.pme_project_daily_log_exports enable row level security;

create policy "Members can read PME daily log labor" on public.pme_project_daily_log_labor for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log labor" on public.pme_project_daily_log_labor for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log activities" on public.pme_project_daily_log_activities for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log activities" on public.pme_project_daily_log_activities for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log occurrences" on public.pme_project_daily_log_occurrences for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log occurrences" on public.pme_project_daily_log_occurrences for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log materials" on public.pme_project_daily_log_materials for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log materials" on public.pme_project_daily_log_materials for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log equipment" on public.pme_project_daily_log_equipment for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log equipment" on public.pme_project_daily_log_equipment for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log weather" on public.pme_project_daily_log_weather for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log weather" on public.pme_project_daily_log_weather for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log voice notes" on public.pme_project_daily_log_voice_notes for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log voice notes" on public.pme_project_daily_log_voice_notes for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log reviews" on public.pme_project_daily_log_reviews for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME daily log reviews" on public.pme_project_daily_log_reviews for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME daily log exports" on public.pme_project_daily_log_exports for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can create PME daily log exports" on public.pme_project_daily_log_exports for insert to authenticated with check (generated_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
