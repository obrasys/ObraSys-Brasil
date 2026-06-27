export function PmeDashboardQuickActions() {
  const actions = [
    { href: "/app/obras", label: "Nova obra" },
    { href: "/app/orcamentos-pme/novo", label: "Novo orçamento PME" },
    { href: "/app/obras/project-demo-1/custos", label: "Lançar custo" },
    { href: "/app/obras/project-demo-1/recebimentos", label: "Registrar recebimento" },
    { href: "/app/obras/project-demo-1/diario/novo", label: "Criar diário de hoje" },
    { href: "/app/obras/project-demo-1/compras", label: "Ver compras" }
  ];

  return (
    <section className="tab-panel" aria-labelledby="dashboard-actions-title">
      <h2 id="dashboard-actions-title">Atalhos rápidos</h2>
      <div className="dashboard-actions">
        {actions.map((action) => (
          <a className="secondary-button" href={action.href} key={action.label}>
            {action.label}
          </a>
        ))}
      </div>
    </section>
  );
}
