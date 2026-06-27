import type { ReactNode } from "react";

import { PmeBudgetConvertButton } from "./components/PmeBudgetConvertButton";
import { PmeBudgetHeader } from "./components/PmeBudgetHeader";
import { PmeBudgetStatusBadge } from "./components/PmeBudgetStatusBadge";
import { PmeBudgetTotalsCard } from "./components/PmeBudgetTotalsCard";
import { usePmeBudget } from "./hooks/usePmeBudget";
import { usePmeBudgetConversion } from "./hooks/usePmeBudgetConversion";

interface PmeBudgetViewPageProps {
  budgetId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
}

export function PmeBudgetViewPage({ budgetId, onBack, onEdit }: PmeBudgetViewPageProps) {
  const budgetQuery = usePmeBudget(budgetId);
  const convertBudget = usePmeBudgetConversion();

  if (budgetQuery.isLoading) {
    return <div className="state-box">Carregando orçamento...</div>;
  }

  if (budgetQuery.data === null || typeof budgetQuery.data === "undefined") {
    return (
      <div className="state-box error-state">
        Orçamento não encontrado.
        <button className="secondary-button" type="button" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  const budget = budgetQuery.data;

  return (
    <section className="module-section" aria-labelledby="budget-view-title">
      <div className="budget-editor">
        <PmeBudgetHeader
          title={budget.title}
          clientName={budget.clientName}
          status={budget.status}
          validUntil={budget.validUntil ?? ""}
          finalPrice={budget.finalPrice}
          onBack={onBack}
        />
        <div className="editor-layout">
          <PmeBudgetTotalsCard
            preview={{
              subtotalCost: budget.subtotalCost,
              subtotalPrice: budget.subtotalPrice,
              overheadAmount: budget.overheadAmount,
              taxAmount: budget.taxAmount,
              profitAmount: budget.profitAmount,
              discountAmount: budget.discountAmount,
              finalPrice: budget.finalPrice
            }}
          />
          <div className="tab-panel view-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Visualização interna</p>
                <h1 id="budget-view-title">{budget.budgetNumber}</h1>
              </div>
              <div className="topbar-actions">
                <PmeBudgetConvertButton
                  budget={budget}
                  isSubmitting={convertBudget.isPending}
                  errorMessage={
                    convertBudget.error instanceof Error ? convertBudget.error.message : undefined
                  }
                  lastResult={convertBudget.data}
                  onConvert={(values) => convertBudget.mutate(values)}
                />
                <button className="primary-button" type="button" onClick={() => onEdit(budget.id)}>
                  Editar orçamento
                </button>
              </div>
            </div>

            <div className="details-grid">
              <Detail label="Cliente" value={budget.clientName} />
              <Detail label="Telefone" value={budget.clientPhone || "Não informado"} />
              <Detail label="E-mail" value={budget.clientEmail || "Não informado"} />
              <Detail label="Obra" value={budget.workAddress || "Não informado"} />
              <Detail label="Status" value={<PmeBudgetStatusBadge status={budget.status} />} />
              <Detail label="Validade" value={budget.validUntil || "Sem validade"} />
              <Detail label="Responsável" value={budget.responsibleName} />
              <Detail label="Itens" value={`${budget.items.length}`} />
            </div>

            <div className="view-section">
              <h2>Itens</h2>
              {budget.items.length === 0 ? (
                <div className="state-box">Este orçamento ainda não tem itens.</div>
              ) : (
                budget.items.map((item) => (
                  <div className="read-row" key={item.id}>
                    <strong>{item.description}</strong>
                    <span>
                      {item.quantity} {item.unit} · R$ {item.unitPrice}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="notice-box">
              Esta é uma visão interna. Custo, lucro e margem não devem aparecer na futura proposta
              do cliente.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
