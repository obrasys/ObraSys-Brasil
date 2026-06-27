import { useUnreadPmeNotificationsCount } from "../hooks/usePmeNotifications";

export function PmeNotificationsBell() {
  const unreadQuery = useUnreadPmeNotificationsCount();
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <a className="notifications-bell" href="/app/notificacoes" aria-label="Notificacoes">
      <span>Sino</span>
      {unreadCount > 0 ? <strong>{unreadCount}</strong> : null}
    </a>
  );
}
