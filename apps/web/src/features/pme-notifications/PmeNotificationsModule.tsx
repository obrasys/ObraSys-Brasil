import { PmeNotificationPreferencesPage } from "./PmeNotificationPreferencesPage";
import { PmeNotificationsPage } from "./PmeNotificationsPage";

export function PmeNotificationsModule() {
  const pathname = globalThis.location.pathname;
  if (pathname.includes("/preferencias")) {
    return <PmeNotificationPreferencesPage />;
  }
  return <PmeNotificationsPage />;
}
