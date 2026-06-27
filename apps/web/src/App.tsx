import { PmeBudgetsModule } from "./features/pme-budgets/PmeBudgetsModule";
import { PmeDashboardModule } from "./features/pme-dashboard/PmeDashboardModule";
import { PmeDailyLogsModule } from "./features/pme-daily-logs/PmeDailyLogsModule";
import { PmeNotificationsModule } from "./features/pme-notifications/PmeNotificationsModule";
import { PmePurchasesModule } from "./features/pme-purchases/PmePurchasesModule";
import { PmeProjectReportsModule } from "./features/pme-project-reports/PmeProjectReportsModule";
import { PmeProjectsModule } from "./features/pme-projects/PmeProjectsModule";

const navigationItems = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/orcamentos-pme", label: "Orcamentos PME" },
  { href: "/app/obras", label: "Obras" },
  { href: "/app/fornecedores", label: "Fornecedores" },
  { href: "/app/notificacoes", label: "Notificacoes" }
];

export function App() {
  const pathname = globalThis.location.pathname;
  const isDashboardRoute = pathname.startsWith("/app/dashboard");
  const isNotificationsRoute = pathname.startsWith("/app/notificacoes");
  const isDailyLogsRoute = /^\/app\/obras\/[^/]+\/diario/.test(pathname);
  const isProjectReportsRoute = /^\/app\/obras\/[^/]+\/(relatorios|fecho)/.test(pathname);
  const isPurchasesRoute =
    pathname.startsWith("/app/fornecedores") || /^\/app\/obras\/[^/]+\/compras/.test(pathname);
  const isProjectsRoute = pathname.startsWith("/app/obras");

  return (
    <div className="app-frame">
      <aside className="app-sidebar obs-sidebar" aria-label="Navegacao principal">
        <a className="brand-block" href="/app/dashboard" aria-label="Obra Sys Brasil">
          <span>OSB</span>
          <strong>Obra Sys Brasil</strong>
          <small>PME</small>
        </a>
        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const isActive =
              item.href === "/app/orcamentos-pme"
                ? !isDashboardRoute &&
                  !isNotificationsRoute &&
                  !isProjectsRoute &&
                  !isPurchasesRoute
                : item.href === "/app/obras"
                  ? isProjectsRoute && !isPurchasesRoute
                  : pathname.startsWith(item.href);

            return (
              <a
                className={`obs-nav-item sidebar-nav-item${isActive ? " obs-nav-item-active" : ""}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="sidebar-premium-note">
          <span>Plano Promotor</span>
          <strong>Gestao PME premium</strong>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="app-topbar">
          <div>
            <span>Ambiente controlado</span>
            <strong>Obra Sys Brasil PME</strong>
          </div>
          <a className="topbar-action obs-button-secondary" href="/app/notificacoes">
            Notificacoes
          </a>
        </header>
        <main className="app-shell" aria-label="Obra Sys Brasil">
          {isNotificationsRoute ? (
            <PmeNotificationsModule />
          ) : isDashboardRoute ? (
            <PmeDashboardModule />
          ) : isDailyLogsRoute ? (
            <PmeDailyLogsModule />
          ) : isProjectReportsRoute ? (
            <PmeProjectReportsModule />
          ) : isPurchasesRoute ? (
            <PmePurchasesModule />
          ) : isProjectsRoute ? (
            <PmeProjectsModule />
          ) : (
            <PmeBudgetsModule />
          )}
        </main>
      </div>
    </div>
  );
}
