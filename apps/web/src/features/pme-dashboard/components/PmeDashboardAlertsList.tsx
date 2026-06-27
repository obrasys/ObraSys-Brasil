import type { PmeDashboardAlert } from "@obrasys/domain";

import { PmeDashboardAlertBadge } from "./PmeDashboardAlertBadge";

interface Props {
  alerts: PmeDashboardAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

export function PmeDashboardAlertsList({ alerts, onAcknowledge, onResolve }: Props) {
  if (alerts.length === 0) {
    return <div className="empty-state">Sem alertas nos filtros atuais. Bom sinal.</div>;
  }

  return (
    <section className="tab-panel" aria-labelledby="dashboard-alerts-title">
      <div className="section-heading">
        <div>
          <h2 id="dashboard-alerts-title">Alertas recentes</h2>
          <p>Resolva primeiro os alertas de custo, recebimento, compra e tarefa bloqueada.</p>
        </div>
      </div>
      <div className="simple-list">
        {alerts.map((alert) => (
          <article className="simple-list-row dashboard-alert-row" key={alert.id}>
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.description}</p>
            </div>
            <PmeDashboardAlertBadge severity={alert.severity} />
            <span>{alert.status}</span>
            <button className="link-button" onClick={() => onAcknowledge(alert.id)} type="button">
              Marcar visto
            </button>
            <button className="link-button" onClick={() => onResolve(alert.id)} type="button">
              Resolver
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
