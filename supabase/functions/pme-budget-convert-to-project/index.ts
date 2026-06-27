import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  attachProjectIdToConversionPlan,
  buildPmeBudgetConversionPlan,
  type ConvertiblePmeBudget,
  type ConvertiblePmeEnvironment,
  type ConvertiblePmeItem,
  type ConvertiblePmeLabor,
  type ConvertiblePmeMaterial,
  type ConvertiblePmePaymentTerm,
  type ConvertiblePmeSinapiSnapshot,
  type PmeBudgetConversionPlan
} from "../../../packages/domain/src/pme/convertToProject.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface ConvertRequestBody {
  budgetId: string;
  confirmed: boolean;
  optionalProjectName?: string;
  optionalStartDate?: string;
  optionalNotes?: string;
}

interface AuthenticatedContext {
  supabase: SupabaseClientLike;
  userId: string;
}

interface SupabaseClientLike {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: Error | null }>;
  };
  from: (table: string) => QueryBuilderLike;
  rpc: (
    functionName: string,
    args: Record<string, string | string[]>
  ) => Promise<{ data: boolean | null; error: Error | null }>;
}

interface QueryBuilderLike {
  then: Promise<{ data: unknown; error: Error | null }>["then"];
  select: (columns: string) => QueryBuilderLike;
  eq: (column: string, value: string) => QueryBuilderLike;
  single: () => Promise<{ data: unknown; error: Error | null }>;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => QueryBuilderLike;
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilderLike;
}

interface PmeBudgetRow {
  id: string;
  organization_id: string;
  budget_number: string;
  title: string;
  client_name: string;
  work_address: string | null;
  description: string | null;
  status: ConvertiblePmeBudget["status"];
  subtotal_cost: DecimalLike;
  overhead_percentage: DecimalLike;
  tax_percentage: DecimalLike;
  profit_percentage: DecimalLike;
  discount_amount: DecimalLike;
  final_price: DecimalLike;
  valid_until: string | null;
  approved_at: string | null;
  converted_project_id: string | null;
}

interface PmeEnvironmentRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  subtotal_cost: DecimalLike;
  final_price: DecimalLike;
}

interface PmeItemRow {
  id: string;
  environment_id: string | null;
  item_type: ConvertiblePmeItem["itemType"];
  category: string | null;
  source_type: string | null;
  description: string;
  unit: string;
  quantity: DecimalLike;
  unit_cost: DecimalLike;
  unit_price: DecimalLike;
  subtotal_cost: DecimalLike;
  final_price: DecimalLike;
  total_cost: DecimalLike;
  total_price: DecimalLike;
  is_optional: boolean;
  show_on_proposal: boolean;
  sort_order: number;
}

interface PmeMaterialRow {
  id: string;
  budget_item_id: string | null;
  item_id: string | null;
  description: string;
  unit: string;
  quantity: DecimalLike;
  unit_cost: DecimalLike;
  total_cost: DecimalLike;
  subtotal_cost: DecimalLike;
  supplier_name: string | null;
  purchase_status: string;
}

interface PmeLaborRow {
  id: string;
  budget_item_id: string | null;
  item_id: string | null;
  labor_type: string;
  role_name: string | null;
  unit: string;
  quantity: DecimalLike;
  unit_cost: DecimalLike;
  days: DecimalLike;
  total_cost: DecimalLike;
  subtotal_cost: DecimalLike;
  contract_type: string;
}

interface PmePaymentTermRow {
  id: string;
  installment_number: number;
  description: string;
  due_offset_days: number;
  due_condition: string | null;
  due_date: string | null;
  amount: DecimalLike | null;
  percentage: DecimalLike | null;
  sort_order: number;
}

interface PmeSinapiSnapshotRow {
  id: string;
  budget_item_id: string;
  sinapi_code: string;
  sinapi_description: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  regime: string;
  original_unit: string;
  original_total_cost: DecimalLike;
  adapted_description: string;
  adapted_unit: string;
  adapted_quantity: DecimalLike;
  adapted_unit_cost: DecimalLike;
  adapted_unit_price: DecimalLike;
  snapshot_data: Record<string, unknown>;
}

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
}

interface ConversionResult {
  projectId: string;
  budgetId: string;
  status: "converted_to_project";
}

type DecimalLike = string | number;

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const body: unknown = await request.json();
  if (!isConvertRequestBody(body)) {
    return jsonResponse({ error: "Invalid conversion payload." }, 400);
  }

  try {
    const result = await convertApprovedBudgetToProject(auth.context, body);
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed.";
    return jsonResponse({ error: message }, statusFromError(message));
  }
});

interface AuthenticationResult {
  authenticated: boolean;
  context: AuthenticatedContext;
  error?: string;
}

async function authenticateRequest(request: Request): Promise<AuthenticationResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorizationHeader = request.headers.get("authorization");

  if (typeof supabaseUrl === "undefined" || typeof supabaseAnonKey === "undefined") {
    return unauthenticated("Authentication is not configured.");
  }

  if (authorizationHeader === null) {
    return unauthenticated("Missing authorization header.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader
      }
    }
  }) as SupabaseClientLike;
  const { data, error } = await supabase.auth.getUser();

  if (error !== null || data.user === null) {
    return unauthenticated("Invalid authentication token.");
  }

  return {
    authenticated: true,
    context: {
      supabase,
      userId: data.user.id
    }
  };
}

function unauthenticated(error: string): AuthenticationResult {
  return {
    authenticated: false,
    context: {
      supabase: createUnavailableSupabaseClient(),
      userId: ""
    },
    error
  };
}

async function convertApprovedBudgetToProject(
  context: AuthenticatedContext,
  body: ConvertRequestBody
): Promise<ConversionResult> {
  if (!body.confirmed) {
    throw new Error("Conversion must be explicitly confirmed.");
  }

  const budget = await fetchBudget(context.supabase, body.budgetId);
  if (budget.convertedProjectId !== null) {
    return {
      projectId: budget.convertedProjectId,
      budgetId: budget.id,
      status: "converted_to_project"
    };
  }

  const { data: hasRole, error: roleError } = await context.supabase.rpc("has_organization_role", {
    target_organization_id: budget.organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });

  if (roleError !== null || hasRole !== true) {
    throw new Error("User is not allowed to convert this budget.");
  }

  const [environments, items, materials, labor, paymentTerms, sinapiSnapshots] = await Promise.all([
    fetchEnvironments(context.supabase, budget.id),
    fetchItems(context.supabase, budget.id),
    fetchMaterials(context.supabase, budget.id),
    fetchLabor(context.supabase, budget.id),
    fetchPaymentTerms(context.supabase, budget.id),
    fetchSinapiSnapshots(context.supabase, budget.id)
  ]);
  const plan = buildPmeBudgetConversionPlan({
    budget,
    environments,
    items,
    materials,
    labor,
    paymentTerms,
    sinapiSnapshots,
    userId: context.userId,
    optionalProjectName: body.optionalProjectName,
    optionalStartDate: body.optionalStartDate,
    optionalNotes: body.optionalNotes
  });
  const project = await resolveProject(context, plan);
  const planWithProject = attachProjectIdToConversionPlan(plan, project.id);

  await persistConversionPackage(context, project, planWithProject);
  await updateBudgetAsConverted(context, budget.id, project.id);
  await createStatusHistory(context, budget, project.id);
  await createAuditLog(context, project, planWithProject);

  return {
    projectId: project.id,
    budgetId: budget.id,
    status: "converted_to_project"
  };
}

async function fetchBudget(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeBudget> {
  const { data, error } = await supabase
    .from("pme_budgets")
    .select(
      [
        "id",
        "organization_id",
        "budget_number",
        "title",
        "client_name",
        "work_address",
        "description",
        "status",
        "subtotal_cost",
        "overhead_percentage",
        "tax_percentage",
        "profit_percentage",
        "discount_amount",
        "final_price",
        "valid_until",
        "approved_at",
        "converted_project_id"
      ].join(",")
    )
    .eq("id", budgetId)
    .maybeSingle();

  if (error !== null || data === null || !isPmeBudgetRow(data)) {
    throw new Error("Budget was not found or is not accessible.");
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    budgetNumber: data.budget_number,
    title: data.title,
    clientName: data.client_name,
    workAddress: data.work_address,
    description: data.description,
    status: data.status,
    subtotalCost: toDecimalString(data.subtotal_cost),
    overheadPercentage: toDecimalString(data.overhead_percentage),
    taxPercentage: toDecimalString(data.tax_percentage),
    profitPercentage: toDecimalString(data.profit_percentage),
    discountAmount: toDecimalString(data.discount_amount),
    finalPrice: toDecimalString(data.final_price),
    validUntil: data.valid_until,
    approvedAt: data.approved_at,
    convertedProjectId: data.converted_project_id
  };
}

async function fetchEnvironments(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeEnvironment[]> {
  const { data, error } = await supabase
    .from("pme_budget_environments")
    .select("id,name,description,sort_order,subtotal_cost,final_price")
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: true });

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget environments.");
  }

  return data.filter(isPmeEnvironmentRow).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    subtotalCost: toDecimalString(row.subtotal_cost),
    finalPrice: toDecimalString(row.final_price)
  }));
}

async function fetchItems(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeItem[]> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select(
      [
        "id",
        "environment_id",
        "item_type",
        "category",
        "source_type",
        "description",
        "unit",
        "quantity",
        "unit_cost",
        "unit_price",
        "subtotal_cost",
        "final_price",
        "total_cost",
        "total_price",
        "is_optional",
        "show_on_proposal",
        "sort_order"
      ].join(",")
    )
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: true });

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget items.");
  }

  return data.filter(isPmeItemRow).map((row) => ({
    id: row.id,
    environmentId: row.environment_id,
    itemType: row.item_type,
    category: row.category,
    sourceType: row.source_type,
    description: row.description,
    unit: row.unit,
    quantity: toDecimalString(row.quantity),
    unitCost: toDecimalString(row.unit_cost),
    unitPrice: toDecimalString(row.unit_price),
    subtotalCost: toDecimalString(row.subtotal_cost),
    finalPrice: toDecimalString(row.final_price),
    totalCost: toDecimalString(row.total_cost),
    totalPrice: toDecimalString(row.total_price),
    isOptional: row.is_optional,
    showOnProposal: row.show_on_proposal,
    sortOrder: row.sort_order
  }));
}

async function fetchMaterials(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeMaterial[]> {
  const { data, error } = await supabase
    .from("pme_budget_materials")
    .select(
      [
        "id",
        "budget_item_id",
        "item_id",
        "description",
        "unit",
        "quantity",
        "unit_cost",
        "total_cost",
        "subtotal_cost",
        "supplier_name",
        "purchase_status"
      ].join(",")
    )
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget materials.");
  }

  return data.filter(isPmeMaterialRow).map((row) => ({
    id: row.id,
    budgetItemId: row.budget_item_id ?? row.item_id,
    description: row.description,
    unit: row.unit,
    quantity: toDecimalString(row.quantity),
    unitCost: toDecimalString(row.unit_cost),
    totalCost: toDecimalString(row.total_cost),
    supplierName: row.supplier_name,
    purchaseStatus: row.purchase_status
  }));
}

async function fetchLabor(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeLabor[]> {
  const { data, error } = await supabase
    .from("pme_budget_labor")
    .select(
      [
        "id",
        "budget_item_id",
        "item_id",
        "labor_type",
        "role_name",
        "unit",
        "quantity",
        "unit_cost",
        "days",
        "total_cost",
        "subtotal_cost",
        "contract_type"
      ].join(",")
    )
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget labor.");
  }

  return data.filter(isPmeLaborRow).map((row) => ({
    id: row.id,
    budgetItemId: row.budget_item_id ?? row.item_id,
    laborType: row.labor_type,
    roleName: row.role_name,
    unit: row.unit,
    quantity: toDecimalString(row.quantity),
    unitCost: toDecimalString(row.unit_cost),
    days: toDecimalString(row.days),
    totalCost: toDecimalString(row.total_cost),
    contractType: row.contract_type
  }));
}

async function fetchPaymentTerms(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmePaymentTerm[]> {
  const { data, error } = await supabase
    .from("pme_budget_payment_terms")
    .select(
      "id,installment_number,description,due_offset_days,due_condition,due_date,amount,percentage,sort_order"
    )
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: true });

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read payment terms.");
  }

  return data.filter(isPmePaymentTermRow).map((row) => ({
    id: row.id,
    installmentNumber: row.installment_number,
    description: row.description,
    dueOffsetDays: row.due_offset_days,
    dueCondition: row.due_condition,
    dueDate: row.due_date,
    amount: row.amount === null ? null : toDecimalString(row.amount),
    percentage: row.percentage === null ? null : toDecimalString(row.percentage),
    sortOrder: row.sort_order
  }));
}

async function fetchSinapiSnapshots(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmeSinapiSnapshot[]> {
  const { data, error } = await supabase
    .from("pme_budget_sinapi_snapshots")
    .select(
      [
        "id",
        "budget_item_id",
        "sinapi_code",
        "sinapi_description",
        "uf",
        "reference_month",
        "reference_year",
        "regime",
        "original_unit",
        "original_total_cost",
        "adapted_description",
        "adapted_unit",
        "adapted_quantity",
        "adapted_unit_cost",
        "adapted_unit_price",
        "snapshot_data"
      ].join(",")
    )
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read SINAPI snapshots.");
  }

  return data.filter(isPmeSinapiSnapshotRow).map((row) => ({
    id: row.id,
    budgetItemId: row.budget_item_id,
    sinapiCode: row.sinapi_code,
    sinapiDescription: row.sinapi_description,
    uf: row.uf,
    referenceMonth: row.reference_month,
    referenceYear: row.reference_year,
    regime: row.regime,
    originalUnit: row.original_unit,
    originalTotalCost: toDecimalString(row.original_total_cost),
    adaptedDescription: row.adapted_description,
    adaptedUnit: row.adapted_unit,
    adaptedQuantity: toDecimalString(row.adapted_quantity),
    adaptedUnitCost: toDecimalString(row.adapted_unit_cost),
    adaptedUnitPrice: toDecimalString(row.adapted_unit_price),
    snapshotData: row.snapshot_data
  }));
}

async function resolveProject(
  context: AuthenticatedContext,
  plan: PmeBudgetConversionPlan
): Promise<ProjectRow> {
  const existingProject = await fetchProjectByPmeBudgetSource(
    context.supabase,
    plan.budget.organizationId,
    plan.budget.id
  );
  if (existingProject !== null) {
    return existingProject;
  }

  const { data, error } = await context.supabase
    .from("projects")
    .insert(plan.project)
    .select("id,organization_id,name")
    .single();

  if (error !== null || !isProjectRow(data)) {
    throw new Error("Could not create project for budget conversion.");
  }

  return data;
}

async function fetchProjectByPmeBudgetSource(
  supabase: SupabaseClientLike,
  organizationId: string,
  budgetId: string
): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id,name")
    .eq("organization_id", organizationId)
    .eq("source_module", "pme_budget")
    .eq("source_id", budgetId)
    .maybeSingle();

  if (error !== null) {
    throw new Error("Could not verify existing project conversion.");
  }

  return isProjectRow(data) ? data : null;
}

async function persistConversionPackage(
  context: AuthenticatedContext,
  project: ProjectRow,
  plan: PmeBudgetConversionPlan
): Promise<void> {
  await insertRow(context.supabase, "pme_project_budget_snapshots", plan.budgetSnapshot);

  if (plan.initialCostForecast.length > 0) {
    await insertRows(context.supabase, "pme_project_cost_forecasts", plan.initialCostForecast);
  }

  await insertRows(
    context.supabase,
    "pme_project_receivable_forecasts",
    plan.initialReceivablesForecast
  );
  await insertRow(context.supabase, "pme_budget_conversion_logs", plan.conversionLog);

  if (project.organization_id !== plan.budget.organizationId) {
    throw new Error("Project does not belong to the budget organization.");
  }
}

async function insertRow(
  supabase: SupabaseClientLike,
  table: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from(table).insert(payload);

  if (error !== null) {
    throw new Error(`Could not insert ${table}.`);
  }
}

async function insertRows(
  supabase: SupabaseClientLike,
  table: string,
  payload: Array<Record<string, unknown>>
): Promise<void> {
  const { error } = await supabase.from(table).insert(payload);

  if (error !== null) {
    throw new Error(`Could not insert ${table}.`);
  }
}

async function updateBudgetAsConverted(
  context: AuthenticatedContext,
  budgetId: string,
  projectId: string
): Promise<void> {
  const { error } = await context.supabase
    .from("pme_budgets")
    .update({
      status: "converted_to_project",
      project_id: projectId,
      converted_project_id: projectId,
      updated_by: context.userId
    })
    .eq("id", budgetId);

  if (error !== null) {
    throw new Error("Could not mark budget as converted.");
  }
}

async function createStatusHistory(
  context: AuthenticatedContext,
  budget: ConvertiblePmeBudget,
  projectId: string
): Promise<void> {
  await insertRow(context.supabase, "pme_budget_status_history", {
    organization_id: budget.organizationId,
    budget_id: budget.id,
    from_status: budget.status,
    to_status: "converted_to_project",
    notes: `Convertido para obra ${projectId}.`,
    changed_by: context.userId
  });
}

async function createAuditLog(
  context: AuthenticatedContext,
  project: ProjectRow,
  plan: PmeBudgetConversionPlan
): Promise<void> {
  await insertRow(context.supabase, "audit_logs", {
    organization_id: plan.budget.organizationId,
    actor_user_id: context.userId,
    action: "pme_budget.converted_to_project",
    entity_table: "pme_budgets",
    entity_id: plan.budget.id,
    metadata: {
      ...plan.auditMetadata,
      projectId: project.id,
      projectName: project.name
    }
  });
}

function isConvertRequestBody(value: unknown): value is ConvertRequestBody {
  if (
    !isRecord(value) ||
    typeof value.budgetId !== "string" ||
    typeof value.confirmed !== "boolean"
  ) {
    return false;
  }

  return (
    isOptionalSafeString(value.optionalProjectName, 120) &&
    isOptionalIsoDate(value.optionalStartDate) &&
    isOptionalSafeString(value.optionalNotes, 1000)
  );
}

function isOptionalSafeString(value: unknown, maxLength: number): boolean {
  return typeof value === "undefined" || (typeof value === "string" && value.length <= maxLength);
}

function isOptionalIsoDate(value: unknown): boolean {
  return (
    typeof value === "undefined" || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
  );
}

function isPmeBudgetRow(value: unknown): value is PmeBudgetRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.budget_number === "string" &&
    typeof value.title === "string" &&
    typeof value.client_name === "string" &&
    (typeof value.work_address === "string" || value.work_address === null) &&
    (typeof value.description === "string" || value.description === null) &&
    isPmeBudgetStatus(value.status) &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.overhead_percentage) &&
    isDecimalLike(value.tax_percentage) &&
    isDecimalLike(value.profit_percentage) &&
    isDecimalLike(value.discount_amount) &&
    isDecimalLike(value.final_price) &&
    (typeof value.valid_until === "string" || value.valid_until === null) &&
    (typeof value.approved_at === "string" || value.approved_at === null) &&
    (typeof value.converted_project_id === "string" || value.converted_project_id === null)
  );
}

function isPmeBudgetStatus(value: unknown): value is ConvertiblePmeBudget["status"] {
  return (
    value === "draft" ||
    value === "sent" ||
    value === "negotiation" ||
    value === "approved" ||
    value === "rejected" ||
    value === "converted_to_project" ||
    value === "cancelled"
  );
}

function isPmeEnvironmentRow(value: unknown): value is PmeEnvironmentRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.sort_order === "number" &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.final_price)
  );
}

function isPmeItemRow(value: unknown): value is PmeItemRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.environment_id === "string" || value.environment_id === null) &&
    isPmeItemType(value.item_type) &&
    (typeof value.category === "string" || value.category === null) &&
    (typeof value.source_type === "string" || value.source_type === null) &&
    typeof value.description === "string" &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    isDecimalLike(value.unit_cost) &&
    isDecimalLike(value.unit_price) &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.final_price) &&
    isDecimalLike(value.total_cost) &&
    isDecimalLike(value.total_price) &&
    typeof value.is_optional === "boolean" &&
    typeof value.show_on_proposal === "boolean" &&
    typeof value.sort_order === "number"
  );
}

function isPmeItemType(value: unknown): value is ConvertiblePmeItem["itemType"] {
  return (
    value === "service" ||
    value === "material" ||
    value === "labor" ||
    value === "equipment" ||
    value === "other"
  );
}

function isPmeMaterialRow(value: unknown): value is PmeMaterialRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.budget_item_id === "string" || value.budget_item_id === null) &&
    (typeof value.item_id === "string" || value.item_id === null) &&
    typeof value.description === "string" &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    isDecimalLike(value.unit_cost) &&
    isDecimalLike(value.total_cost) &&
    isDecimalLike(value.subtotal_cost) &&
    (typeof value.supplier_name === "string" || value.supplier_name === null) &&
    typeof value.purchase_status === "string"
  );
}

function isPmeLaborRow(value: unknown): value is PmeLaborRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (typeof value.budget_item_id === "string" || value.budget_item_id === null) &&
    (typeof value.item_id === "string" || value.item_id === null) &&
    typeof value.labor_type === "string" &&
    (typeof value.role_name === "string" || value.role_name === null) &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    isDecimalLike(value.unit_cost) &&
    isDecimalLike(value.days) &&
    isDecimalLike(value.total_cost) &&
    isDecimalLike(value.subtotal_cost) &&
    typeof value.contract_type === "string"
  );
}

function isPmePaymentTermRow(value: unknown): value is PmePaymentTermRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.installment_number === "number" &&
    typeof value.description === "string" &&
    typeof value.due_offset_days === "number" &&
    (typeof value.due_condition === "string" || value.due_condition === null) &&
    (typeof value.due_date === "string" || value.due_date === null) &&
    (isDecimalLike(value.amount) || value.amount === null) &&
    (isDecimalLike(value.percentage) || value.percentage === null) &&
    typeof value.sort_order === "number"
  );
}

function isPmeSinapiSnapshotRow(value: unknown): value is PmeSinapiSnapshotRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.budget_item_id === "string" &&
    typeof value.sinapi_code === "string" &&
    typeof value.sinapi_description === "string" &&
    typeof value.uf === "string" &&
    typeof value.reference_month === "number" &&
    typeof value.reference_year === "number" &&
    typeof value.regime === "string" &&
    typeof value.original_unit === "string" &&
    isDecimalLike(value.original_total_cost) &&
    typeof value.adapted_description === "string" &&
    typeof value.adapted_unit === "string" &&
    isDecimalLike(value.adapted_quantity) &&
    isDecimalLike(value.adapted_unit_cost) &&
    isDecimalLike(value.adapted_unit_price) &&
    isRecord(value.snapshot_data)
  );
}

function isProjectRow(value: unknown): value is ProjectRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.name === "string"
  );
}

function isDecimalLike(value: unknown): value is DecimalLike {
  return typeof value === "string" || typeof value === "number";
}

function toDecimalString(value: DecimalLike): string {
  return String(value);
}

function statusFromError(message: string): number {
  if (message.includes("not allowed") || message.includes("not accessible")) {
    return 403;
  }

  if (message.includes("not found")) {
    return 404;
  }

  return 400;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createUnavailableSupabaseClient(): SupabaseClientLike {
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null })
    },
    from: () => {
      throw new Error("Supabase client is not available.");
    },
    rpc: () =>
      Promise.resolve({ data: null, error: new Error("Supabase client is not available.") })
  };
}
