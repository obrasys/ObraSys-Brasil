import type { PmeAxiaActionType } from "../pmeAxiaSchemas";

interface PmeAxiaActionSelectorProps {
  value: PmeAxiaActionType;
  onChange: (value: PmeAxiaActionType) => void;
}

const actions: Array<{ value: PmeAxiaActionType; label: string }> = [
  { value: "create_budget_draft", label: "Criar orçamento por descrição" },
  { value: "suggest_missing_items", label: "Sugerir itens faltantes" },
  { value: "review_budget_margin", label: "Revisar margem" },
  { value: "compare_with_sinapi", label: "Comparar com SINAPI" },
  { value: "generate_proposal_text", label: "Gerar texto da proposta" },
  { value: "generate_execution_checklist", label: "Gerar checklist de execução" },
  { value: "explain_budget_to_client", label: "Explicar para o cliente" }
];

export function PmeAxiaActionSelector({ value, onChange }: PmeAxiaActionSelectorProps) {
  return (
    <label className="field">
      <span>Ação da Axia</span>
      <select value={value} onChange={(event) => onChange(event.target.value as PmeAxiaActionType)}>
        {actions.map((action) => (
          <option key={action.value} value={action.value}>
            {action.label}
          </option>
        ))}
      </select>
    </label>
  );
}
