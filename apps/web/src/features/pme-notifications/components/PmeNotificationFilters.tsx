import type { PmeNotificationFilters } from "../pmeNotificationTypes";

interface Props {
  filters: PmeNotificationFilters;
  onChange: (filters: PmeNotificationFilters) => void;
}

export function PmeNotificationFilters({ filters, onChange }: Props) {
  return (
    <section className="notification-filters" aria-label="Filtros de notificacoes">
      <label>
        Status
        <select
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as PmeNotificationFilters["status"] })
          }
          value={filters.status}
        >
          <option value="all">Todas</option>
          <option value="unread">Nao lidas</option>
          <option value="read">Lidas</option>
          <option value="resolved">Resolvidas</option>
          <option value="archived">Arquivadas</option>
        </select>
      </label>
      <label>
        Severidade
        <select
          onChange={(event) =>
            onChange({
              ...filters,
              severity: event.target.value as PmeNotificationFilters["severity"]
            })
          }
          value={filters.severity}
        >
          <option value="all">Todas</option>
          <option value="critical">Critica</option>
          <option value="high">Alta</option>
          <option value="medium">Media</option>
          <option value="low">Baixa</option>
          <option value="info">Info</option>
        </select>
      </label>
      <label>
        Tipo
        <select
          onChange={(event) =>
            onChange({
              ...filters,
              notificationType: event.target.value as PmeNotificationFilters["notificationType"]
            })
          }
          value={filters.notificationType}
        >
          <option value="all">Todos</option>
          <option value="overdue_receipt">Recebimento vencido</option>
          <option value="late_purchase">Compra atrasada</option>
          <option value="blocked_task">Tarefa bloqueada</option>
          <option value="missing_daily_log">Diario em falta</option>
          <option value="cost_overrun">Custo acima do previsto</option>
          <option value="budget_follow_up">Orcamento sem seguimento</option>
          <option value="project_ready_to_close">Obra pronta para fecho</option>
        </select>
      </label>
      <label>
        Periodo
        <select
          onChange={(event) =>
            onChange({ ...filters, period: event.target.value as PmeNotificationFilters["period"] })
          }
          value={filters.period}
        >
          <option value="7d">7 dias</option>
          <option value="30d">30 dias</option>
          <option value="90d">90 dias</option>
          <option value="all">Tudo</option>
        </select>
      </label>
    </section>
  );
}
