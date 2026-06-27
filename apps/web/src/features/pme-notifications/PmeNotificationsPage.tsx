import { useState } from "react";

import { PmeNotificationCard } from "./components/PmeNotificationCard";
import { PmeNotificationEmptyState } from "./components/PmeNotificationEmptyState";
import { PmeNotificationFilters } from "./components/PmeNotificationFilters";
import { PmeNotificationsBell } from "./components/PmeNotificationsBell";
import { PmeNotificationsDropdown } from "./components/PmeNotificationsDropdown";
import { usePmeNotificationMutations, usePmeNotifications } from "./hooks/usePmeNotifications";
import type { PmeNotificationFilters as NotificationFilters } from "./pmeNotificationTypes";

const defaultFilters: NotificationFilters = {
  status: "all",
  severity: "all",
  notificationType: "all",
  projectId: "",
  period: "30d"
};

export function PmeNotificationsPage() {
  const [filters, setFilters] = useState<NotificationFilters>(defaultFilters);
  const notificationsQuery = usePmeNotifications(filters);
  const mutations = usePmeNotificationMutations();

  if (notificationsQuery.isLoading) {
    return <div className="state-box">Carregando notificacoes...</div>;
  }

  if (notificationsQuery.isError || !notificationsQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar notificacoes.</div>;
  }

  const view = notificationsQuery.data;

  return (
    <section className="module-section notifications-module" aria-labelledby="notifications-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Notificacoes PME</p>
          <h1 id="notifications-title">Centro de notificações</h1>
          <p className="muted">
            Avisos práticos sobre obras, orçamentos, compras, tarefas, diários e recebimentos.
          </p>
        </div>
        <div className="topbar-actions">
          <PmeNotificationsBell />
          <a className="secondary-button" href="/app/notificacoes/preferencias">
            Preferencias
          </a>
          <button
            className="primary-button"
            onClick={() => mutations.generate.mutate()}
            type="button"
          >
            Gerar avisos
          </button>
        </div>
      </div>

      <PmeNotificationsDropdown />
      <PmeNotificationFilters filters={filters} onChange={setFilters} />

      <div className="state-box">
        <strong>{view.unreadCount} notificacao(oes) nao lidas</strong>
        <p className="muted">Notificacoes financeiras sao sanitizadas para perfis sem permissao.</p>
      </div>

      {view.notifications.length === 0 ? (
        <PmeNotificationEmptyState />
      ) : (
        <div className="notifications-list">
          {view.notifications.map((notification) => (
            <PmeNotificationCard
              key={notification.id}
              notification={notification}
              onArchive={(notificationId) => mutations.archive.mutate(notificationId)}
              onDismiss={(notificationId) => mutations.dismiss.mutate(notificationId)}
              onMarkRead={(notificationId) => mutations.markAsRead.mutate(notificationId)}
              onResolve={(notificationId) => mutations.resolve.mutate(notificationId)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
