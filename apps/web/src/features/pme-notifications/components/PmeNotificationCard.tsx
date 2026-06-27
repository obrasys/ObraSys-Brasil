import type { PmeNotification } from "@obrasys/domain";

import { PmeNotificationSeverityBadge } from "./PmeNotificationSeverityBadge";

interface Props {
  notification: PmeNotification;
  onArchive: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
  onMarkRead: (notificationId: string) => void;
  onResolve: (notificationId: string) => void;
}

export function PmeNotificationCard({
  notification,
  onArchive,
  onDismiss,
  onMarkRead,
  onResolve
}: Props) {
  return (
    <article className={`notification-card notification-${notification.status}`}>
      <div>
        <div className="notification-title-row">
          <PmeNotificationSeverityBadge severity={notification.severity} />
          <span className="status-pill">{notification.status}</span>
        </div>
        <h2>{notification.title}</h2>
        <p>{notification.message}</p>
        <small>{new Date(notification.createdAt).toLocaleDateString("pt-BR")}</small>
      </div>
      <div className="row-actions">
        {notification.actionUrl ? (
          <a className="link-button" href={notification.actionUrl}>
            Abrir
          </a>
        ) : null}
        <button className="link-button" onClick={() => onMarkRead(notification.id)} type="button">
          Marcar como lida
        </button>
        <button className="link-button" onClick={() => onResolve(notification.id)} type="button">
          Resolver
        </button>
        <button className="link-button" onClick={() => onArchive(notification.id)} type="button">
          Arquivar
        </button>
        <button
          className="link-button danger-link"
          onClick={() => onDismiss(notification.id)}
          type="button"
        >
          Dispensar
        </button>
      </div>
    </article>
  );
}
