import type { PmeBudgetStatus } from "./pmeBudgetSchemas";
import type { PmeBudgetEditorTab } from "./pmeBudgetUiTypes";

export const statusLabels: Record<PmeBudgetStatus, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  negotiation: "Negociação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  converted_to_project: "Virou obra",
  cancelled: "Cancelado"
};

export const pmeBudgetTabs: Array<{ id: PmeBudgetEditorTab; label: string }> = [
  { id: "summary", label: "Resumo" },
  { id: "environments", label: "Ambientes" },
  { id: "items", label: "Itens" },
  { id: "materials", label: "Materiais" },
  { id: "labor", label: "Mão de obra" },
  { id: "pricing", label: "Margem e impostos" },
  { id: "payment", label: "Pagamento" },
  { id: "axia", label: "Axia" }
];
