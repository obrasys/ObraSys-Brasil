import type { PmeAxiaSuggestion, PmeAxiaSuggestionItem } from "../pmeAxiaSchemas";
import { PmeAxiaSuggestionCard } from "./PmeAxiaSuggestionCard";

interface PmeAxiaSuggestionListProps {
  suggestions: PmeAxiaSuggestion[];
  onApplyItem: (item: PmeAxiaSuggestionItem) => void;
}

export function PmeAxiaSuggestionList({ suggestions, onApplyItem }: PmeAxiaSuggestionListProps) {
  if (suggestions.length === 0) {
    return <div className="state-box">A Axia ainda não gerou sugestões para este orçamento.</div>;
  }

  return (
    <div className="axia-results">
      {suggestions.map((suggestion, index) => (
        <PmeAxiaSuggestionCard
          key={`${suggestion.type}-${suggestion.title}-${index}`}
          suggestion={suggestion}
          onApplyItem={onApplyItem}
        />
      ))}
    </div>
  );
}
