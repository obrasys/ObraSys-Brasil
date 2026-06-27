import { useMemo, useState } from "react";

import { PmeDashboardAlertsList } from "./components/PmeDashboardAlertsList";
import { PmeDashboardAttentionLists } from "./components/PmeDashboardAttentionLists";
import { PmeDashboardCriticalProjects } from "./components/PmeDashboardCriticalProjects";
import { PmeDashboardFilters } from "./components/PmeDashboardFilters";
import { PmeDashboardFinancialCards } from "./components/PmeDashboardFinancialCards";
import { PmeDashboardOperationalCards } from "./components/PmeDashboardOperationalCards";
import { PmeDashboardQuickActions } from "./components/PmeDashboardQuickActions";
import { usePmeDashboardMutations, usePmeDashboardSummary } from "./hooks/usePmeDashboard";
import type { PmeDashboardFilters as DashboardFilters } from "./pmeDashboardTypes";

const defaultFilters: DashboardFilters = {
  period: "30d",
  status: "all",
  responsibleName: "",
  projectSearch: "",
  severity: "all",
  showClosedProjects: false
};

export function PmeDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const dashboardQuery = usePmeDashboardSummary(filters);
  const mutations = usePmeDashboardMutations(filters);
  const filteredAlerts = useMemo(() => {
    const alerts = dashboardQuery.data?.alerts ?? [];
    if (filters.severity === "all") {
      return alerts;
    }
    return alerts.filter((alert) => alert.severity === filters.severity);
  }, [dashboardQuery.data?.alerts, filters.severity]);

  if (dashboardQuery.isLoading) {
    return <div className="state-box">Carregando dashboard PME...</div>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar o dashboard PME.</div>;
  }

  const dashboard = dashboardQuery.data;

  return (
    <section className="module-section dashboard-module" aria-labelledby="dashboard-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Dashboard PME</p>
          <h1 id="dashboard-title">Visão multi-obras</h1>
          <p className="muted">Veja em poucos segundos quais obras precisam de atenção hoje.</p>
        </div>
        <button
          className="primary-button"
          onClick={() => mutations.generateAlerts.mutate()}
          type="button"
        >
          Atualizar alertas
        </button>
      </div>

      <PmeDashboardFilters filters={filters} onChange={setFilters} />

      {dashboard.alerts.length > 0 ? (
        <div className="state-box warning-state">
          Existem {dashboard.alerts.length} alerta(s) ativos. Priorize custos estourados,
          recebimentos vencidos e tarefas bloqueadas.
        </div>
      ) : null}

      <PmeDashboardFinancialCards
        canSeeFinancials={dashboard.canSeeFinancials}
        summary={dashboard.summary}
      />
      <PmeDashboardOperationalCards summary={dashboard.summary} />

      <div className="dashboard-main-grid">
        <PmeDashboardCriticalProjects
          canSeeFinancials={dashboard.canSeeFinancials}
          projects={dashboard.criticalProjects}
        />
        <PmeDashboardQuickActions />
      </div>

      <PmeDashboardAttentionLists
        blockedTasks={dashboard.blockedTasks}
        latePurchases={dashboard.latePurchases}
        missingDailyLogs={dashboard.missingDailyLogs}
        overdueReceipts={dashboard.overdueReceipts}
      />

      <PmeDashboardAlertsList
        alerts={filteredAlerts}
        onAcknowledge={(alertId) =>
          mutations.acknowledgeAlert.mutate({ alertId, status: "acknowledged" })
        }
        onResolve={(alertId) => mutations.resolveAlert.mutate({ alertId, status: "resolved" })}
      />
    </section>
  );
}
