import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildAxiaPmeAssistantResponse,
  sanitizeAxiaContext,
  sanitizeAxiaText
} from "../packages/domain/src/axia/pmeBudgetAssistant.ts";

const migrationPath = "supabase/migrations/20260626000400_create_axia_pme_assistant.sql";
const edgeFunctionPath = "supabase/functions/axia-pme-budget-assistant/index.ts";
const editorPath = "apps/web/src/features/pme-budgets/PmeBudgetEditorPage.tsx";
const docsPath = "docs/security.md";

const axiaTables = ["axia_prompts", "axia_runs", "axia_context_snapshots", "axia_insights"];

test("Axia migration creates tables with RLS and suggested-only insights", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of axiaTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }

  assert.match(sql, /organization_id uuid not null/);
  assert.match(sql, /status in \('draft', 'suggested'\)/);
  assert.match(sql, /public\.is_organization_member\(organization_id\)/);
  assert.doesNotMatch(sql, /service_role/i);
});

test("Axia sanitizes sensitive LGPD data from text and context", () => {
  const text = "Cliente CPF 123.456.789-10, email pessoa@exemplo.com, senha=abc123, conta 1234-5";
  const sanitized = sanitizeAxiaText(text);
  const context = sanitizeAxiaContext({
    title: "Reforma para pessoa@exemplo.com",
    description: "Contato 11999998888"
  });

  assert.doesNotMatch(sanitized.sanitizedText, /123\.456\.789-10/);
  assert.doesNotMatch(sanitized.sanitizedText, /pessoa@exemplo\.com/);
  assert.doesNotMatch(sanitized.sanitizedText, /abc123/);
  assert.ok(sanitized.removedFields.includes("cpf_or_cnpj"));
  assert.ok(context.removedFields.includes("email"));
  assert.ok(context.removedFields.includes("phone"));
});

test("Axia response is structured and cannot execute official actions", () => {
  const response = buildAxiaPmeAssistantResponse({
    task: "low_margin_alert",
    userText: "Avaliar margem",
    context: {
      title: "Reforma banheiro",
      totals: { profitPercentage: "8" }
    }
  });

  assert.equal(response.status, "suggested");
  assert.equal(response.insights[0]?.status, "suggested");
  assert.match(response.guardrails.join(" "), /não aprova orçamento/i);
  assert.match(response.guardrails.join(" "), /não altera preço final/i);
  assert.match(response.guardrails.join(" "), /não converte orçamento em obra/i);
});

test("Axia Edge Function authenticates, logs run/context/insights and avoids sensitive body auth", async () => {
  const source = await readFile(edgeFunctionPath, "utf8");
  const bodyInterfaceMatch = source.match(/interface AxiaRequestBody \{[\s\S]*?\}/);

  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /sanitizeAxiaText/);
  assert.match(source, /sanitizeAxiaContext/);
  assert.match(source, /axia_runs/);
  assert.match(source, /axia_context_snapshots/);
  assert.match(source, /axia_insights/);
  assert.doesNotMatch(source, /service_role/i);
  assert.ok(bodyInterfaceMatch);
  assert.doesNotMatch(bodyInterfaceMatch[0], /organization/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /tenant/i);
  assert.doesNotMatch(bodyInterfaceMatch[0], /userId/i);
});

test("Axia panel is available in PME budget editor with consultative warnings", async () => {
  const source = await readFile(editorPath, "utf8");

  assert.match(source, /Axia consultiva/);
  assert.match(source, /não aprova/);
  assert.match(source, /não altera preço final/);
  assert.match(source, /Não inclua CPF/);
});

test("Axia security documentation is updated", async () => {
  const docs = await readFile(docsPath, "utf8");

  assert.match(docs, /axia-pme-budget-assistant/);
  assert.match(docs, /sanitização/);
  assert.match(docs, /draft ou suggested/);
});
