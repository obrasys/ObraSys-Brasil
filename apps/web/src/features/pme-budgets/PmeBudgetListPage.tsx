import { useState } from "react";

import { PmeBudgetStatusBadge } from "./components/PmeBudgetStatusBadge";
import { usePmeBudgets } from "./hooks/usePmeBudgets";
import { statusLabels } from "./pmeBudgetLabels";
import type { PmeBudgetFilters, PmeBudgetSummary } from "./pmeBudgetUiTypes";

interface PmeBudgetListPageProps {
  onCreate: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}

const initialFilters: PmeBudgetFilters = {
  status: "all",
  client: "",
  period: "all",
  query: ""
};

export function PmeBudgetListPage({ onCreate, onView, onEdit }: PmeBudgetListPageProps) {
  const [filters, setFilters] = useState<PmeBudgetFilters>(initialFilters);
  const budgetsQuery = usePmeBudgets(filters);
  const hasFilters =
    filters.status !== "all" ||
    filters.client.trim().length > 0 ||
    filters.period !== "all" ||
    filters.query.trim().length > 0;

  return (
    <section className="module-section" aria-labelledby="budget-list-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Orçamentos PME</p>
          <h1 id="budget-list-title">Orçamentos rápidos para reformas e obras pequenas</h1>
          <p className="muted">
            Comece com cliente e item manual. Meu Catálogo é opcional e SINAPI não é obrigatório.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>
          Novo orçamento
        </button>
      </div>

      <div className="filters-bar">
        <label>
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as PmeBudgetFilters["status"]
              }))
            }
          >
            <option value="all">Todos</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option value={status} key={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Cliente</span>
          <input
            value={filters.client}
            onChange={(event) =>
              setFilters((current) => ({ ...current, client: event.target.value }))
            }
            placeholder="Nome do cliente"
          />
        </label>
        <label>
          <span>Período</span>
          <select
            value={filters.period}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                period: event.target.value as PmeBudgetFilters["period"]
              }))
            }
          >
            <option value="all">Todos</option>
            <option value="valid">Válidos</option>
            <option value="expired">Vencidos</option>
          </select>
        </label>
        <label>
          <span>Busca</span>
          <input
            value={filters.query}
            onChange={(event) =>
              setFilters((current) => ({ ...current, query: event.target.value }))
            }
            placeholder="Número, título ou cliente"
          />
        </label>
      </div>

      {budgetsQuery.isLoading ? <div className="state-box">Carregando orçamentos...</div> : null}

      {budgetsQuery.isError ? (
        <div className="state-box error-state">Não foi possível carregar os orçamentos.</div>
      ) : null}

      {budgetsQuery.data?.length === 0 && !hasFilters ? (
        <div className="empty-state">
          <h2>Nenhum orçamento ainda</h2>
          <p>Crie um orçamento simples agora e refine materiais, mão de obra e margem depois.</p>
          <button className="secondary-button" type="button" onClick={onCreate}>
            Criar primeiro orçamento
          </button>
        </div>
      ) : null}

      {budgetsQuery.data?.length === 0 && hasFilters ? (
        <div className="empty-state">
          <h2>Sem resultados</h2>
          <p>Nenhum orçamento combina com os filtros atuais.</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setFilters(initialFilters)}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      {budgetsQuery.data && budgetsQuery.data.length > 0 ? (
        <BudgetTable budgets={budgetsQuery.data} onView={onView} onEdit={onEdit} />
      ) : null}
    </section>
  );
}

function BudgetTable({
  budgets,
  onView,
  onEdit
}: {
  budgets: PmeBudgetSummary[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="budget-table" role="table" aria-label="Lista de orçamentos">
      <div className="budget-table-row table-head" role="row">
        <span>Número</span>
        <span>Cliente</span>
        <span>Título</span>
        <span>Valor final</span>
        <span>Status</span>
        <span>Validade</span>
        <span>Criação</span>
        <span>Responsável</span>
        <span>Ações</span>
      </div>
      {budgets.map((budget) => (
        <div className="budget-table-row" role="row" key={budget.id}>
          <span>
            <strong>{budget.budgetNumber}</strong>
          </span>
          <span>{budget.clientName}</span>
          <span>{budget.title}</span>
          <span className="sale-money">R$ {budget.finalPrice}</span>
          <span>
            <PmeBudgetStatusBadge status={budget.status} />
          </span>
          <span>{budget.validUntil || "Sem data"}</span>
          <span>{formatDate(budget.createdAt)}</span>
          <span>{budget.responsibleName}</span>
          <span className="row-actions">
            <button className="link-button" type="button" onClick={() => onView(budget.id)}>
              Ver
            </button>
            <button className="link-button" type="button" onClick={() => onEdit(budget.id)}>
              Editar
            </button>
            <button className="link-button" type="button" disabled>
              Duplicar futuramente
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}
