import type { PmeDashboardFilters } from "../pmeDashboardTypes";

interface Props {
  filters: PmeDashboardFilters;
  onChange: (filters: PmeDashboardFilters) => void;
}

export function PmeDashboardFilters({ filters, onChange }: Props) {
  return (
    <section className="dashboard-filters" aria-label="Filtros do dashboard PME">
      <label>
        Periodo
        <select
          onChange={(event) =>
            onChange({ ...filters, period: event.target.value as PmeDashboardFilters["period"] })
          }
          value={filters.period}
        >
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="90d">90 dias</option>
          <option value="current_month">Mes atual</option>
        </select>
      </label>
      <label>
        Status
        <select
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as PmeDashboardFilters["status"] })
          }
          value={filters.status}
        >
          <option value="all">Todos</option>
          <option value="active">Em andamento</option>
          <option value="planned">Planejada</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluida</option>
        </select>
      </label>
      <label>
        Obra
        <input
          onChange={(event) => onChange({ ...filters, projectSearch: event.target.value })}
          placeholder="Buscar obra"
          value={filters.projectSearch}
        />
      </label>
      <label>
        Severidade
        <select
          onChange={(event) =>
            onChange({
              ...filters,
              severity: event.target.value as PmeDashboardFilters["severity"]
            })
          }
          value={filters.severity}
        >
          <option value="all">Todas</option>
          <option value="critical">Critico</option>
          <option value="high">Alto</option>
          <option value="medium">Medio</option>
          <option value="low">Baixo</option>
        </select>
      </label>
      <label className="inline-dashboard-toggle">
        <input
          checked={filters.showClosedProjects}
          onChange={(event) => onChange({ ...filters, showClosedProjects: event.target.checked })}
          type="checkbox"
        />
        Mostrar fechadas
      </label>
    </section>
  );
}
