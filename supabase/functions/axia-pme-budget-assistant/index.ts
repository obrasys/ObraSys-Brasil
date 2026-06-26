import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildAxiaPmeAssistantResponse,
  sanitizeAxiaContext,
  sanitizeAxiaText,
  type AxiaPmeAssistantResponse,
  type AxiaPmeBudgetContext,
  type AxiaPmeInsight,
  type AxiaPmeTask
} from "../../../packages/domain/src/axia/pmeBudgetAssistant.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface AxiaRequestBody {
  task: AxiaPmeTask;
  userText: string;
  budgetId?: string;
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
}

interface QueryBuilderLike {
  then: Promise<{ data: unknown; error: Error | null }>["then"];
  select: (columns: string) => QueryBuilderLike;
  eq: (column: string, value: string) => QueryBuilderLike;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilderLike;
  limit: (count: number) => QueryBuilderLike;
  maybeSingle: () => Promise<{ data: unknown; error: Error | null }>;
  single: () => Promise<{ data: unknown; error: Error | null }>;
  insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => QueryBuilderLike;
}

interface BudgetRow {
  id: string;
  organization_id: string;
  budget_number: string;
  title: string;
  description: string | null;
  status: string;
  subtotal_cost: DecimalLike;
  final_price: DecimalLike;
  profit_percentage: DecimalLike;
  tax_percentage: DecimalLike;
}

interface EnvironmentRow {
  name: string;
  description: string | null;
}

interface ItemRow {
  description: string;
  item_type: string;
  unit: string;
  quantity: DecimalLike;
  show_on_proposal: boolean;
}

interface SavedSinapiRow {
  sinapi_code: string;
  sinapi_description: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  original_unit_cost: DecimalLike;
  adapted_unit_price: DecimalLike;
}

interface OrganizationMemberRow {
  organization_id: string;
}

interface PromptRow {
  id: string;
  prompt_key: string;
  version: number;
  system_prompt: string;
}

interface RunRow {
  id: string;
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
  if (!isAxiaRequestBody(body)) {
    return jsonResponse({ error: "Invalid Axia payload." }, 400);
  }

  try {
    const response = await runAxiaPmeAssistant(auth.context, body);
    return jsonResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Axia execution failed.";
    return jsonResponse({ error: message }, 400);
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

async function runAxiaPmeAssistant(
  context: AuthenticatedContext,
  body: AxiaRequestBody
): Promise<AxiaPmeAssistantResponse & { runId: string }> {
  const prompt = await fetchActivePrompt(context.supabase);
  const budgetContext = await buildBudgetContext(context, body.budgetId);
  const organizationId = await resolveOrganizationId(context, body.budgetId);
  const textSanitization = sanitizeAxiaText(body.userText);
  const contextSanitization = sanitizeAxiaContext(budgetContext);
  const response = buildAxiaPmeAssistantResponse({
    task: body.task,
    userText: textSanitization.sanitizedText,
    context: contextSanitization.sanitizedContext
  });
  const run = await createRun(context, {
    organizationId,
    budgetId: body.budgetId,
    promptId: prompt.id,
    task: body.task
  });

  await createContextSnapshot(context, {
    organizationId,
    runId: run.id,
    budgetId: body.budgetId,
    task: body.task,
    sanitizedContext: contextSanitization.sanitizedContext,
    removedFields: [...textSanitization.removedFields, ...contextSanitization.removedFields]
  });
  await createInsights(context, {
    organizationId,
    runId: run.id,
    budgetId: body.budgetId,
    insights: response.insights
  });

  return {
    ...response,
    runId: run.id
  };
}

async function fetchActivePrompt(supabase: SupabaseClientLike): Promise<PromptRow> {
  const { data, error } = await supabase
    .from("axia_prompts")
    .select("id,prompt_key,version,system_prompt")
    .eq("prompt_key", "pme_budget_assistant")
    .eq("is_active", "true")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error !== null || data === null || !isPromptRow(data)) {
    throw new Error("Axia prompt is not configured.");
  }

  return data;
}

async function buildBudgetContext(
  context: AuthenticatedContext,
  budgetId: string | undefined
): Promise<AxiaPmeBudgetContext> {
  if (typeof budgetId === "undefined") {
    return {};
  }

  const budget = await fetchBudget(context.supabase, budgetId);
  const [environments, items, sinapiReferences] = await Promise.all([
    fetchEnvironments(context.supabase, budgetId),
    fetchItems(context.supabase, budgetId),
    fetchSinapiReferences(context.supabase, budgetId)
  ]);

  return {
    budgetId: budget.id,
    budgetNumber: budget.budget_number,
    title: budget.title,
    description: budget.description ?? undefined,
    status: budget.status,
    environments,
    items,
    totals: {
      subtotalCost: toDecimalString(budget.subtotal_cost),
      finalPrice: toDecimalString(budget.final_price),
      profitPercentage: toDecimalString(budget.profit_percentage),
      taxPercentage: toDecimalString(budget.tax_percentage)
    },
    sinapiReferences
  };
}

async function resolveOrganizationId(
  context: AuthenticatedContext,
  budgetId: string | undefined
): Promise<string> {
  if (typeof budgetId === "string") {
    const budget = await fetchBudget(context.supabase, budgetId);
    return budget.organization_id;
  }

  const { data, error } = await context.supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", context.userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error !== null || data === null || !isOrganizationMemberRow(data)) {
    throw new Error("No active organization membership was found for Axia execution.");
  }

  return data.organization_id;
}

async function fetchBudget(supabase: SupabaseClientLike, budgetId: string): Promise<BudgetRow> {
  const { data, error } = await supabase
    .from("pme_budgets")
    .select(
      "id,organization_id,budget_number,title,description,status,subtotal_cost,final_price,profit_percentage,tax_percentage"
    )
    .eq("id", budgetId)
    .maybeSingle();

  if (error !== null || data === null || !isBudgetRow(data)) {
    throw new Error("Budget was not found or is not accessible.");
  }

  return data;
}

async function fetchEnvironments(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<NonNullable<AxiaPmeBudgetContext["environments"]>> {
  const { data, error } = await supabase
    .from("pme_budget_environments")
    .select("name,description")
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget environments for Axia.");
  }

  return data.filter(isEnvironmentRow);
}

async function fetchItems(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<NonNullable<AxiaPmeBudgetContext["items"]>> {
  const { data, error } = await supabase
    .from("pme_budget_items")
    .select("description,item_type,unit,quantity,show_on_proposal")
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget items for Axia.");
  }

  return data.filter(isItemRow).map((item) => ({
    description: item.description,
    itemType: item.item_type,
    unit: item.unit,
    quantity: toDecimalString(item.quantity),
    showOnProposal: item.show_on_proposal
  }));
}

async function fetchSinapiReferences(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<NonNullable<AxiaPmeBudgetContext["sinapiReferences"]>> {
  const { data, error } = await supabase
    .from("pme_saved_sinapi_items")
    .select(
      "sinapi_code,sinapi_description,state_code,reference_month,reference_year,original_unit_cost,adapted_unit_price"
    )
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read SINAPI references for Axia.");
  }

  return data.filter(isSavedSinapiRow).map((reference) => ({
    code: reference.sinapi_code,
    description: reference.sinapi_description,
    stateCode: reference.state_code,
    referenceMonth: reference.reference_month,
    referenceYear: reference.reference_year,
    originalUnitCost: toDecimalString(reference.original_unit_cost),
    adaptedUnitPrice: toDecimalString(reference.adapted_unit_price)
  }));
}

async function createRun(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    budgetId: string | undefined;
    promptId: string;
    task: AxiaPmeTask;
  }
): Promise<RunRow> {
  const { data, error } = await context.supabase
    .from("axia_runs")
    .insert({
      organization_id: input.organizationId,
      budget_id: input.budgetId ?? null,
      prompt_id: input.promptId,
      task: input.task,
      status: "completed",
      model: "axia-local-structured-v1",
      created_by: context.userId,
      completed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error !== null || !isRunRow(data)) {
    throw new Error("Could not create Axia run log.");
  }

  return data;
}

async function createContextSnapshot(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    runId: string;
    budgetId: string | undefined;
    task: AxiaPmeTask;
    sanitizedContext: AxiaPmeBudgetContext;
    removedFields: string[];
  }
): Promise<void> {
  const { error } = await context.supabase.from("axia_context_snapshots").insert({
    organization_id: input.organizationId,
    run_id: input.runId,
    budget_id: input.budgetId ?? null,
    purpose: input.task,
    sanitized_context: input.sanitizedContext,
    removed_fields: [...new Set(input.removedFields)]
  });

  if (error !== null) {
    throw new Error("Could not create Axia context snapshot.");
  }
}

async function createInsights(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    runId: string;
    budgetId: string | undefined;
    insights: AxiaPmeInsight[];
  }
): Promise<void> {
  const payload = input.insights.map((insight) => ({
    organization_id: input.organizationId,
    run_id: input.runId,
    budget_id: input.budgetId ?? null,
    insight_type: insight.type,
    status: insight.status,
    title: insight.title,
    summary: insight.summary,
    evidence: insight.evidence,
    suggested_payload: insight.suggestedPayload
  }));
  const { error } = await context.supabase.from("axia_insights").insert(payload);

  if (error !== null) {
    throw new Error("Could not create Axia insights.");
  }
}

function isAxiaRequestBody(value: unknown): value is AxiaRequestBody {
  if (!isRecord(value) || !isAxiaTask(value.task) || typeof value.userText !== "string") {
    return false;
  }

  return typeof value.budgetId === "undefined" || typeof value.budgetId === "string";
}

function isAxiaTask(value: unknown): value is AxiaPmeTask {
  return (
    value === "suggest_missing_items" ||
    value === "draft_from_text" ||
    value === "draft_from_renovation_description" ||
    value === "suggest_environments_services" ||
    value === "low_margin_alert" ||
    value === "compare_sinapi_reference" ||
    value === "commercial_proposal_text" ||
    value === "execution_checklist"
  );
}

function isBudgetRow(value: unknown): value is BudgetRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.organization_id === "string" &&
    typeof value.budget_number === "string" &&
    typeof value.title === "string" &&
    (typeof value.description === "string" || value.description === null) &&
    typeof value.status === "string" &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.final_price) &&
    isDecimalLike(value.profit_percentage) &&
    isDecimalLike(value.tax_percentage)
  );
}

function isEnvironmentRow(value: unknown): value is EnvironmentRow {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    (typeof value.description === "string" || value.description === null)
  );
}

function isItemRow(value: unknown): value is ItemRow {
  return (
    isRecord(value) &&
    typeof value.description === "string" &&
    typeof value.item_type === "string" &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    typeof value.show_on_proposal === "boolean"
  );
}

function isSavedSinapiRow(value: unknown): value is SavedSinapiRow {
  return (
    isRecord(value) &&
    typeof value.sinapi_code === "string" &&
    typeof value.sinapi_description === "string" &&
    typeof value.state_code === "string" &&
    typeof value.reference_month === "number" &&
    typeof value.reference_year === "number" &&
    isDecimalLike(value.original_unit_cost) &&
    isDecimalLike(value.adapted_unit_price)
  );
}

function isOrganizationMemberRow(value: unknown): value is OrganizationMemberRow {
  return isRecord(value) && typeof value.organization_id === "string";
}

function isPromptRow(value: unknown): value is PromptRow {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.prompt_key === "string" &&
    typeof value.version === "number" &&
    typeof value.system_prompt === "string"
  );
}

function isRunRow(value: unknown): value is RunRow {
  return isRecord(value) && typeof value.id === "string";
}

function isDecimalLike(value: unknown): value is DecimalLike {
  return typeof value === "string" || typeof value === "number";
}

function toDecimalString(value: DecimalLike): string {
  return String(value);
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
    }
  };
}
