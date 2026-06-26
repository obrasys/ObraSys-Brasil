import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const migrationPath = "supabase/migrations/20260626000000_create_core_multi_tenant.sql";
const typesPath = "src/types/database.ts";

const coreTables = [
  "organizations",
  "profiles",
  "organization_members",
  "projects",
  "cost_centers",
  "audit_logs"
];

const tenantScopedTables = ["organization_members", "projects", "cost_centers", "audit_logs"];

const defaultCostCenterCodes = [
  "CC-1000",
  "CC-2000",
  "CC-2100",
  "CC-2200",
  "CC-2300",
  "CC-3000",
  "CC-4000",
  "CC-5000",
  "CC-6000",
  "CC-7000",
  "CC-8000"
];

test("Core migration creates approved Core tables with RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of coreTables) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}\\b`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("Core tenant-scoped tables include organization_id", async () => {
  const sql = await readFile(migrationPath, "utf8");

  for (const table of tenantScopedTables) {
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
  }
});

test("Core migration defines membership helpers and avoids service_role", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.is_organization_member/);
  assert.match(sql, /create or replace function public\.has_organization_role/);
  assert.match(sql, /create or replace function public\.organization_has_members/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /om\.user_id = auth\.uid\(\)/);
  assert.doesNotMatch(sql, /service_role/i);
});

test("Core migration creates default Brazilian cost centers", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /create or replace function public\.create_default_cost_centers/);
  assert.match(sql, /create trigger organizations_create_default_cost_centers/);

  for (const code of defaultCostCenterCodes) {
    assert.match(sql, new RegExp(code));
  }
});

test("Core policies cover read and write operations where applicable", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /for select/);
  assert.match(sql, /for insert/);
  assert.match(sql, /for update/);
  assert.match(sql, /for delete/);
  assert.match(sql, /not is_system_default/);
});

test("Core TypeScript types cover approved Core tables and helpers", async () => {
  const types = await readFile(typesPath, "utf8");

  for (const table of coreTables) {
    assert.match(types, new RegExp(`${table}: \\{`));
  }

  assert.match(types, /is_organization_member/);
  assert.match(types, /has_organization_role/);
  assert.match(types, /organization_has_members/);
  assert.doesNotMatch(types, /\bany\b/);
});
