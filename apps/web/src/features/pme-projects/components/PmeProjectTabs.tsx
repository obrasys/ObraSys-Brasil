export type PmeProjectTab =
  | "resumo"
  | "tarefas"
  | "compras"
  | "custos"
  | "recebimentos"
  | "diario"
  | "fotos";

const tabs: Array<{ id: PmeProjectTab; label: string }> = [
  { id: "resumo", label: "Resumo" },
  { id: "tarefas", label: "Tarefas" },
  { id: "compras", label: "Compras" },
  { id: "custos", label: "Custos" },
  { id: "recebimentos", label: "Recebimentos" },
  { id: "diario", label: "Diario" },
  { id: "fotos", label: "Fotos" }
];

export function PmeProjectTabs({
  currentTab,
  onChange
}: {
  currentTab: PmeProjectTab;
  onChange: (tab: PmeProjectTab) => void;
}) {
  return (
    <div className="project-tabs" role="tablist" aria-label="Areas da obra">
      {tabs.map((tab) => (
        <button
          aria-selected={currentTab === tab.id}
          className={currentTab === tab.id ? "active" : ""}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
