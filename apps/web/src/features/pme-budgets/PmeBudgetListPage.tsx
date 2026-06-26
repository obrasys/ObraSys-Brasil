import type { PmeBudgetSummary } from "./pmeBudgetRepository";
import { usePmeBudgets } from "./usePmeBudgets";

interface PmeBudgetListPageProps {
  onCreate: () => void;
  onEdit: (id: string) => void;
}

const statusLabels: Record<PmeBudgetSummary["status"], string> = {
  draft: "Rascunho",
  sent: "Enviado",
  negotiation: "Negociação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  converted_to_project: "Virou obra",
  cancelled: "Cancelado"
};

export function PmeBudgetListPage({ onCreate, onEdit }: PmeBudgetListPageProps) {
  const budgetsQuery = usePmeBudgets();

  return (
    <section className="module-section" aria-labelledby="budget-list-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Orçamentos PME</p>
          <h1 id="budget-list-title">Orçamentos rápidos para reformas e obras pequenas</h1>
          <p className="muted">
            Comece com dados do cliente, alguns serviços e condições de pagamento. SINAPI e Meu
            Catálogo são opcionais.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          Novo orçamento
        </button>
      </div>

      {budgetsQuery.isLoading ? <div className="state-box">Carregando orçamentos...</div> : null}

      {budgetsQuery.isError ? (
        <div className="state-box error-state">Não foi possível carregar os orçamentos.</div>
      ) : null}

      {budgetsQuery.data?.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhum orçamento ainda</h2>
          <p>Crie um orçamento simples agora e refine materiais, mão de obra e margem depois.</p>
          <button className="secondary-button" type="button" onClick={onCreate}>
            Criar primeiro orçamento
          </button>
        </div>
      ) : null}

      {budgetsQuery.data && budgetsQuery.data.length > 0 ? (
        <div className="budget-table" role="table" aria-label="Lista de orçamentos">
          <div className="budget-table-row table-head" role="row">
            <span>Número</span>
            <span>Cliente</span>
            <span>Status</span>
            <span>Custo interno</span>
            <span>Preço de venda</span>
            <span>Ação</span>
          </div>
          {budgetsQuery.data.map((budget) => (
            <div className="budget-table-row" role="row" key={budget.id}>
              <span>
                <strong>{budget.budgetNumber}</strong>
                <small>{budget.title}</small>
              </span>
              <span>{budget.clientName}</span>
              <span>
                <span className="status-pill">{statusLabels[budget.status]}</span>
              </span>
              <span className="internal-money">R$ {budget.subtotalCost}</span>
              <span className="sale-money">R$ {budget.finalPrice}</span>
              <span>
                <button className="link-button" type="button" onClick={() => onEdit(budget.id)}>
                  Editar
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
