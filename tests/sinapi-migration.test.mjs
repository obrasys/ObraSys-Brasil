import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath = "supabase/migrations/20260626000300_create_sinapi_simplified.sql";
const alignmentMigrationPath =
  "supabase/migrations/20260626000700_align_sinapi_simplified_contract.sql";
const typesPath = "src/types/database.ts";

const sinapiTables = [
  "sinapi_states",
  "sinapi_import_batches",
  "sinapi_compositions",
  "sinapi_composition_items",
  "sinapi_inputs",
  "sinapi_prices",
  "sinapi_versions",
  "pme_saved_sinapi_items",
  "pme_budget_sinapi_snapshots"
];

test("SINAPI simplified migration creates approved tables with RLS", async () => {
  const sql = `${await readFile(migrationPath, "utf8")}\n${await readFile(
    alignmentMigrationPath,
    "utf8"
  )}`;

  for (const table of sinapiTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("SINAPI reference tables are authenticated read-only by policy", async () => {
  const sql = `${await readFile(migrationPath, "utf8")}\n${await readFile(
    alignmentMigrationPath,
    "utf8"
  )}`;

  for (const table of sinapiTables.filter((table) => !table.startsWith("pme_"))) {
    assert.match(sql, new RegExp(`on public\\.${table}\\nfor select\\nto authenticated`));
  }

  assert.doesNotMatch(sql, /on public\.sinapi_[^\n]+\nfor insert/i);
  assert.doesNotMatch(sql, /on public\.sinapi_[^\n]+\nfor update/i);
  assert.doesNotMatch(sql, /on public\.sinapi_[^\n]+\nfor delete/i);
  assert.doesNotMatch(sql, /service_role/i);
});

test("PME saved SINAPI snapshots are tenant-scoped and immutable", async () => {
  const sql = `${await readFile(migrationPath, "utf8")}\n${await readFile(
    alignmentMigrationPath,
    "utf8"
  )}`;

  assert.match(sql, /organization_id uuid not null/);
  assert.match(sql, /budget_id uuid not null/);
  assert.match(sql, /sinapi_code text not null/);
  assert.match(sql, /sinapi_description text not null/);
  assert.match(sql, /uf char\(2\) not null/);
  assert.match(sql, /reference_month integer not null/);
  assert.match(sql, /reference_year integer not null/);
  assert.match(sql, /regime text not null/);
  assert.match(sql, /original_total_cost numeric\(14, 2\) not null/);
  assert.match(sql, /adapted_unit_price numeric\(14, 2\) not null/);
  assert.match(sql, /snapshot_data jsonb not null default '\{\}'::jsonb/);
  assert.match(sql, /public\.is_organization_member\(organization_id\)/);
  assert.match(
    sql,
    /public\.has_organization_role\(organization_id, array\['owner', 'admin', 'manager'\]\)/
  );
  assert.doesNotMatch(sql, /on public\.pme_budget_sinapi_snapshots[\s\S]*for update/i);
  assert.doesNotMatch(sql, /on public\.pme_budget_sinapi_snapshots[\s\S]*for delete/i);
});

test("SINAPI migration uses numeric money and seeded reference data", async () => {
  const sql = `${await readFile(migrationPath, "utf8")}\n${await readFile(
    alignmentMigrationPath,
    "utf8"
  )}`;

  assert.doesNotMatch(sql, /\bfloat\b/i);
  assert.doesNotMatch(sql, /\breal\b/i);
  assert.match(sql, /unit_cost numeric\(14, 2\)/);
  assert.match(sql, /Revestimento cerâmico/);
  assert.match(sql, /Aplicação manual de pintura/);
});

test("SINAPI alignment migration adds states, snapshots and search indexes", async () => {
  const sql = await readFile(alignmentMigrationPath, "utf8");

  assert.match(sql, /create table if not exists public\.sinapi_states/);
  assert.match(sql, /create table if not exists public\.pme_budget_sinapi_snapshots/);
  assert.match(sql, /source_file_url text/);
  assert.match(sql, /status in \('draft', 'processing', 'published', 'failed', 'archived'\)/);
  assert.match(sql, /sinapi_compositions_reference_idx/);
  assert.match(sql, /to_tsvector\('portuguese'/);
  assert.match(sql, /pme_budget_sinapi_snapshots_item_org_fk/);
});

test("SINAPI TypeScript types cover approved tables", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of sinapiTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /export type SinapiRegime/);
  assert.match(types, /export interface SinapiStateRow/);
  assert.match(types, /export interface PmeSavedSinapiItemRow/);
  assert.match(types, /export interface PmeBudgetSinapiSnapshotRow/);
  assert.doesNotMatch(types, /\bany\b/);
});
