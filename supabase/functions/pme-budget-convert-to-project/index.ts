import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildPmeBudgetConversionPlan,
  buildProjectInsertFromBudget,
  type ConvertiblePmeBudget,
  type ConvertiblePmeEnvironment,
  type ConvertiblePmeItem,
  type ConvertiblePmePaymentTerm
} from "../../../packages/domain/src/pme/convertToProject.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface ConvertRequestBody {
  budgetId: string;
  projectId?: string;
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
  insert: (payload: Record<string, unknown>) => QueryBuilderLike;
  update: (payload: Record<string, unknown>) => QueryBuilderLike;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilderLike;
}

interface PmeBudgetRow {
  id: string;
  organization_id: string;
  budget_number: string;
  title: string;
  description: string | null;
  status: ConvertiblePmeBudget["status"];
  subtotal_cost: DecimalLike;
  overhead_percentage: DecimalLike;
  tax_percentage: DecimalLike;
  profit_percentage: DecimalLike;
  discount_amount: DecimalLike;
  final_price: DecimalLike;
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
  description: string;
  unit: string;
  quantity: DecimalLike;
  unit_cost: DecimalLike;
  unit_price: DecimalLike;
  subtotal_cost: DecimalLike;
  final_price: DecimalLike;
  is_optional: boolean;
  show_on_proposal: boolean;
  sort_order: number;
}

interface PmePaymentTermRow {
  id: string;
  description: string;
  due_offset_days: number;
  amount: DecimalLike | null;
  percentage: DecimalLike | null;
  sort_order: number;
}

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
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
): Promise<{ projectId: string; budgetId: string; status: "converted_to_project" }> {
  const budget = await fetchBudget(context.supabase, body.budgetId);

  const { data: hasRole, error: roleError } = await context.supabase.rpc("has_organization_role", {
    target_organization_id: budget.organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });

  if (roleError !== null || hasRole !== true) {
    throw new Error("User is not allowed to convert this budget.");
  }

  const [environments, items, paymentTerms] = await Promise.all([
    fetchEnvironments(context.supabase, budget.id),
    fetchItems(context.supabase, budget.id),
    fetchPaymentTerms(context.supabase, budget.id)
  ]);
  const plan = buildPmeBudgetConversionPlan({
    budget,
    environments,
    items,
    paymentTerms
  });
  const project = await resolveProject(context, body.projectId, budget);

  await updateBudgetAsConverted(context, budget.id, project.id);
  await createAuditLog(context, project, plan);

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
        "description",
        "status",
        "subtotal_cost",
        "overhead_percentage",
        "tax_percentage",
        "profit_percentage",
        "discount_amount",
        "final_price",
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
    description: data.description,
    status: data.status,
    subtotalCost: toDecimalString(data.subtotal_cost),
    overheadPercentage: toDecimalString(data.overhead_percentage),
    taxPercentage: toDecimalString(data.tax_percentage),
    profitPercentage: toDecimalString(data.profit_percentage),
    discountAmount: toDecimalString(data.discount_amount),
    finalPrice: toDecimalString(data.final_price),
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
        "description",
        "unit",
        "quantity",
        "unit_cost",
        "unit_price",
        "subtotal_cost",
        "final_price",
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
    description: row.description,
    unit: row.unit,
    quantity: toDecimalString(row.quantity),
    unitCost: toDecimalString(row.unit_cost),
    unitPrice: toDecimalString(row.unit_price),
    subtotalCost: toDecimalString(row.subtotal_cost),
    finalPrice: toDecimalString(row.final_price),
    isOptional: row.is_optional,
    showOnProposal: row.show_on_proposal,
    sortOrder: row.sort_order
  }));
}

async function fetchPaymentTerms(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<ConvertiblePmePaymentTerm[]> {
  const { data, error } = await supabase
    .from("pme_budget_payment_terms")
    .select("id,description,due_offset_days,amount,percentage,sort_order")
    .eq("budget_id", budgetId)
    .order("sort_order", { ascending: true });

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read payment terms.");
  }

  return data.filter(isPmePaymentTermRow).map((row) => ({
    id: row.id,
    description: row.description,
    dueOffsetDays: row.due_offset_days,
    amount: row.amount === null ? null : toDecimalString(row.amount),
    percentage: row.percentage === null ? null : toDecimalString(row.percentage),
    sortOrder: row.sort_order
  }));
}

async function resolveProject(
  context: AuthenticatedContext,
  projectId: string | undefined,
  budget: ConvertiblePmeBudget
): Promise<ProjectRow> {
  if (typeof projectId === "string") {
    const project = await fetchProject(context.supabase, projectId);

    if (project.organization_id !== budget.organizationId) {
      throw new Error("Project does not belong to the budget organization.");
    }

    return project;
  }

  const { data, error } = await context.supabase
    .from("projects")
    .insert(buildProjectInsertFromBudget({ budget, userId: context.userId }))
    .select("id,organization_id,name")
    .single();

  if (error !== null || !isProjectRow(data)) {
    throw new Error("Could not create project for budget conversion.");
  }

  return data;
}

async function fetchProject(supabase: SupabaseClientLike, projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from("projects")
    .select("id,organization_id,name")
    .eq("id", projectId)
    .maybeSingle();

  if (error !== null || data === null || !isProjectRow(data)) {
    throw new Error("Project was not found or is not accessible.");
  }

  return data;
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

async function createAuditLog(
  context: AuthenticatedContext,
  project: ProjectRow,
  plan: ReturnType<typeof buildPmeBudgetConversionPlan>
): Promise<void> {
  const { error } = await context.supabase.from("audit_logs").insert({
    organization_id: plan.budget.organizationId,
    actor_user_id: context.userId,
    action: "pme_budget.converted_to_project",
    entity_table: "pme_budgets",
    entity_id: plan.budget.id,
    metadata: {
      projectId: project.id,
      projectName: project.name,
      budgetId: plan.budget.id,
      budgetNumber: plan.budget.budgetNumber,
      environments: plan.environments,
      copiedItems: plan.items,
      initialCostForecast: plan.initialCostForecast,
      initialReceivablesForecast: plan.initialReceivablesForecast,
      calculation: plan.calculation
    }
  });

  if (error !== null) {
    throw new Error("Could not create audit log for budget conversion.");
  }
}

function isConvertRequestBody(value: unknown): value is ConvertRequestBody {
  if (!isRecord(value) || typeof value.budgetId !== "string") {
    return false;
  }

  return typeof value.projectId === "undefined" || typeof value.projectId === "string";
}

function isPmeBudgetRow(value: unknown): value is PmeBudgetRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.budget_number === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    isPmeBudgetStatus(value.status) &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.overhead_percentage) &&
    isDecimalLike(value.tax_percentage) &&
    isDecimalLike(value.profit_percentage) &&
    isDecimalLike(value.discount_amount) &&
    isDecimalLike(value.final_price) &&
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
    typeof value.description === "string" &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    isDecimalLike(value.unit_cost) &&
    isDecimalLike(value.unit_price) &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.final_price) &&
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

function isPmePaymentTermRow(value: unknown): value is PmePaymentTermRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.description === "string" &&
    typeof value.due_offset_days === "number" &&
    (isDecimalLike(value.amount) || value.amount === null) &&
    (isDecimalLike(value.percentage) || value.percentage === null) &&
    typeof value.sort_order === "number"
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
