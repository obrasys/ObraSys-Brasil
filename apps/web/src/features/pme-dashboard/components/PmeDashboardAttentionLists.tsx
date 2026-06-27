import type {
  PmeDashboardProjectInput,
  PmeDashboardPurchaseInput,
  PmeDashboardReceiptInput,
  PmeDashboardTaskInput
} from "@obrasys/domain";

interface Props {
  blockedTasks: PmeDashboardTaskInput[];
  latePurchases: PmeDashboardPurchaseInput[];
  missingDailyLogs: PmeDashboardProjectInput[];
  overdueReceipts: PmeDashboardReceiptInput[];
}

export function PmeDashboardAttentionLists({
  blockedTasks,
  latePurchases,
  missingDailyLogs,
  overdueReceipts
}: Props) {
  return (
    <div className="dashboard-attention-grid">
      <MiniList
        emptyText="Sem recebimentos vencidos."
        items={overdueReceipts.map((receipt) => `${receipt.description} - R$ ${receipt.amount}`)}
        title="Recebimentos pendentes"
      />
      <MiniList
        emptyText="Sem compras atrasadas."
        items={latePurchases.map((purchase) => purchase.description)}
        title="Compras atrasadas"
      />
      <MiniList
        emptyText="Sem tarefas bloqueadas."
        items={blockedTasks.map((task) => task.title)}
        title="Tarefas críticas"
      />
      <MiniList
        emptyText="Nenhuma obra sem diario recente."
        items={missingDailyLogs.map((project) => project.name)}
        title="Diários em falta"
      />
    </div>
  );
}

function MiniList({
  emptyText,
  items,
  title
}: {
  emptyText: string;
  items: string[];
  title: string;
}) {
  return (
    <section className="tab-panel">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="dashboard-mini-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
