import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const migrationPath = "supabase/migrations/20260626000100_create_pme_budgets_phase_1.sql";
const alignmentMigrationPath =
  "supabase/migrations/20260626000500_align_pme_budgets_phase_1_contract.sql";
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

test("PME alignment migration adds approved contract fields", async () => {
  const sql = await readFile(alignmentMigrationPath, "utf8");

  const requiredSnippets = [
    "add column if not exists subtotal_price numeric(14, 2)",
    "add column if not exists cost_center_id uuid",
    "add column if not exists item_code text",
    "add column if not exists category text not null default 'servico'",
    "add column if not exists source_type text not null default 'manual'",
    "add column if not exists source_reference_id uuid",
    "add column if not exists waste_percentage numeric(7, 4)",
    "add column if not exists margin_percentage numeric(7, 4)",
    "add column if not exists total_cost numeric(14, 2)",
    "add column if not exists total_price numeric(14, 2)",
    "add column if not exists budget_item_id uuid",
    "alter column item_id drop not null",
    "add column if not exists purchase_status text not null default 'not_purchased'",
    "add column if not exists labor_type text not null default 'mao_de_obra'",
    "add column if not exists worker_name text",
    "add column if not exists days numeric(10, 2)",
    "add column if not exists contract_type text not null default 'empreitada'",
    "alter column role_name drop not null",
    "add column if not exists installment_number integer not null default 1",
    "add column if not exists due_condition text not null default 'days_after_approval'",
    "add column if not exists due_date date"
  ];

  for (const snippet of requiredSnippets) {
    assert.match(sql, new RegExp(snippet.replace(/[()]/g, "\\$&")));
  }
});

test("PME alignment migration includes category, source and purchase constraints", async () => {
  const sql = await readFile(alignmentMigrationPath, "utf8");
  const categories = [
    "material",
    "mao_de_obra",
    "servico",
    "terceiro",
    "equipamento",
    "transporte",
    "descarte",
    "taxa",
    "outro"
  ];
  const sourceTypes = [
    "manual",
    "meu_catalogo",
    "sinapi",
    "kit",
    "axia_suggestion",
    "supplier_quote"
  ];
  const purchaseStatuses = ["not_purchased", "quoted", "purchased", "delivered", "used"];

  for (const value of [...categories, ...sourceTypes, ...purchaseStatuses]) {
    assert.match(sql, new RegExp(`'${value}'`));
  }

  assert.match(sql, /foreign key \(organization_id, cost_center_id\)/);
  assert.match(sql, /foreign key \(organization_id, budget_item_id\)/);
  assert.doesNotMatch(sql, /\bfloat\b/i);
  assert.doesNotMatch(sql, /\breal\b/i);
});

test("PME alignment migration restricts internal table reads to management roles", async () => {
  const sql = await readFile(alignmentMigrationPath, "utf8");

  assert.match(sql, /drop policy if exists "Members can read PME budgets"/);
  assert.match(sql, /create policy "Managers can read PME budgets"/);
  assert.match(sql, /create policy "Managers can read PME items"/);
  assert.match(sql, /create policy "Managers can read PME materials"/);
  assert.match(
    sql,
    /public\.has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
  assert.doesNotMatch(sql, /service_role/i);
});

test("PME alignment migration keeps cross-tenant writes blocked by composite FKs", async () => {
  const sql = await readFile(alignmentMigrationPath, "utf8");

  assert.match(sql, /pme_budget_items_cost_center_org_fk/);
  assert.match(sql, /pme_budget_materials_budget_item_org_fk/);
  assert.match(sql, /pme_budget_labor_budget_item_org_fk/);
});

test("PME phase 1 TypeScript types cover all approved tables", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of pmeTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /export interface Database/);
  assert.match(types, /export type PmeBudgetItemCategory/);
  assert.match(types, /source_type: PmeBudgetItemSourceType/);
  assert.match(types, /purchase_status: PmeBudgetPurchaseStatus/);
  assert.match(types, /installment_number: number/);
  assert.doesNotMatch(types, /\bany\b/);
});
