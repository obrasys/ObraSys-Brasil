import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  buildAxiaPmeAssistantResponse,
  sanitizeAxiaContext,
  sanitizeAxiaText,
  type AxiaPmeActionType,
  type AxiaPmeAssistantResponse,
  type AxiaPmeBudgetContext,
  type AxiaPmeSuggestion
} from "../../../packages/domain/src/axia/pmeBudgetAssistant.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

interface AxiaRequestBody {
  actionType: AxiaPmeActionType;
  userMessage?: string;
  budgetId?: string;
  options?: Record<string, unknown>;
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
  budget_type: string;
  status: string;
  subtotal_cost: DecimalLike;
  final_price: DecimalLike;
  profit_percentage: DecimalLike;
  tax_percentage: DecimalLike;
  discount_amount: DecimalLike;
}

interface EnvironmentRow {
  name: string;
  description: string | null;
}

interface ItemRow {
  description: string;
  item_type: string;
  category: string | null;
  unit: string;
  quantity: DecimalLike;
  unit_price: DecimalLike;
  show_on_proposal: boolean;
}

interface PaymentTermRow {
  description: string;
  percentage: DecimalLike | null;
  amount: DecimalLike | null;
  due_condition: string | null;
}

interface SinapiSnapshotRow {
  sinapi_code: string;
  sinapi_description: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  original_total_cost: DecimalLike;
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

async function runAxiaPmeAssistant(
  context: AuthenticatedContext,
  body: AxiaRequestBody
): Promise<AxiaPmeAssistantResponse & { runId: string }> {
  const organizationId = await resolveOrganizationId(context, body.budgetId);
  await assertCanUseAxia(context, organizationId);

  const prompt = await fetchActivePrompt(context.supabase);
  const budgetContext = await buildBudgetContext(context, body.budgetId);
  const textSanitization = sanitizeAxiaText(body.userMessage ?? "");
  const contextSanitization = sanitizeAxiaContext(budgetContext);
  const run = await createRun(context, {
    organizationId,
    budgetId: body.budgetId,
    promptId: prompt.id,
    actionType: body.actionType,
    inputSummary: summarizeInput(body.actionType, textSanitization.sanitizedText)
  });
  const response = buildAxiaPmeAssistantResponse({
    actionType: body.actionType,
    userMessage: textSanitization.sanitizedText,
    context: contextSanitization.sanitizedContext
  });

  await createContextSnapshot(context, {
    organizationId,
    runId: run.id,
    budgetId: body.budgetId,
    actionType: body.actionType,
    sanitizedContext: contextSanitization.sanitizedContext,
    redactionSummary: contextSanitization.redactionSummary,
    removedFields: [...textSanitization.removedFields, ...contextSanitization.removedFields]
  });
  await createRedactionLog(context, {
    organizationId,
    runId: run.id,
    redactedFields: [...textSanitization.removedFields, ...contextSanitization.removedFields]
  });
  await createSuggestions(context, {
    organizationId,
    runId: run.id,
    budgetId: body.budgetId,
    suggestions: response.suggestions
  });

  return {
    ...response,
    runId: run.id
  };
}

async function assertCanUseAxia(
  context: AuthenticatedContext,
  organizationId: string
): Promise<void> {
  const { data: hasRole, error } = await context.supabase.rpc("has_organization_role", {
    target_organization_id: organizationId,
    allowed_roles: ["owner", "admin", "manager"]
  });

  if (error !== null || hasRole !== true) {
    throw new Error("User is not allowed to use Axia for this organization.");
  }
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
  const [environments, items, paymentTerms, sinapiReferences] = await Promise.all([
    fetchEnvironments(context.supabase, budgetId),
    fetchItems(context.supabase, budgetId),
    fetchPaymentTerms(context.supabase, budgetId),
    fetchSinapiReferences(context.supabase, budgetId)
  ]);

  return {
    budgetId: budget.id,
    budgetNumber: budget.budget_number,
    title: budget.title,
    description: budget.description ?? undefined,
    budgetType: budget.budget_type,
    status: budget.status,
    environments,
    items,
    totals: {
      subtotalCost: toDecimalString(budget.subtotal_cost),
      finalPrice: toDecimalString(budget.final_price),
      profitPercentage: toDecimalString(budget.profit_percentage),
      taxPercentage: toDecimalString(budget.tax_percentage),
      discountAmount: toDecimalString(budget.discount_amount)
    },
    paymentTerms,
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
      [
        "id",
        "organization_id",
        "budget_number",
        "title",
        "description",
        "budget_type",
        "status",
        "subtotal_cost",
        "final_price",
        "profit_percentage",
        "tax_percentage",
        "discount_amount"
      ].join(",")
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
    .select("description,item_type,category,unit,quantity,unit_price,show_on_proposal")
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read budget items for Axia.");
  }

  return data.filter(isItemRow).map((item) => ({
    description: item.description,
    itemType: item.item_type,
    category: item.category ?? undefined,
    unit: item.unit,
    quantity: toDecimalString(item.quantity),
    unitPrice: toDecimalString(item.unit_price),
    showOnProposal: item.show_on_proposal
  }));
}

async function fetchPaymentTerms(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<NonNullable<AxiaPmeBudgetContext["paymentTerms"]>> {
  const { data, error } = await supabase
    .from("pme_budget_payment_terms")
    .select("description,percentage,amount,due_condition")
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read payment terms for Axia.");
  }

  return data.filter(isPaymentTermRow).map((term) => ({
    description: term.description,
    percentage: term.percentage === null ? null : toDecimalString(term.percentage),
    amount: term.amount === null ? null : toDecimalString(term.amount),
    dueCondition: term.due_condition
  }));
}

async function fetchSinapiReferences(
  supabase: SupabaseClientLike,
  budgetId: string
): Promise<NonNullable<AxiaPmeBudgetContext["sinapiReferences"]>> {
  const { data, error } = await supabase
    .from("pme_budget_sinapi_snapshots")
    .select(
      "sinapi_code,sinapi_description,uf,reference_month,reference_year,original_total_cost,adapted_unit_price"
    )
    .eq("budget_id", budgetId);

  if (error !== null || !Array.isArray(data)) {
    throw new Error("Could not read SINAPI snapshots for Axia.");
  }

  return data.filter(isSinapiSnapshotRow).map((reference) => ({
    code: reference.sinapi_code,
    description: reference.sinapi_description,
    stateCode: reference.uf,
    referenceMonth: reference.reference_month,
    referenceYear: reference.reference_year,
    originalUnitCost: toDecimalString(reference.original_total_cost),
    adaptedUnitPrice: toDecimalString(reference.adapted_unit_price)
  }));
}

async function createRun(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    budgetId: string | undefined;
    promptId: string;
    actionType: AxiaPmeActionType;
    inputSummary: string;
  }
): Promise<RunRow> {
  const { data, error } = await context.supabase
    .from("axia_runs")
    .insert({
      organization_id: input.organizationId,
      budget_id: input.budgetId ?? null,
      prompt_id: input.promptId,
      task: input.actionType,
      module: "pme_budgets",
      action_type: input.actionType,
      status: "completed",
      model: "axia-local-structured-v2",
      model_provider: "local",
      model_name: "axia-local-structured-v2",
      input_summary: input.inputSummary,
      output_summary: "Sugestões estruturadas geradas para validação humana.",
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
    actionType: AxiaPmeActionType;
    sanitizedContext: AxiaPmeBudgetContext;
    redactionSummary: Record<string, number>;
    removedFields: string[];
  }
): Promise<void> {
  const { error } = await context.supabase.from("axia_context_snapshots").insert({
    organization_id: input.organizationId,
    run_id: input.runId,
    axia_run_id: input.runId,
    budget_id: input.budgetId ?? null,
    purpose: input.actionType,
    sanitized_context: input.sanitizedContext,
    removed_fields: unique(input.removedFields),
    redaction_summary: input.redactionSummary
  });

  if (error !== null) {
    throw new Error("Could not create Axia context snapshot.");
  }
}

async function createRedactionLog(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    runId: string;
    redactedFields: string[];
  }
): Promise<void> {
  const fields = unique(input.redactedFields);
  if (fields.length === 0) {
    return;
  }

  const { error } = await context.supabase.from("axia_redaction_logs").insert({
    organization_id: input.organizationId,
    axia_run_id: input.runId,
    redacted_fields: fields,
    redaction_reason: "LGPD minimization before Axia PME assistant execution."
  });

  if (error !== null) {
    throw new Error("Could not create Axia redaction log.");
  }
}

async function createSuggestions(
  context: AuthenticatedContext,
  input: {
    organizationId: string;
    runId: string;
    budgetId: string | undefined;
    suggestions: AxiaPmeSuggestion[];
  }
): Promise<void> {
  for (const suggestion of input.suggestions) {
    const { data, error } = await context.supabase
      .from("axia_suggestions")
      .insert({
        organization_id: input.organizationId,
        axia_run_id: input.runId,
        budget_id: input.budgetId ?? null,
        suggestion_type: suggestion.type,
        title: suggestion.title,
        summary: suggestion.description,
        severity: suggestion.severity,
        status: "suggested",
        confidence_score: suggestion.confidenceScore,
        created_by: context.userId
      })
      .select("id")
      .single();

    if (error !== null || !isRunRow(data)) {
      throw new Error("Could not create Axia suggestion.");
    }

    const items = suggestion.items.map((item) => ({
      organization_id: input.organizationId,
      suggestion_id: data.id,
      budget_id: input.budgetId ?? null,
      suggested_action: item.suggestedAction,
      suggested_payload: item.payload,
      status: "suggested"
    }));

    if (items.length > 0) {
      const { error: itemsError } = await context.supabase
        .from("axia_suggestion_items")
        .insert(items);
      if (itemsError !== null) {
        throw new Error("Could not create Axia suggestion items.");
      }
    }
  }
}

function isAxiaRequestBody(value: unknown): value is AxiaRequestBody {
  if (
    !isRecord(value) ||
    hasForbiddenAuthorizationKeys(value) ||
    !isAxiaActionType(value.actionType)
  ) {
    return false;
  }

  if (typeof value.budgetId !== "undefined" && typeof value.budgetId !== "string") {
    return false;
  }

  if (typeof value.userMessage !== "undefined" && typeof value.userMessage !== "string") {
    return false;
  }

  if (typeof value.userMessage === "string" && value.userMessage.length > 4000) {
    return false;
  }

  return typeof value.options === "undefined" || isRecord(value.options);
}

function hasForbiddenAuthorizationKeys(value: Record<string, unknown>): boolean {
  return (
    "organization_id" in value ||
    "organizationId" in value ||
    "tenant_id" in value ||
    "tenantId" in value ||
    "user_id" in value ||
    "userId" in value
  );
}

function isAxiaActionType(value: unknown): value is AxiaPmeActionType {
  return (
    value === "create_budget_draft" ||
    value === "suggest_missing_items" ||
    value === "review_budget_margin" ||
    value === "compare_with_sinapi" ||
    value === "generate_proposal_text" ||
    value === "generate_execution_checklist" ||
    value === "explain_budget_to_client"
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
    typeof value.budget_type === "string" &&
    typeof value.status === "string" &&
    isDecimalLike(value.subtotal_cost) &&
    isDecimalLike(value.final_price) &&
    isDecimalLike(value.profit_percentage) &&
    isDecimalLike(value.tax_percentage) &&
    isDecimalLike(value.discount_amount)
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
    (typeof value.category === "string" || value.category === null) &&
    typeof value.unit === "string" &&
    isDecimalLike(value.quantity) &&
    isDecimalLike(value.unit_price) &&
    typeof value.show_on_proposal === "boolean"
  );
}

function isPaymentTermRow(value: unknown): value is PaymentTermRow {
  return (
    isRecord(value) &&
    typeof value.description === "string" &&
    (isDecimalLike(value.percentage) || value.percentage === null) &&
    (isDecimalLike(value.amount) || value.amount === null) &&
    (typeof value.due_condition === "string" || value.due_condition === null)
  );
}

function isSinapiSnapshotRow(value: unknown): value is SinapiSnapshotRow {
  return (
    isRecord(value) &&
    typeof value.sinapi_code === "string" &&
    typeof value.sinapi_description === "string" &&
    typeof value.uf === "string" &&
    typeof value.reference_month === "number" &&
    typeof value.reference_year === "number" &&
    isDecimalLike(value.original_total_cost) &&
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

function summarizeInput(actionType: AxiaPmeActionType, message: string): string {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return actionType;
  }

  return `${actionType}: ${trimmed.slice(0, 180)}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
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
