import { pmeBudgetTabs } from "../pmeBudgetLabels";
import type { PmeBudgetEditorTab } from "../pmeBudgetUiTypes";

interface PmeBudgetTabsProps {
  activeTab: PmeBudgetEditorTab;
  onChange: (tab: PmeBudgetEditorTab) => void;
}

export function PmeBudgetTabs({ activeTab, onChange }: PmeBudgetTabsProps) {
  return (
    <nav className="tabs" aria-label="Abas do orçamento">
      {pmeBudgetTabs.map((tab) => (
        <button
          className={tab.id === activeTab ? "tab active" : "tab"}
          type="button"
          key={tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
