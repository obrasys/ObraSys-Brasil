import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  calculatePmeBudget,
  type PmeBudgetCalculationInput
} from "../../../packages/domain/src/pme/calculatePmeBudget.ts";

declare const Deno: {
  serve: (handler: (request: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authResult = await authenticateRequest(request);
  if (!authResult.authenticated) {
    return jsonResponse({ error: authResult.error }, 401);
  }

  const body: unknown = await request.json();
  if (!isCalculationInput(body)) {
    return jsonResponse({ error: "Invalid calculation payload." }, 400);
  }

  try {
    return jsonResponse(calculatePmeBudget(body));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calculation failed.";
    return jsonResponse({ error: message }, 400);
  }
});

interface AuthenticationResult {
  authenticated: boolean;
  error?: string;
}

async function authenticateRequest(request: Request): Promise<AuthenticationResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorizationHeader = request.headers.get("authorization");

  if (typeof supabaseUrl === "undefined" || typeof supabaseAnonKey === "undefined") {
    return { authenticated: false, error: "Authentication is not configured." };
  }

  if (authorizationHeader === null) {
    return { authenticated: false, error: "Missing authorization header." };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorizationHeader
      }
    }
  });
  const { data, error } = await supabase.auth.getUser();

  if (error !== null || data.user === null) {
    return { authenticated: false, error: "Invalid authentication token." };
  }

  return { authenticated: true };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

function isCalculationInput(value: unknown): value is PmeBudgetCalculationInput {
  if (!isRecord(value)) {
    return false;
  }

  return (
    Array.isArray(value.items) &&
    value.items.every(isCalculationItemInput) &&
    typeof value.overheadPercentage === "string" &&
    typeof value.taxPercentage === "string" &&
    typeof value.profitPercentage === "string" &&
    typeof value.discountAmount === "string"
  );
}

function isCalculationItemInput(
  value: unknown
): value is PmeBudgetCalculationInput["items"][number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.id === "undefined" || typeof value.id === "string") &&
    typeof value.description === "string" &&
    isCalculationKind(value.kind) &&
    typeof value.quantity === "string" &&
    typeof value.unitCost === "string" &&
    typeof value.unitPrice === "string"
  );
}

function isCalculationKind(
  value: unknown
): value is PmeBudgetCalculationInput["items"][number]["kind"] {
  return (
    value === "service" || value === "material" || value === "labor" || value === "third_party"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
