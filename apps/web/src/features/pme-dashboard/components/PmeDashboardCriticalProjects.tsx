import type { PmeDashboardProjectRow } from "@obrasys/domain";

import { PmeDashboardPermissionGate } from "./PmeDashboardPermissionGate";

interface Props {
  canSeeFinancials: boolean;
  projects: PmeDashboardProjectRow[];
}

export function PmeDashboardCriticalProjects({ canSeeFinancials, projects }: Props) {
  if (projects.length === 0) {
    return <div className="empty-state">Nenhuma obra critica nos filtros atuais.</div>;
  }

  return (
    <section className="tab-panel" aria-labelledby="critical-projects-title">
      <div className="section-heading">
        <div>
          <h2 id="critical-projects-title">Obras que precisam de atencao</h2>
          <p>Priorize obras com alerta, tarefa bloqueada, compra atrasada ou diario em falta.</p>
        </div>
      </div>
      <div className="simple-list">
        {projects.map((project) => (
          <article className="simple-list-row dashboard-project-row" key={project.id}>
            <div>
              <strong>{project.name}</strong>
              <p>{project.clientName ?? "Cliente nao informado"}</p>
            </div>
            <span>{project.status}</span>
            <span>{project.progressPercentage}%</span>
            <PmeDashboardPermissionGate canSeeFinancials={canSeeFinancials}>
              <span>R$ {project.actualCost}</span>
              <span>R$ {project.pendingReceivables}</span>
            </PmeDashboardPermissionGate>
            <span>{project.alertCount} alerta(s)</span>
            <a className="link-button" href={`/app/obras/${project.id}`}>
              Abrir obra
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
