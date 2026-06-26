import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const migrationPath = "supabase/migrations/20260626000100_create_pme_budgets_phase_1.sql";
const typesPath = "src/types/database.ts";

const pmeTables = [
  "pme_budgets",
  "pme_budget_environments",
  "pme_budget_items",
  "pme_budget_materials",
  "pme_budget_labor",
  "pme_budget_payment_terms",
  "pme_budget_versions",
  "pme_budget_status_history"
];

const pmeStatuses = [
  "draft",
  "sent",
  "negotiation",
  "approved",
  "rejected",
  "converted_to_project",
  "cancelled"
];

test("PME phase 1 migration creates all approved tables", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of pmeTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("PME phase 1 tables are tenant-scoped and membership-protected", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of pmeTables) {
    const tableDefinitionStart = sql.indexOf(`create table if not exists public.${table}`);
    assert.notEqual(tableDefinitionStart, -1);

    const nextTableStart = sql.indexOf(
      "create table if not exists public.",
      tableDefinitionStart + 1
    );
    const tableDefinition = sql.slice(
      tableDefinitionStart,
      nextTableStart === -1 ? sql.length : nextTableStart
    );

    assert.match(tableDefinition, /organization_id uuid not null/);
    if (table === "pme_budget_status_history") {
      assert.match(tableDefinition, /changed_by uuid not null/);
    } else {
      assert.match(tableDefinition, /created_by uuid not null/);
    }
  }

  assert.ok(sql.includes("public.is_organization_member(organization_id)"));
  assert.ok(
    sql.includes(
      "public.has_organization_role(organization_id, array['owner', 'admin', 'manager'])"
    )
  );
  assert.doesNotMatch(sql, /service_role/i);
});

test("PME budget root includes required fields and approved statuses", async () => {
  const sql = await readFile(migrationPath, "utf8");

  const requiredFields = [
    "project_id uuid",
    "client_name text not null",
    "client_phone text",
    "client_email text",
    "work_address text",
    "budget_number text not null",
    "budget_type text not null",
    "pricing_mode text not null",
    "overhead_percentage numeric(7, 4)",
    "tax_percentage numeric(7, 4)",
    "profit_percentage numeric(7, 4)",
    "discount_amount numeric(14, 2)",
    "final_price numeric(14, 2)",
    "approved_at timestamptz",
    "converted_project_id uuid"
  ];

  for (const field of requiredFields) {
    assert.match(sql, new RegExp(field.replace(/[()]/g, "\\$&")));
  }

  for (const status of pmeStatuses) {
    assert.match(sql, new RegExp(`'${status}'`));
  }
});

test("PME phase 1 uses numeric money and protects parent organization consistency", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.doesNotMatch(sql, /\bfloat\b/i);
  assert.doesNotMatch(sql, /\breal\b/i);
  assert.match(sql, /subtotal_cost numeric\(14, 2\)/);
  assert.match(sql, /final_price numeric\(14, 2\)/);
  assert.match(sql, /profit_percentage numeric\(7, 4\)/);
  assert.match(sql, /foreign key \(organization_id, budget_id\)/);
  assert.match(sql, /foreign key \(organization_id, item_id\)/);
  assert.match(sql, /foreign key \(organization_id, project_id\)/);
});

test("PME phase 1 includes versioning and status history", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.pme_budget_versions/);
  assert.match(sql, /create table if not exists public\.pme_budget_status_history/);
  assert.match(sql, /proposal_snapshot jsonb not null/);
  assert.match(sql, /internal_snapshot jsonb not null/);
  assert.match(sql, /from_status text/);
  assert.match(sql, /to_status text not null/);
  assert.match(sql, /changed_by uuid not null/);
});

test("PME phase 1 TypeScript types cover all approved tables", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of pmeTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /export interface Database/);
  assert.doesNotMatch(types, /\bany\b/);
});
