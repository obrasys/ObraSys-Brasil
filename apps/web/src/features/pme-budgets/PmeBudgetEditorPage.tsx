import { PmeBudgetCreatePage } from "./PmeBudgetCreatePage";
import { PmeBudgetEditPage } from "./PmeBudgetEditPage";

interface PmeBudgetEditorPageProps {
  budgetId: string | null;
  onBack: () => void;
  onSaved: (id: string) => void;
}

export function PmeBudgetEditorPage({ budgetId, onBack, onSaved }: PmeBudgetEditorPageProps) {
  if (budgetId === null) {
    return <PmeBudgetCreatePage onBack={onBack} onCreated={onSaved} />;
  }

  return <PmeBudgetEditPage budgetId={budgetId} onBack={onBack} onSaved={onSaved} />;
}
