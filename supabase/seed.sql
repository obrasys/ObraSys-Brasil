-- Homologation seed for local/staging validation.
-- Demo passwords are only for non-production validation: ObraSysDemo#2026

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'authenticated',
    'authenticated',
    'admin@obrasys.local',
    crypt('ObraSysDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Admin Homologacao"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'authenticated',
    'authenticated',
    'operacional@obrasys.local',
    crypt('ObraSysDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Operacional Homologacao"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'authenticated',
    'authenticated',
    'sem-financeiro@obrasys.local',
    crypt('ObraSysDemo#2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Usuario Sem Financeiro"}'::jsonb,
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

do $$
begin
  if to_regclass('auth.identities') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'identities'
        and column_name = 'provider_id'
    )
  then
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values
      (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000101',
        '00000000-0000-0000-0000-000000000101',
        '{"sub":"00000000-0000-0000-0000-000000000101","email":"admin@obrasys.local"}'::jsonb,
        'email',
        now(),
        now(),
        now()
      ),
      (
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000102',
        '00000000-0000-0000-0000-000000000102',
        '{"sub":"00000000-0000-0000-0000-000000000102","email":"operacional@obrasys.local"}'::jsonb,
        'email',
        now(),
        now(),
        now()
      ),
      (
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000103',
        '00000000-0000-0000-0000-000000000103',
        '{"sub":"00000000-0000-0000-0000-000000000103","email":"sem-financeiro@obrasys.local"}'::jsonb,
        'email',
        now(),
        now(),
        now()
      )
    on conflict (provider, provider_id) do update
    set
      identity_data = excluded.identity_data,
      updated_at = now();
  end if;
end $$;

insert into public.profiles (id, full_name, display_name)
values
  ('00000000-0000-0000-0000-000000000101', 'Admin Homologacao', 'Admin'),
  ('00000000-0000-0000-0000-000000000102', 'Operacional Homologacao', 'Operacional'),
  ('00000000-0000-0000-0000-000000000103', 'Usuario Sem Financeiro', 'Sem Financeiro')
on conflict (id) do update
set
  full_name = excluded.full_name,
  display_name = excluded.display_name,
  updated_at = now();

insert into public.organizations (id, name, legal_name, document_number, created_by)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'Organizacao A Homologacao',
    'Organizacao A Engenharia Ltda',
    '00000000000191',
    '00000000-0000-0000-0000-000000000101'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Organizacao B Homologacao',
    'Organizacao B Reformas Ltda',
    '00000000000272',
    '00000000-0000-0000-0000-000000000101'
  )
on conflict (id) do update
set
  name = excluded.name,
  legal_name = excluded.legal_name,
  document_number = excluded.document_number,
  updated_by = excluded.created_by,
  updated_at = now();

insert into public.organization_members (organization_id, user_id, role, status, invited_by)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'admin',
    'active',
    '00000000-0000-0000-0000-000000000101'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000102',
    'manager',
    'active',
    '00000000-0000-0000-0000-000000000101'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000103',
    'viewer',
    'active',
    '00000000-0000-0000-0000-000000000101'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000101',
    'admin',
    'active',
    '00000000-0000-0000-0000-000000000101'
  )
on conflict (organization_id, user_id) do update
set
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.pme_budgets (
  id,
  organization_id,
  client_name,
  client_phone,
  client_email,
  work_address,
  budget_number,
  title,
  description,
  budget_type,
  status,
  subtotal_cost,
  overhead_percentage,
  tax_percentage,
  profit_percentage,
  final_price,
  valid_until,
  created_by,
  updated_by,
  approved_at
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Cliente Demo PME',
  '+55 11 90000-0000',
  'cliente.demo@example.local',
  'Rua Demo, 100 - Sao Paulo/SP',
  'PME-DEMO-001',
  'Reforma demo de apartamento',
  'Orcamento demo para validar fluxo PME em staging.',
  'renovation',
  'approved',
  15000.00,
  10.00,
  6.00,
  18.00,
  20100.00,
  current_date + 30,
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  now()
)
on conflict (organization_id, budget_number) do update
set
  title = excluded.title,
  status = excluded.status,
  subtotal_cost = excluded.subtotal_cost,
  final_price = excluded.final_price,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.pme_budget_items (
  id,
  organization_id,
  budget_id,
  item_type,
  description,
  unit,
  quantity,
  unit_cost,
  subtotal_cost,
  unit_price,
  final_price,
  category,
  source_type,
  total_cost,
  total_price,
  created_by,
  updated_by
)
values (
  '20000000-0000-0000-0000-000000000101',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'service',
  'Demolicao e preparacao',
  'vb',
  1,
  3500.00,
  3500.00,
  4700.00,
  4700.00,
  'servico',
  'manual',
  3500.00,
  4700.00,
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101'
)
on conflict (organization_id, id) do update
set
  description = excluded.description,
  total_cost = excluded.total_cost,
  total_price = excluded.total_price,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.projects (
  id,
  organization_id,
  created_by,
  updated_by,
  name,
  code,
  description,
  status,
  starts_on,
  ends_on
)
values (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000101',
  'Obra Demo PME',
  'OBRA-DEMO-001',
  'Obra demo criada para homologacao de staging.',
  'active',
  current_date,
  current_date + 60
)
on conflict (organization_id, code) do update
set
  name = excluded.name,
  description = excluded.description,
  status = excluded.status,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.pme_suppliers (
  id,
  organization_id,
  name,
  trade_name,
  supplier_type,
  phone,
  email,
  city,
  state,
  created_by
)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Fornecedor Demo Materiais',
  'Demo Materiais',
  'material',
  '+55 11 98888-0000',
  'fornecedor.demo@example.local',
  'Sao Paulo',
  'SP',
  '00000000-0000-0000-0000-000000000101'
)
on conflict (organization_id, id) do update
set
  name = excluded.name,
  trade_name = excluded.trade_name,
  supplier_type = excluded.supplier_type,
  updated_at = now();

insert into public.pme_purchase_orders (
  id,
  organization_id,
  project_id,
  supplier_id,
  supplier_name_snapshot,
  order_number,
  title,
  status,
  subtotal_amount,
  total_amount,
  ordered_at,
  expected_delivery_date,
  payment_status,
  created_by
)
values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  'Fornecedor Demo Materiais',
  'OC-DEMO-001',
  'Compra demo de materiais',
  'ordered',
  2800.00,
  2800.00,
  now(),
  current_date + 7,
  'pending',
  '00000000-0000-0000-0000-000000000101'
)
on conflict (organization_id, order_number) do update
set
  title = excluded.title,
  status = excluded.status,
  total_amount = excluded.total_amount,
  updated_at = now();

insert into public.pme_project_daily_logs (
  id,
  organization_id,
  project_id,
  log_date,
  weather_morning,
  weather_afternoon,
  labor_count,
  work_performed,
  issues,
  next_steps,
  materials_delivered,
  photos_count,
  status,
  created_by
)
values (
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  current_date,
  'ensolarado',
  'nublado',
  4,
  'Preparacao inicial do ambiente e conferencia de materiais.',
  'Sem ocorrencias criticas.',
  'Iniciar demolicao controlada.',
  'Entrega parcial de insumos de protecao.',
  0,
  'completed',
  '00000000-0000-0000-0000-000000000102'
)
on conflict (id) do update
set
  work_performed = excluded.work_performed,
  status = excluded.status,
  updated_at = now();

insert into public.pme_project_reports (
  id,
  organization_id,
  project_id,
  report_type,
  title,
  description,
  visibility,
  data_snapshot,
  generated_by
)
values (
  '70000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'client_delivery',
  'Relatorio demo para cliente',
  'Relatorio sanitizado para validar staging.',
  'client',
  '{"project":"Obra Demo PME","hiddenFields":["actual_cost","profit","margin"],"status":"demo"}'::jsonb,
  '00000000-0000-0000-0000-000000000101'
)
on conflict (organization_id, id) do update
set
  title = excluded.title,
  data_snapshot = excluded.data_snapshot;

insert into public.audit_logs (
  organization_id,
  actor_user_id,
  action,
  entity_table,
  entity_id,
  metadata
)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'staging.seed_loaded',
  'organizations',
  '10000000-0000-0000-0000-000000000001',
  '{"scope":"pme_staging"}'::jsonb
);
