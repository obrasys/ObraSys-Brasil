export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PmeBudgetStatus =
  | "draft"
  | "sent"
  | "negotiation"
  | "approved"
  | "rejected"
  | "converted_to_project"
  | "cancelled";
export type PmeBudgetType = "service" | "renovation" | "construction" | "maintenance";
export type PmePricingMode = "margin" | "markup" | "fixed_price";
export type PmeBudgetItemType = "service" | "material" | "labor" | "equipment" | "other";
export type PmeBudgetItemCategory =
  | "material"
  | "mao_de_obra"
  | "servico"
  | "terceiro"
  | "equipamento"
  | "transporte"
  | "descarte"
  | "taxa"
  | "outro";
export type PmeBudgetItemSourceType =
  | "manual"
  | "meu_catalogo"
  | "sinapi"
  | "kit"
  | "axia_suggestion"
  | "supplier_quote";
export type PmeBudgetPurchaseStatus =
  | "not_purchased"
  | "quoted"
  | "purchased"
  | "delivered"
  | "used";
export type PmeCatalogItemType =
  | "material"
  | "labor"
  | "service"
  | "third_party"
  | "equipment"
  | "transport"
  | "disposal"
  | "fee"
  | "other";
export type PmeCatalogOrigin = "manual" | "sinapi" | "supplier_quote" | "axia_suggestion";
export type PmeCatalogCategory =
  | "material"
  | "mao_de_obra"
  | "servico"
  | "terceiro"
  | "equipamento"
  | "transporte"
  | "descarte"
  | "taxa"
  | "composicao"
  | "outro";
export type PmeCatalogSourceType =
  | "manual"
  | "sinapi"
  | "supplier_quote"
  | "axia_suggestion"
  | "imported"
  | "budget_item";
export type PmeCatalogKitType =
  | "reforma_banheiro"
  | "reforma_cozinha"
  | "pintura"
  | "troca_piso"
  | "reforma_apartamento"
  | "eletrica"
  | "hidraulica"
  | "gesso_drywall"
  | "telhado"
  | "area_externa"
  | "manutencao"
  | "personalizado";
export type PmeCatalogStatusEntityType = "item" | "composition" | "kit";
export type PmeCatalogEntityStatus = "active" | "inactive";
export type SinapiRegime = "desonerado" | "nao_desonerado";
export type SinapiImportStatus = "draft" | "processing" | "published" | "failed" | "archived";
export type SinapiVersionStatus = "draft" | "processing" | "published" | "failed" | "archived";
export type SinapiInputType =
  | "material"
  | "labor"
  | "equipment"
  | "transport"
  | "service"
  | "other";
export type SinapiCompositionItemType =
  | "material"
  | "mao_de_obra"
  | "equipamento"
  | "servico"
  | "outro";
export type SinapiPriceType = "composicao" | "insumo";
export type AxiaPmeTask =
  | "suggest_missing_items"
  | "draft_from_text"
  | "draft_from_renovation_description"
  | "suggest_environments_services"
  | "low_margin_alert"
  | "compare_sinapi_reference"
  | "commercial_proposal_text"
  | "execution_checklist";
export type AxiaRunStatus = "completed" | "failed";
export type AxiaInsightStatus = "draft" | "suggested";
export type AxiaInsightType =
  | "missing_item"
  | "draft_budget"
  | "environment_service"
  | "margin_alert"
  | "sinapi_comparison"
  | "commercial_text"
  | "execution_checklist";
export type OrganizationStatus = "active" | "suspended" | "archived";
export type OrganizationMemberRole = "owner" | "admin" | "manager" | "member" | "viewer";
export type OrganizationMemberStatus = "active" | "invited" | "disabled";
export type ProjectStatus = "planning" | "active" | "paused" | "completed" | "cancelled";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: OrganizationRow;
        Insert: OrganizationInsert;
        Update: OrganizationUpdate;
      };
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      organization_members: {
        Row: OrganizationMemberRow;
        Insert: OrganizationMemberInsert;
        Update: OrganizationMemberUpdate;
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      cost_centers: {
        Row: CostCenterRow;
        Insert: CostCenterInsert;
        Update: CostCenterUpdate;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      pme_budgets: {
        Row: PmeBudgetRow;
        Insert: PmeBudgetInsert;
        Update: PmeBudgetUpdate;
      };
      pme_budget_environments: {
        Row: PmeBudgetEnvironmentRow;
        Insert: PmeBudgetEnvironmentInsert;
        Update: PmeBudgetEnvironmentUpdate;
      };
      pme_budget_items: {
        Row: PmeBudgetItemRow;
        Insert: PmeBudgetItemInsert;
        Update: PmeBudgetItemUpdate;
      };
      pme_budget_materials: {
        Row: PmeBudgetMaterialRow;
        Insert: PmeBudgetMaterialInsert;
        Update: PmeBudgetMaterialUpdate;
      };
      pme_budget_labor: {
        Row: PmeBudgetLaborRow;
        Insert: PmeBudgetLaborInsert;
        Update: PmeBudgetLaborUpdate;
      };
      pme_budget_payment_terms: {
        Row: PmeBudgetPaymentTermRow;
        Insert: PmeBudgetPaymentTermInsert;
        Update: PmeBudgetPaymentTermUpdate;
      };
      pme_budget_versions: {
        Row: PmeBudgetVersionRow;
        Insert: PmeBudgetVersionInsert;
        Update: PmeBudgetVersionUpdate;
      };
      pme_budget_status_history: {
        Row: PmeBudgetStatusHistoryRow;
        Insert: PmeBudgetStatusHistoryInsert;
        Update: PmeBudgetStatusHistoryUpdate;
      };
      pme_catalog_items: {
        Row: PmeCatalogItemRow;
        Insert: PmeCatalogItemInsert;
        Update: PmeCatalogItemUpdate;
      };
      pme_catalog_compositions: {
        Row: PmeCatalogCompositionRow;
        Insert: PmeCatalogCompositionInsert;
        Update: PmeCatalogCompositionUpdate;
      };
      pme_catalog_composition_items: {
        Row: PmeCatalogCompositionItemRow;
        Insert: PmeCatalogCompositionItemInsert;
        Update: PmeCatalogCompositionItemUpdate;
      };
      pme_catalog_kits: {
        Row: PmeCatalogKitRow;
        Insert: PmeCatalogKitInsert;
        Update: PmeCatalogKitUpdate;
      };
      pme_catalog_kit_items: {
        Row: PmeCatalogKitItemRow;
        Insert: PmeCatalogKitItemInsert;
        Update: PmeCatalogKitItemUpdate;
      };
      pme_catalog_status_history: {
        Row: PmeCatalogStatusHistoryRow;
        Insert: PmeCatalogStatusHistoryInsert;
        Update: PmeCatalogStatusHistoryUpdate;
      };
      sinapi_states: {
        Row: SinapiStateRow;
        Insert: SinapiStateInsert;
        Update: SinapiStateUpdate;
      };
      sinapi_versions: {
        Row: SinapiVersionRow;
        Insert: SinapiVersionInsert;
        Update: SinapiVersionUpdate;
      };
      sinapi_import_batches: {
        Row: SinapiImportBatchRow;
        Insert: SinapiImportBatchInsert;
        Update: SinapiImportBatchUpdate;
      };
      sinapi_inputs: {
        Row: SinapiInputRow;
        Insert: SinapiInputInsert;
        Update: SinapiInputUpdate;
      };
      sinapi_compositions: {
        Row: SinapiCompositionRow;
        Insert: SinapiCompositionInsert;
        Update: SinapiCompositionUpdate;
      };
      sinapi_composition_items: {
        Row: SinapiCompositionItemRow;
        Insert: SinapiCompositionItemInsert;
        Update: SinapiCompositionItemUpdate;
      };
      sinapi_prices: {
        Row: SinapiPriceRow;
        Insert: SinapiPriceInsert;
        Update: SinapiPriceUpdate;
      };
      pme_saved_sinapi_items: {
        Row: PmeSavedSinapiItemRow;
        Insert: PmeSavedSinapiItemInsert;
        Update: PmeSavedSinapiItemUpdate;
      };
      pme_budget_sinapi_snapshots: {
        Row: PmeBudgetSinapiSnapshotRow;
        Insert: PmeBudgetSinapiSnapshotInsert;
        Update: PmeBudgetSinapiSnapshotUpdate;
      };
      axia_prompts: {
        Row: AxiaPromptRow;
        Insert: AxiaPromptInsert;
        Update: AxiaPromptUpdate;
      };
      axia_runs: {
        Row: AxiaRunRow;
        Insert: AxiaRunInsert;
        Update: AxiaRunUpdate;
      };
      axia_context_snapshots: {
        Row: AxiaContextSnapshotRow;
        Insert: AxiaContextSnapshotInsert;
        Update: AxiaContextSnapshotUpdate;
      };
      axia_insights: {
        Row: AxiaInsightRow;
        Insert: AxiaInsightInsert;
        Update: AxiaInsightUpdate;
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_organization_member: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
      has_organization_role: {
        Args: {
          target_organization_id: string;
          allowed_roles: string[];
        };
        Returns: boolean;
      };
      organization_has_members: {
        Args: {
          target_organization_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

export interface AuditedTenantRow {
  id: string;
  organization_id: string;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationRow {
  id: string;
  name: string;
  legal_name: string | null;
  document_number: string | null;
  status: OrganizationStatus;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationInsert = Omit<
  OrganizationRow,
  "id" | "status" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<Pick<OrganizationRow, "id" | "status" | "created_at" | "updated_at" | "updated_by">>;

export type OrganizationUpdate = Partial<Omit<OrganizationInsert, "created_by">>;

export interface ProfileRow {
  id: string;
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type ProfileInsert = Omit<ProfileRow, "created_at" | "updated_at"> &
  Partial<Pick<ProfileRow, "created_at" | "updated_at">>;

export type ProfileUpdate = Partial<Omit<ProfileInsert, "id">>;

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type OrganizationMemberInsert = Omit<
  OrganizationMemberRow,
  "id" | "role" | "status" | "created_at" | "updated_at"
> &
  Partial<Pick<OrganizationMemberRow, "id" | "role" | "status" | "created_at" | "updated_at">>;

export type OrganizationMemberUpdate = Partial<
  Omit<OrganizationMemberInsert, "organization_id" | "user_id">
>;

export interface ProjectRow extends AuditedTenantRow {
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  starts_on: string | null;
  ends_on: string | null;
}

export type ProjectInsert = Omit<
  ProjectRow,
  "id" | "status" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<Pick<ProjectRow, "id" | "status" | "created_at" | "updated_at" | "updated_by">>;

export type ProjectUpdate = Partial<Omit<ProjectInsert, "organization_id" | "created_by">>;

export interface CostCenterRow extends AuditedTenantRow {
  code: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  is_system_default: boolean;
  is_active: boolean;
}

export type CostCenterInsert = Omit<
  CostCenterRow,
  "id" | "is_system_default" | "is_active" | "created_at" | "updated_at" | "updated_by"
> &
  Partial<
    Pick<
      CostCenterRow,
      "id" | "is_system_default" | "is_active" | "created_at" | "updated_at" | "updated_by"
    >
  >;

export type CostCenterUpdate = Partial<Omit<CostCenterInsert, "organization_id" | "created_by">>;

export interface AuditLogRow {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  action: string;
  entity_table: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

export type AuditLogInsert = Omit<AuditLogRow, "id" | "metadata" | "created_at"> &
  Partial<Pick<AuditLogRow, "id" | "metadata" | "created_at">>;

export type AuditLogUpdate = never;

export interface PmeBudgetRow extends AuditedTenantRow {
  project_id: string | null;
  converted_project_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  work_address: string | null;
  budget_number: string;
  title: string;
  description: string | null;
  budget_type: PmeBudgetType;
  status: PmeBudgetStatus;
  pricing_mode: PmePricingMode;
  subtotal_cost: number;
  overhead_percentage: number;
  tax_percentage: number;
  profit_percentage: number;
  discount_amount: number;
  final_price: number;
  valid_until: string | null;
  approved_at: string | null;
}

export type PmeBudgetInsert = Omit<
  PmeBudgetRow,
  | "id"
  | "budget_type"
  | "status"
  | "pricing_mode"
  | "subtotal_cost"
  | "overhead_percentage"
  | "tax_percentage"
  | "profit_percentage"
  | "discount_amount"
  | "final_price"
  | "created_at"
  | "updated_at"
  | "updated_by"
  | "approved_at"
> &
  Partial<
    Pick<
      PmeBudgetRow,
      | "id"
      | "budget_type"
      | "status"
      | "pricing_mode"
      | "subtotal_cost"
      | "overhead_percentage"
      | "tax_percentage"
      | "profit_percentage"
      | "discount_amount"
      | "final_price"
      | "created_at"
      | "updated_at"
      | "updated_by"
      | "approved_at"
    >
  >;

export type PmeBudgetUpdate = Partial<Omit<PmeBudgetInsert, "organization_id" | "created_by">>;

export interface PmeBudgetEnvironmentRow extends AuditedTenantRow {
  budget_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  subtotal_cost: number;
  subtotal_price: number;
  final_price: number;
}

export type PmeBudgetEnvironmentInsert = Omit<
  PmeBudgetEnvironmentRow,
  | "id"
  | "sort_order"
  | "subtotal_cost"
  | "subtotal_price"
  | "final_price"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetEnvironmentRow,
      | "id"
      | "sort_order"
      | "subtotal_cost"
      | "subtotal_price"
      | "final_price"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetEnvironmentUpdate = Partial<
  Omit<PmeBudgetEnvironmentInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetItemRow extends AuditedTenantRow {
  budget_id: string;
  environment_id: string | null;
  cost_center_id: string | null;
  item_code: string | null;
  item_type: PmeBudgetItemType;
  category: PmeBudgetItemCategory;
  source_type: PmeBudgetItemSourceType;
  source_reference_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
  unit_price: number;
  final_price: number;
  waste_percentage: number;
  margin_percentage: number;
  total_cost: number;
  total_price: number;
  is_optional: boolean;
  show_on_proposal: boolean;
  sort_order: number;
  notes: string | null;
}

export type PmeBudgetItemInsert = Omit<
  PmeBudgetItemRow,
  | "id"
  | "cost_center_id"
  | "item_code"
  | "item_type"
  | "category"
  | "source_type"
  | "source_reference_id"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "unit_price"
  | "final_price"
  | "waste_percentage"
  | "margin_percentage"
  | "total_cost"
  | "total_price"
  | "is_optional"
  | "show_on_proposal"
  | "sort_order"
  | "notes"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetItemRow,
      | "id"
      | "cost_center_id"
      | "item_code"
      | "item_type"
      | "category"
      | "source_type"
      | "source_reference_id"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "unit_price"
      | "final_price"
      | "waste_percentage"
      | "margin_percentage"
      | "total_cost"
      | "total_price"
      | "is_optional"
      | "show_on_proposal"
      | "sort_order"
      | "notes"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetItemUpdate = Partial<
  Omit<PmeBudgetItemInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetMaterialRow extends AuditedTenantRow {
  budget_id: string;
  item_id: string | null;
  budget_item_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
  waste_percentage: number;
  total_cost: number;
  supplier_name: string | null;
  purchase_status: PmeBudgetPurchaseStatus;
}

export type PmeBudgetMaterialInsert = Omit<
  PmeBudgetMaterialRow,
  | "id"
  | "item_id"
  | "budget_item_id"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "waste_percentage"
  | "total_cost"
  | "purchase_status"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetMaterialRow,
      | "id"
      | "item_id"
      | "budget_item_id"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "waste_percentage"
      | "total_cost"
      | "purchase_status"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetMaterialUpdate = Partial<
  Omit<
    PmeBudgetMaterialInsert,
    "organization_id" | "budget_id" | "item_id" | "budget_item_id" | "created_by"
  >
>;

export interface PmeBudgetLaborRow extends AuditedTenantRow {
  budget_id: string;
  item_id: string | null;
  budget_item_id: string | null;
  role_name: string | null;
  labor_type: string;
  worker_name: string | null;
  unit: string;
  quantity: number;
  unit_cost: number;
  subtotal_cost: number;
  days: number;
  total_cost: number;
  contract_type: string;
}

export type PmeBudgetLaborInsert = Omit<
  PmeBudgetLaborRow,
  | "id"
  | "item_id"
  | "budget_item_id"
  | "unit"
  | "quantity"
  | "unit_cost"
  | "subtotal_cost"
  | "days"
  | "total_cost"
  | "contract_type"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetLaborRow,
      | "id"
      | "item_id"
      | "budget_item_id"
      | "unit"
      | "quantity"
      | "unit_cost"
      | "subtotal_cost"
      | "days"
      | "total_cost"
      | "contract_type"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetLaborUpdate = Partial<
  Omit<
    PmeBudgetLaborInsert,
    "organization_id" | "budget_id" | "item_id" | "budget_item_id" | "created_by"
  >
>;

export interface PmeBudgetPaymentTermRow extends AuditedTenantRow {
  budget_id: string;
  installment_number: number;
  description: string;
  due_offset_days: number;
  due_condition: string;
  due_date: string | null;
  amount: number | null;
  percentage: number | null;
  sort_order: number;
}

export type PmeBudgetPaymentTermInsert = Omit<
  PmeBudgetPaymentTermRow,
  | "id"
  | "installment_number"
  | "due_offset_days"
  | "due_condition"
  | "due_date"
  | "sort_order"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeBudgetPaymentTermRow,
      | "id"
      | "installment_number"
      | "due_offset_days"
      | "due_condition"
      | "due_date"
      | "sort_order"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeBudgetPaymentTermUpdate = Partial<
  Omit<PmeBudgetPaymentTermInsert, "organization_id" | "budget_id" | "created_by">
>;

export interface PmeBudgetVersionRow {
  id: string;
  organization_id: string;
  budget_id: string;
  version_number: number;
  status: PmeBudgetStatus;
  subtotal_cost: number;
  overhead_percentage: number;
  tax_percentage: number;
  profit_percentage: number;
  discount_amount: number;
  final_price: number;
  proposal_snapshot: Json;
  internal_snapshot: Json;
  created_by: string;
  created_at: string;
}

export type PmeBudgetVersionInsert = Omit<PmeBudgetVersionRow, "id" | "created_at"> &
  Partial<Pick<PmeBudgetVersionRow, "id" | "created_at">>;

export type PmeBudgetVersionUpdate = never;

export interface PmeBudgetStatusHistoryRow {
  id: string;
  organization_id: string;
  budget_id: string;
  from_status: PmeBudgetStatus | null;
  to_status: PmeBudgetStatus;
  notes: string | null;
  changed_by: string;
  changed_at: string;
}

export type PmeBudgetStatusHistoryInsert = Omit<PmeBudgetStatusHistoryRow, "id" | "changed_at"> &
  Partial<Pick<PmeBudgetStatusHistoryRow, "id" | "changed_at">>;

export type PmeBudgetStatusHistoryUpdate = never;

export interface PmeCatalogItemRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  item_type: PmeCatalogItemType;
  category: PmeCatalogCategory;
  origin: PmeCatalogOrigin;
  source_type: PmeCatalogSourceType;
  source_reference_id: string | null;
  sinapi_code: string | null;
  uf: string | null;
  reference_month: number | null;
  reference_year: number | null;
  unit: string;
  unit_cost: number;
  unit_price: number;
  default_unit_cost: number;
  default_unit_price: number;
  default_margin_percentage: number;
  supplier_name: string | null;
  source_reference: string | null;
  metadata: Json;
  is_active: boolean;
}

export type PmeCatalogItemInsert = Omit<
  PmeCatalogItemRow,
  | "id"
  | "category"
  | "origin"
  | "source_type"
  | "source_reference_id"
  | "sinapi_code"
  | "uf"
  | "reference_month"
  | "reference_year"
  | "unit"
  | "unit_cost"
  | "unit_price"
  | "default_unit_cost"
  | "default_unit_price"
  | "default_margin_percentage"
  | "metadata"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogItemRow,
      | "id"
      | "category"
      | "origin"
      | "source_type"
      | "source_reference_id"
      | "sinapi_code"
      | "uf"
      | "reference_month"
      | "reference_year"
      | "unit"
      | "unit_cost"
      | "unit_price"
      | "default_unit_cost"
      | "default_unit_price"
      | "default_margin_percentage"
      | "metadata"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogItemUpdate = Partial<
  Omit<PmeCatalogItemInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogCompositionRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  origin: PmeCatalogOrigin;
  unit: string;
  total_cost: number;
  total_price: number;
  total_unit_cost: number;
  total_unit_price: number;
  default_margin_percentage: number;
  metadata: Json;
  is_active: boolean;
}

export type PmeCatalogCompositionInsert = Omit<
  PmeCatalogCompositionRow,
  | "id"
  | "origin"
  | "unit"
  | "total_cost"
  | "total_price"
  | "total_unit_cost"
  | "total_unit_price"
  | "default_margin_percentage"
  | "metadata"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogCompositionRow,
      | "id"
      | "origin"
      | "unit"
      | "total_cost"
      | "total_price"
      | "total_unit_cost"
      | "total_unit_price"
      | "default_margin_percentage"
      | "metadata"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogCompositionUpdate = Partial<
  Omit<PmeCatalogCompositionInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogCompositionItemRow extends AuditedTenantRow {
  composition_id: string;
  catalog_item_id: string | null;
  description: string | null;
  category: PmeCatalogCategory;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
  sort_order: number;
}

export type PmeCatalogCompositionItemInsert = Omit<
  PmeCatalogCompositionItemRow,
  | "id"
  | "catalog_item_id"
  | "description"
  | "category"
  | "quantity"
  | "unit"
  | "unit_cost"
  | "unit_price"
  | "total_cost"
  | "total_price"
  | "sort_order"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogCompositionItemRow,
      | "id"
      | "catalog_item_id"
      | "description"
      | "category"
      | "quantity"
      | "unit"
      | "unit_cost"
      | "unit_price"
      | "total_cost"
      | "total_price"
      | "sort_order"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogCompositionItemUpdate = Partial<
  Omit<PmeCatalogCompositionItemInsert, "organization_id" | "composition_id" | "created_by">
>;

export interface PmeCatalogKitRow extends AuditedTenantRow {
  name: string;
  description: string | null;
  category: string;
  kit_type: PmeCatalogKitType;
  default_environment: string | null;
  suggested_tier: string | null;
  total_cost: number;
  total_price: number;
  total_estimated_cost: number;
  total_estimated_price: number;
  is_seed: boolean;
  is_active: boolean;
}

export type PmeCatalogKitInsert = Omit<
  PmeCatalogKitRow,
  | "id"
  | "category"
  | "kit_type"
  | "default_environment"
  | "total_cost"
  | "total_price"
  | "total_estimated_cost"
  | "total_estimated_price"
  | "is_seed"
  | "is_active"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogKitRow,
      | "id"
      | "category"
      | "kit_type"
      | "default_environment"
      | "total_cost"
      | "total_price"
      | "total_estimated_cost"
      | "total_estimated_price"
      | "is_seed"
      | "is_active"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogKitUpdate = Partial<
  Omit<PmeCatalogKitInsert, "organization_id" | "created_by">
>;

export interface PmeCatalogKitItemRow extends AuditedTenantRow {
  kit_id: string;
  catalog_item_id: string | null;
  composition_id: string | null;
  description: string | null;
  category: PmeCatalogCategory;
  quantity: number;
  unit: string;
  unit_cost: number;
  unit_price: number;
  total_cost: number;
  total_price: number;
  sort_order: number;
  is_optional: boolean;
}

export type PmeCatalogKitItemInsert = Omit<
  PmeCatalogKitItemRow,
  | "id"
  | "description"
  | "category"
  | "quantity"
  | "unit"
  | "unit_cost"
  | "unit_price"
  | "total_cost"
  | "total_price"
  | "sort_order"
  | "is_optional"
  | "created_at"
  | "updated_at"
  | "updated_by"
> &
  Partial<
    Pick<
      PmeCatalogKitItemRow,
      | "id"
      | "description"
      | "category"
      | "quantity"
      | "unit"
      | "unit_cost"
      | "unit_price"
      | "total_cost"
      | "total_price"
      | "sort_order"
      | "is_optional"
      | "created_at"
      | "updated_at"
      | "updated_by"
    >
  >;

export type PmeCatalogKitItemUpdate = Partial<
  Omit<PmeCatalogKitItemInsert, "organization_id" | "kit_id" | "created_by">
>;

export interface PmeCatalogStatusHistoryRow {
  id: string;
  organization_id: string;
  entity_type: PmeCatalogStatusEntityType;
  entity_id: string;
  from_status: PmeCatalogEntityStatus | null;
  to_status: PmeCatalogEntityStatus;
  notes: string | null;
  changed_by: string;
  changed_at: string;
}

export type PmeCatalogStatusHistoryInsert = Omit<PmeCatalogStatusHistoryRow, "id" | "changed_at"> &
  Partial<Pick<PmeCatalogStatusHistoryRow, "id" | "changed_at">>;

export type PmeCatalogStatusHistoryUpdate = never;

export interface SinapiStateRow {
  id: string;
  uf: string;
  name: string;
  region: string;
  is_active: boolean;
  created_at: string;
}

export type SinapiStateInsert = Omit<SinapiStateRow, "id" | "is_active" | "created_at"> &
  Partial<Pick<SinapiStateRow, "id" | "is_active" | "created_at">>;

export type SinapiStateUpdate = never;

export interface SinapiVersionRow {
  id: string;
  uf: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  status: SinapiVersionStatus;
  source_label: string;
  published_at: string | null;
  created_at: string;
}

export type SinapiVersionInsert = Omit<SinapiVersionRow, "id" | "status" | "created_at"> &
  Partial<Pick<SinapiVersionRow, "id" | "status" | "created_at">>;

export type SinapiVersionUpdate = never;

export interface SinapiImportBatchRow {
  id: string;
  version_id: string;
  uf: string;
  state_code: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  source_file_name: string | null;
  source_file_url: string | null;
  status: SinapiImportStatus;
  imported_by: string | null;
  imported_at: string | null;
  created_at: string;
}

export type SinapiImportBatchInsert = Omit<SinapiImportBatchRow, "id" | "status" | "created_at"> &
  Partial<Pick<SinapiImportBatchRow, "id" | "status" | "created_at">>;

export type SinapiImportBatchUpdate = never;

export interface SinapiInputRow {
  id: string;
  version_id: string | null;
  uf: string | null;
  reference_month: number | null;
  reference_year: number | null;
  regime: SinapiRegime;
  code: string;
  description: string;
  input_type: SinapiInputType;
  unit: string;
  unit_cost: number;
  is_active: boolean;
  created_at: string;
}

export type SinapiInputInsert = Omit<
  SinapiInputRow,
  "id" | "regime" | "unit_cost" | "is_active" | "created_at"
> &
  Partial<Pick<SinapiInputRow, "id" | "regime" | "unit_cost" | "is_active" | "created_at">>;

export type SinapiInputUpdate = never;

export interface SinapiCompositionRow {
  id: string;
  version_id: string | null;
  uf: string | null;
  reference_month: number | null;
  reference_year: number | null;
  regime: SinapiRegime;
  code: string;
  description: string;
  unit: string;
  total_cost: number;
  labor_cost: number | null;
  material_cost: number | null;
  equipment_cost: number | null;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export type SinapiCompositionInsert = Omit<
  SinapiCompositionRow,
  "id" | "regime" | "total_cost" | "is_active" | "created_at"
> &
  Partial<Pick<SinapiCompositionRow, "id" | "regime" | "total_cost" | "is_active" | "created_at">>;

export type SinapiCompositionUpdate = never;

export interface SinapiCompositionItemRow {
  id: string;
  composition_id: string;
  input_id: string | null;
  input_code: string | null;
  description: string;
  unit: string;
  quantity: number;
  coefficient: number;
  unit_cost: number;
  total_cost: number;
  item_role: "component" | "labor" | "material" | "equipment" | "other";
  item_type: SinapiCompositionItemType;
  created_at: string;
}

export type SinapiCompositionItemInsert = Omit<
  SinapiCompositionItemRow,
  "id" | "quantity" | "item_role" | "item_type" | "unit_cost" | "total_cost" | "created_at"
> &
  Partial<
    Pick<
      SinapiCompositionItemRow,
      "id" | "quantity" | "item_role" | "item_type" | "unit_cost" | "total_cost" | "created_at"
    >
  >;

export type SinapiCompositionItemUpdate = never;

export interface SinapiPriceRow {
  id: string;
  version_id: string;
  uf: string | null;
  state_code: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  code: string | null;
  description: string | null;
  unit: string | null;
  price_type: SinapiPriceType | null;
  composition_id: string | null;
  input_id: string | null;
  unit_cost: number;
  source_label: string;
  created_at: string;
}

export type SinapiPriceInsert = Omit<
  SinapiPriceRow,
  "id" | "regime" | "source_label" | "created_at"
> &
  Partial<Pick<SinapiPriceRow, "id" | "regime" | "source_label" | "created_at">>;

export type SinapiPriceUpdate = never;

export interface PmeSavedSinapiItemRow {
  id: string;
  organization_id: string;
  budget_id: string | null;
  budget_item_id: string | null;
  catalog_item_id: string | null;
  sinapi_composition_id: string | null;
  sinapi_composition_id_new: string | null;
  sinapi_version_id: string | null;
  sinapi_code: string;
  sinapi_description: string;
  state_code: string;
  uf: string | null;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  original_unit: string | null;
  original_unit_cost: number;
  original_total_cost: number | null;
  original_labor_cost: number | null;
  original_material_cost: number | null;
  original_equipment_cost: number | null;
  adapted_description: string | null;
  adapted_unit: string | null;
  adapted_unit_cost: number | null;
  adapted_unit_price: number;
  quantity: number;
  productivity_factor: number;
  waste_percentage: number;
  margin_percentage: number;
  saved_to_catalog_item_id: string | null;
  notes: string | null;
  snapshot: Json;
  created_by: string;
  used_at: string;
  created_at: string;
  updated_at: string;
}

export type PmeSavedSinapiItemInsert = Omit<
  PmeSavedSinapiItemRow,
  "id" | "used_at" | "created_at" | "updated_at" | "snapshot"
> &
  Partial<Pick<PmeSavedSinapiItemRow, "id" | "used_at" | "created_at" | "updated_at" | "snapshot">>;

export type PmeSavedSinapiItemUpdate = Partial<
  Pick<PmeSavedSinapiItemRow, "saved_to_catalog_item_id" | "notes" | "updated_at">
>;

export interface PmeBudgetSinapiSnapshotRow {
  id: string;
  organization_id: string;
  budget_id: string;
  budget_item_id: string;
  sinapi_composition_id: string | null;
  sinapi_code: string;
  sinapi_description: string;
  uf: string;
  reference_month: number;
  reference_year: number;
  regime: SinapiRegime;
  original_unit: string;
  original_total_cost: number;
  original_labor_cost: number | null;
  original_material_cost: number | null;
  original_equipment_cost: number | null;
  adapted_description: string;
  adapted_unit: string;
  adapted_quantity: number;
  adapted_unit_cost: number;
  adapted_unit_price: number;
  waste_percentage: number;
  productivity_adjustment_percentage: number;
  margin_percentage: number;
  snapshot_data: Json;
  created_by: string;
  created_at: string;
}

export type PmeBudgetSinapiSnapshotInsert = Omit<
  PmeBudgetSinapiSnapshotRow,
  "id" | "created_at" | "snapshot_data"
> &
  Partial<Pick<PmeBudgetSinapiSnapshotRow, "id" | "created_at" | "snapshot_data">>;

export type PmeBudgetSinapiSnapshotUpdate = never;

export interface AxiaPromptRow {
  id: string;
  prompt_key: string;
  version: number;
  title: string;
  system_prompt: string;
  response_schema: Json;
  is_active: boolean;
  created_at: string;
}

export type AxiaPromptInsert = Omit<AxiaPromptRow, "id" | "is_active" | "created_at"> &
  Partial<Pick<AxiaPromptRow, "id" | "is_active" | "created_at">>;

export type AxiaPromptUpdate = never;

export interface AxiaRunRow {
  id: string;
  organization_id: string;
  budget_id: string | null;
  prompt_id: string;
  task: AxiaPmeTask;
  status: AxiaRunStatus;
  model: string;
  created_by: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export type AxiaRunInsert = Omit<
  AxiaRunRow,
  "id" | "status" | "model" | "started_at" | "completed_at" | "error_message"
> &
  Partial<
    Pick<AxiaRunRow, "id" | "status" | "model" | "started_at" | "completed_at" | "error_message">
  >;

export type AxiaRunUpdate = never;

export interface AxiaContextSnapshotRow {
  id: string;
  organization_id: string;
  run_id: string;
  budget_id: string | null;
  purpose: string;
  sanitized_context: Json;
  removed_fields: Json;
  created_at: string;
}

export type AxiaContextSnapshotInsert = Omit<AxiaContextSnapshotRow, "id" | "created_at"> &
  Partial<Pick<AxiaContextSnapshotRow, "id" | "created_at">>;

export type AxiaContextSnapshotUpdate = never;

export interface AxiaInsightRow {
  id: string;
  organization_id: string;
  run_id: string;
  budget_id: string | null;
  insight_type: AxiaInsightType;
  status: AxiaInsightStatus;
  title: string;
  summary: string;
  evidence: Json;
  suggested_payload: Json;
  created_at: string;
}

export type AxiaInsightInsert = Omit<AxiaInsightRow, "id" | "status" | "created_at"> &
  Partial<Pick<AxiaInsightRow, "id" | "status" | "created_at">>;

export type AxiaInsightUpdate = never;
