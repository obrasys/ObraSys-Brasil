import { usePmeNotifications } from "../hooks/usePmeNotifications";

const dropdownFilters = {
  status: "unread",
  severity: "all",
  notificationType: "all",
  projectId: "",
  period: "30d"
} as const;

export function PmeNotificationsDropdown() {
  const notificationsQuery = usePmeNotifications(dropdownFilters);
  const notifications = notificationsQuery.data?.notifications.slice(0, 5) ?? [];

  return (
    <section className="notifications-dropdown" aria-label="Ultimas notificacoes">
      <h2>Últimos avisos</h2>
      {notifications.length === 0 ? (
        <p className="muted">Sem avisos não lidos.</p>
      ) : (
        notifications.map((notification) => (
          <a href={notification.actionUrl ?? "/app/notificacoes"} key={notification.id}>
            <strong>{notification.title}</strong>
            <span>{notification.message}</span>
          </a>
        ))
      )}
      <a className="link-button" href="/app/notificacoes">
        Ver todas
      </a>
    </section>
  );
}
