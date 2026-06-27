import type { PmeNotificationFrequency, PmeNotificationPreference } from "@obrasys/domain";

import {
  usePmeNotificationMutations,
  usePmeNotificationPreferences
} from "./hooks/usePmeNotifications";

const labels: Record<string, string> = {
  overdue_receipt: "Recebimentos vencidos",
  late_purchase: "Compras atrasadas",
  blocked_task: "Tarefas bloqueadas",
  missing_daily_log: "Diario em falta",
  cost_overrun: "Custo acima do previsto",
  low_margin: "Margem baixa",
  budget_follow_up: "Orcamento sem seguimento",
  budget_approved_not_converted: "Orcamento aprovado nao convertido",
  project_ready_to_close: "Obra pronta para fecho"
};

export function PmeNotificationPreferencesPage() {
  const preferencesQuery = usePmeNotificationPreferences();
  const mutations = usePmeNotificationMutations();

  if (preferencesQuery.isLoading) {
    return <div className="state-box">Carregando preferencias...</div>;
  }
  if (preferencesQuery.isError || !preferencesQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar preferencias.</div>;
  }

  const preferences = preferencesQuery.data;

  const updatePreference = (
    notificationType: string,
    updater: (preference: PmeNotificationPreference) => PmeNotificationPreference
  ) => {
    mutations.updatePreferences.mutate(
      preferences.map((preference) =>
        preference.notificationType === notificationType ? updater(preference) : preference
      )
    );
  };

  return (
    <section
      className="module-section notifications-module"
      aria-labelledby="notification-preferences-title"
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">Preferencias</p>
          <h1 id="notification-preferences-title">Preferências de notificações</h1>
          <p className="muted">
            Nesta fase, as notificações são internas no sistema. Email e push ficam preparados para
            fases futuras.
          </p>
        </div>
        <a className="secondary-button" href="/app/notificacoes">
          Voltar
        </a>
      </div>

      <div className="simple-list">
        {preferences.map((preference) => (
          <article className="notification-preference-row" key={preference.notificationType}>
            <div>
              <strong>{labels[preference.notificationType] ?? preference.notificationType}</strong>
              <p className="muted">Controle se este aviso aparece no centro de notificações.</p>
            </div>
            <label>
              <input
                checked={preference.enabled}
                onChange={(event) =>
                  updatePreference(preference.notificationType, (current) => ({
                    ...current,
                    enabled: event.target.checked
                  }))
                }
                type="checkbox"
              />
              Ativo
            </label>
            <label>
              <input
                checked={preference.inAppEnabled}
                onChange={(event) =>
                  updatePreference(preference.notificationType, (current) => ({
                    ...current,
                    inAppEnabled: event.target.checked
                  }))
                }
                type="checkbox"
              />
              In-app
            </label>
            <select
              onChange={(event) =>
                updatePreference(preference.notificationType, (current) => ({
                  ...current,
                  frequency: event.target.value as PmeNotificationFrequency
                }))
              }
              value={preference.frequency}
            >
              <option value="immediate">Imediato</option>
              <option value="daily_digest">Resumo diário</option>
              <option value="weekly_digest">Resumo semanal</option>
              <option value="disabled">Desativado</option>
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}
