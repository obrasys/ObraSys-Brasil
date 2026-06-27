-- Compras e Fornecedores PME.
-- Camada leve de fornecedores, cotacoes, pedidos, entregas e anexos para obras PME.

create table if not exists public.pme_suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null,
  trade_name text,
  cnpj text,
  cpf text,
  supplier_type text not null default 'outro',
  phone text,
  email text,
  address text,
  city text,
  state text,
  notes text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_suppliers_name_check check (length(trim(name)) > 0),
  constraint pme_suppliers_type_check check (
    supplier_type in ('material', 'mao_de_obra', 'servico', 'equipamento', 'transporte', 'descarte', 'misto', 'outro')
  ),
  constraint pme_suppliers_org_id_unique unique (organization_id, id)
);

create table if not exists public.pme_supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_id uuid not null references public.pme_suppliers(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_supplier_contacts_name_check check (length(trim(name)) > 0),
  constraint pme_supplier_contacts_supplier_org_fk foreign key (organization_id, supplier_id)
    references public.pme_suppliers(organization_id, id) on delete cascade
);

create table if not exists public.pme_purchase_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  request_number text not null,
  title text not null,
  description text,
  status text not null default 'draft',
  needed_by_date date,
  requested_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_requests_number_check check (length(trim(request_number)) > 0),
  constraint pme_purchase_requests_title_check check (length(trim(title)) > 0),
  constraint pme_purchase_requests_status_check check (
    status in ('draft', 'requested', 'quoted', 'approved', 'converted_to_order', 'cancelled')
  ),
  constraint pme_purchase_requests_org_number_unique unique (organization_id, request_number),
  constraint pme_purchase_requests_org_id_unique unique (organization_id, id),
  constraint pme_purchase_requests_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_purchase_request_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_request_id uuid not null references public.pme_purchase_requests(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_budget_material_id uuid references public.pme_budget_materials(id) on delete set null,
  source_forecast_id uuid references public.pme_project_cost_forecasts(id) on delete set null,
  description text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  estimated_unit_cost numeric(14, 2),
  estimated_total_cost numeric(14, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_request_items_description_check check (length(trim(description)) > 0),
  constraint pme_purchase_request_items_quantity_check check (quantity > 0),
  constraint pme_purchase_request_items_unit_check check (length(trim(unit)) > 0),
  constraint pme_purchase_request_items_cost_check check (
    (estimated_unit_cost is null or estimated_unit_cost >= 0)
    and (estimated_total_cost is null or estimated_total_cost >= 0)
  ),
  constraint pme_purchase_request_items_org_id_unique unique (organization_id, id),
  constraint pme_purchase_request_items_request_org_fk foreign key (organization_id, purchase_request_id)
    references public.pme_purchase_requests(organization_id, id) on delete cascade,
  constraint pme_purchase_request_items_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_purchase_request_items_material_org_fk foreign key (organization_id, source_budget_material_id)
    references public.pme_budget_materials(organization_id, id) on delete restrict,
  constraint pme_purchase_request_items_forecast_org_fk foreign key (organization_id, source_forecast_id)
    references public.pme_project_cost_forecasts(organization_id, id) on delete restrict
);

create table if not exists public.pme_supplier_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  purchase_request_id uuid references public.pme_purchase_requests(id) on delete set null,
  supplier_id uuid references public.pme_suppliers(id) on delete set null,
  supplier_name_snapshot text not null,
  quote_number text,
  status text not null default 'draft',
  total_amount numeric(14, 2) not null default 0,
  delivery_cost numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  final_amount numeric(14, 2) not null default 0,
  valid_until date,
  delivery_deadline date,
  payment_terms text,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_supplier_quotes_supplier_snapshot_check check (length(trim(supplier_name_snapshot)) > 0),
  constraint pme_supplier_quotes_status_check check (status in ('draft', 'received', 'selected', 'rejected', 'expired', 'cancelled')),
  constraint pme_supplier_quotes_amount_check check (
    total_amount >= 0 and delivery_cost >= 0 and discount_amount >= 0 and final_amount >= 0
  ),
  constraint pme_supplier_quotes_org_id_unique unique (organization_id, id),
  constraint pme_supplier_quotes_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_supplier_quotes_request_org_fk foreign key (organization_id, purchase_request_id)
    references public.pme_purchase_requests(organization_id, id) on delete restrict,
  constraint pme_supplier_quotes_supplier_org_fk foreign key (organization_id, supplier_id)
    references public.pme_suppliers(organization_id, id) on delete restrict
);

create table if not exists public.pme_supplier_quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  supplier_quote_id uuid not null references public.pme_supplier_quotes(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  purchase_request_item_id uuid references public.pme_purchase_request_items(id) on delete set null,
  description text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  unit_price numeric(14, 2) not null default 0,
  total_price numeric(14, 2) not null default 0,
  delivery_days integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_supplier_quote_items_description_check check (length(trim(description)) > 0),
  constraint pme_supplier_quote_items_quantity_check check (quantity > 0),
  constraint pme_supplier_quote_items_unit_check check (length(trim(unit)) > 0),
  constraint pme_supplier_quote_items_amount_check check (unit_price >= 0 and total_price >= 0),
  constraint pme_supplier_quote_items_delivery_check check (delivery_days is null or delivery_days >= 0),
  constraint pme_supplier_quote_items_org_id_unique unique (organization_id, id),
  constraint pme_supplier_quote_items_quote_org_fk foreign key (organization_id, supplier_quote_id)
    references public.pme_supplier_quotes(organization_id, id) on delete cascade,
  constraint pme_supplier_quote_items_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_supplier_quote_items_request_item_org_fk foreign key (organization_id, purchase_request_item_id)
    references public.pme_purchase_request_items(organization_id, id) on delete restrict
);

create table if not exists public.pme_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  purchase_request_id uuid references public.pme_purchase_requests(id) on delete set null,
  supplier_quote_id uuid references public.pme_supplier_quotes(id) on delete set null,
  supplier_id uuid references public.pme_suppliers(id) on delete set null,
  supplier_name_snapshot text not null,
  order_number text not null,
  title text not null,
  status text not null default 'draft',
  subtotal_amount numeric(14, 2) not null default 0,
  delivery_cost numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  ordered_at timestamptz,
  expected_delivery_date date,
  payment_status text not null default 'pending',
  paid_at timestamptz,
  actual_cost_id uuid references public.pme_project_actual_costs(id) on delete set null,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_orders_supplier_snapshot_check check (length(trim(supplier_name_snapshot)) > 0),
  constraint pme_purchase_orders_number_check check (length(trim(order_number)) > 0),
  constraint pme_purchase_orders_title_check check (length(trim(title)) > 0),
  constraint pme_purchase_orders_status_check check (status in ('draft', 'ordered', 'partially_delivered', 'delivered', 'cancelled')),
  constraint pme_purchase_orders_payment_status_check check (payment_status in ('pending', 'partially_paid', 'paid', 'cancelled')),
  constraint pme_purchase_orders_amount_check check (
    subtotal_amount >= 0 and delivery_cost >= 0 and discount_amount >= 0 and total_amount >= 0
  ),
  constraint pme_purchase_orders_paid_check check (payment_status <> 'paid' or paid_at is not null),
  constraint pme_purchase_orders_org_number_unique unique (organization_id, order_number),
  constraint pme_purchase_orders_org_id_unique unique (organization_id, id),
  constraint pme_purchase_orders_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_purchase_orders_request_org_fk foreign key (organization_id, purchase_request_id)
    references public.pme_purchase_requests(organization_id, id) on delete restrict,
  constraint pme_purchase_orders_quote_org_fk foreign key (organization_id, supplier_quote_id)
    references public.pme_supplier_quotes(organization_id, id) on delete restrict,
  constraint pme_purchase_orders_supplier_org_fk foreign key (organization_id, supplier_id)
    references public.pme_suppliers(organization_id, id) on delete restrict,
  constraint pme_purchase_orders_actual_cost_org_fk foreign key (organization_id, actual_cost_id)
    references public.pme_project_actual_costs(organization_id, id) on delete restrict
);

create table if not exists public.pme_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_order_id uuid not null references public.pme_purchase_orders(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_quote_item_id uuid references public.pme_supplier_quote_items(id) on delete set null,
  source_budget_material_id uuid references public.pme_budget_materials(id) on delete set null,
  source_forecast_id uuid references public.pme_project_cost_forecasts(id) on delete set null,
  description text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  unit_price numeric(14, 2) not null default 0,
  total_price numeric(14, 2) not null default 0,
  delivered_quantity numeric(14, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_order_items_description_check check (length(trim(description)) > 0),
  constraint pme_purchase_order_items_quantity_check check (quantity > 0),
  constraint pme_purchase_order_items_unit_check check (length(trim(unit)) > 0),
  constraint pme_purchase_order_items_amount_check check (unit_price >= 0 and total_price >= 0 and delivered_quantity >= 0),
  constraint pme_purchase_order_items_org_id_unique unique (organization_id, id),
  constraint pme_purchase_order_items_order_org_fk foreign key (organization_id, purchase_order_id)
    references public.pme_purchase_orders(organization_id, id) on delete cascade,
  constraint pme_purchase_order_items_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_purchase_order_items_quote_item_org_fk foreign key (organization_id, source_quote_item_id)
    references public.pme_supplier_quote_items(organization_id, id) on delete restrict,
  constraint pme_purchase_order_items_material_org_fk foreign key (organization_id, source_budget_material_id)
    references public.pme_budget_materials(organization_id, id) on delete restrict,
  constraint pme_purchase_order_items_forecast_org_fk foreign key (organization_id, source_forecast_id)
    references public.pme_project_cost_forecasts(organization_id, id) on delete restrict
);

create table if not exists public.pme_purchase_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  purchase_order_id uuid not null references public.pme_purchase_orders(id) on delete cascade,
  delivery_date date not null,
  delivered_by text,
  received_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_deliveries_status_check check (status in ('pending', 'partial', 'complete', 'rejected')),
  constraint pme_purchase_deliveries_org_id_unique unique (organization_id, id),
  constraint pme_purchase_deliveries_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_purchase_deliveries_order_org_fk foreign key (organization_id, purchase_order_id)
    references public.pme_purchase_orders(organization_id, id) on delete cascade
);

create table if not exists public.pme_purchase_delivery_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  purchase_delivery_id uuid not null references public.pme_purchase_deliveries(id) on delete cascade,
  purchase_order_item_id uuid not null references public.pme_purchase_order_items(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  delivered_quantity numeric(14, 4) not null default 0,
  rejected_quantity numeric(14, 4) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pme_purchase_delivery_items_quantity_check check (delivered_quantity >= 0 and rejected_quantity >= 0),
  constraint pme_purchase_delivery_items_delivery_org_fk foreign key (organization_id, purchase_delivery_id)
    references public.pme_purchase_deliveries(organization_id, id) on delete cascade,
  constraint pme_purchase_delivery_items_order_item_org_fk foreign key (organization_id, purchase_order_item_id)
    references public.pme_purchase_order_items(organization_id, id) on delete restrict,
  constraint pme_purchase_delivery_items_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create table if not exists public.pme_purchase_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_id uuid references public.pme_suppliers(id) on delete set null,
  purchase_request_id uuid references public.pme_purchase_requests(id) on delete set null,
  supplier_quote_id uuid references public.pme_supplier_quotes(id) on delete set null,
  purchase_order_id uuid references public.pme_purchase_orders(id) on delete set null,
  delivery_id uuid references public.pme_purchase_deliveries(id) on delete set null,
  file_url text not null,
  file_name text not null,
  file_type text,
  description text,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pme_purchase_attachments_file_url_check check (length(trim(file_url)) > 0),
  constraint pme_purchase_attachments_file_name_check check (length(trim(file_name)) > 0),
  constraint pme_purchase_attachments_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade,
  constraint pme_purchase_attachments_supplier_org_fk foreign key (organization_id, supplier_id)
    references public.pme_suppliers(organization_id, id) on delete restrict,
  constraint pme_purchase_attachments_request_org_fk foreign key (organization_id, purchase_request_id)
    references public.pme_purchase_requests(organization_id, id) on delete restrict,
  constraint pme_purchase_attachments_quote_org_fk foreign key (organization_id, supplier_quote_id)
    references public.pme_supplier_quotes(organization_id, id) on delete restrict,
  constraint pme_purchase_attachments_order_org_fk foreign key (organization_id, purchase_order_id)
    references public.pme_purchase_orders(organization_id, id) on delete restrict,
  constraint pme_purchase_attachments_delivery_org_fk foreign key (organization_id, delivery_id)
    references public.pme_purchase_deliveries(organization_id, id) on delete restrict
);

create table if not exists public.pme_purchase_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  old_status text,
  new_status text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  notes text,
  constraint pme_purchase_status_history_entity_type_check check (
    entity_type in ('purchase_request', 'supplier_quote', 'purchase_order', 'delivery')
  ),
  constraint pme_purchase_status_history_new_status_check check (length(trim(new_status)) > 0),
  constraint pme_purchase_status_history_project_org_fk foreign key (organization_id, project_id)
    references public.projects(organization_id, id) on delete cascade
);

create index if not exists pme_suppliers_org_active_idx on public.pme_suppliers(organization_id, is_active, name);
create index if not exists pme_purchase_requests_project_status_idx on public.pme_purchase_requests(organization_id, project_id, status);
create index if not exists pme_supplier_quotes_project_status_idx on public.pme_supplier_quotes(organization_id, project_id, status);
create index if not exists pme_supplier_quotes_request_idx on public.pme_supplier_quotes(organization_id, purchase_request_id, status);
create index if not exists pme_purchase_orders_project_status_idx on public.pme_purchase_orders(organization_id, project_id, status);
create index if not exists pme_purchase_orders_supplier_idx on public.pme_purchase_orders(organization_id, supplier_id, created_at desc);
create index if not exists pme_purchase_deliveries_order_idx on public.pme_purchase_deliveries(organization_id, purchase_order_id, delivery_date desc);
create index if not exists pme_purchase_attachments_project_idx on public.pme_purchase_attachments(organization_id, project_id, created_at desc);
create index if not exists pme_purchase_status_history_entity_idx on public.pme_purchase_status_history(organization_id, entity_type, entity_id, changed_at desc);

create trigger pme_suppliers_touch_updated_at before update on public.pme_suppliers for each row execute function public.touch_updated_at();
create trigger pme_supplier_contacts_touch_updated_at before update on public.pme_supplier_contacts for each row execute function public.touch_updated_at();
create trigger pme_purchase_requests_touch_updated_at before update on public.pme_purchase_requests for each row execute function public.touch_updated_at();
create trigger pme_purchase_request_items_touch_updated_at before update on public.pme_purchase_request_items for each row execute function public.touch_updated_at();
create trigger pme_supplier_quotes_touch_updated_at before update on public.pme_supplier_quotes for each row execute function public.touch_updated_at();
create trigger pme_supplier_quote_items_touch_updated_at before update on public.pme_supplier_quote_items for each row execute function public.touch_updated_at();
create trigger pme_purchase_orders_touch_updated_at before update on public.pme_purchase_orders for each row execute function public.touch_updated_at();
create trigger pme_purchase_order_items_touch_updated_at before update on public.pme_purchase_order_items for each row execute function public.touch_updated_at();
create trigger pme_purchase_deliveries_touch_updated_at before update on public.pme_purchase_deliveries for each row execute function public.touch_updated_at();
create trigger pme_purchase_delivery_items_touch_updated_at before update on public.pme_purchase_delivery_items for each row execute function public.touch_updated_at();

alter table public.pme_suppliers enable row level security;
alter table public.pme_supplier_contacts enable row level security;
alter table public.pme_purchase_requests enable row level security;
alter table public.pme_purchase_request_items enable row level security;
alter table public.pme_supplier_quotes enable row level security;
alter table public.pme_supplier_quote_items enable row level security;
alter table public.pme_purchase_orders enable row level security;
alter table public.pme_purchase_order_items enable row level security;
alter table public.pme_purchase_deliveries enable row level security;
alter table public.pme_purchase_delivery_items enable row level security;
alter table public.pme_purchase_attachments enable row level security;
alter table public.pme_purchase_status_history enable row level security;

create policy "Members can read PME suppliers" on public.pme_suppliers for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME suppliers" on public.pme_suppliers for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME supplier contacts" on public.pme_supplier_contacts for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME supplier contacts" on public.pme_supplier_contacts for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase requests" on public.pme_purchase_requests for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase requests" on public.pme_purchase_requests for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (requested_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase request items" on public.pme_purchase_request_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase request items" on public.pme_purchase_request_items for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME supplier quotes" on public.pme_supplier_quotes for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME supplier quotes" on public.pme_supplier_quotes for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME supplier quote items" on public.pme_supplier_quote_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME supplier quote items" on public.pme_supplier_quote_items for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase orders" on public.pme_purchase_orders for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase orders" on public.pme_purchase_orders for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (created_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase order items" on public.pme_purchase_order_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase order items" on public.pme_purchase_order_items for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase deliveries" on public.pme_purchase_deliveries for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase deliveries" on public.pme_purchase_deliveries for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (received_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase delivery items" on public.pme_purchase_delivery_items for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can manage PME purchase delivery items" on public.pme_purchase_delivery_items for all to authenticated using (public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])) with check (public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase attachments" on public.pme_purchase_attachments for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can create PME purchase attachments" on public.pme_purchase_attachments for insert to authenticated with check (uploaded_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));

create policy "Members can read PME purchase status history" on public.pme_purchase_status_history for select to authenticated using (public.is_organization_member(organization_id));
create policy "Managers can create PME purchase status history" on public.pme_purchase_status_history for insert to authenticated with check (changed_by = auth.uid() and public.has_organization_role(organization_id, array['owner', 'admin', 'manager']));
