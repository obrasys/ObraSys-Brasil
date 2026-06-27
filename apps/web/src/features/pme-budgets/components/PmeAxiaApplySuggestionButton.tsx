import type { PmeAxiaSuggestionItem } from "../pmeAxiaSchemas";

interface PmeAxiaApplySuggestionButtonProps {
  item: PmeAxiaSuggestionItem;
  onApply: (item: PmeAxiaSuggestionItem) => void;
}

export function PmeAxiaApplySuggestionButton({ item, onApply }: PmeAxiaApplySuggestionButtonProps) {
  const label =
    item.suggestedAction === "create_budget_item" ? "Adicionar item" : "Aceitar sugestão";

  return (
    <button className="secondary-button" type="button" onClick={() => onApply(item)}>
      {label}
    </button>
  );
}
