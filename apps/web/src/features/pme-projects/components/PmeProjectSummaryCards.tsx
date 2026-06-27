import type { PmeProjectSnapshot } from "../pmeProjectUiTypes";
import { PmeProjectPermissionGate } from "./PmeProjectPermissionGate";

interface PmeProjectSummaryCardsProps {
  snapshot: PmeProjectSnapshot;
}

export function PmeProjectSummaryCards({ snapshot }: PmeProjectSummaryCardsProps) {
  const { financialSummary } = snapshot;
  const openTasks = snapshot.tasks.filter((task) => task.status !== "done").length;
  const blockedTasks = snapshot.tasks.filter((task) => task.status === "blocked").length;
  const hasCostAlert = financialSummary.hasCostOverrun;
  const hasReceiptAlert = financialSummary.hasOverdueReceivables;

  return (
    <div className="project-summary-grid" aria-label="Resumo da obra">
      <SummaryCard label="Progresso" value={`${snapshot.project.progressPercentage}%`} />
      <SummaryCard label="Previsto gastar" value={`R$ ${financialSummary.plannedCost}`} />
      <SummaryCard
        label="Gasto real pago"
        value={`R$ ${financialSummary.actualCost}`}
        tone={hasCostAlert ? "danger" : "neutral"}
      />
      <SummaryCard label="Valor contratado" value={`R$ ${financialSummary.plannedRevenue}`} />
      <SummaryCard label="Recebido" value={`R$ ${financialSummary.receivedRevenue}`} />
      <SummaryCard
        label="Saldo a receber"
        value={`R$ ${financialSummary.pendingReceivables}`}
        tone={hasReceiptAlert ? "warning" : "neutral"}
      />
      <PmeProjectPermissionGate allowed={snapshot.canSeeProfit}>
        <SummaryCard label="Lucro previsto" value={`R$ ${financialSummary.expectedProfit}`} />
        <SummaryCard
          label="Lucro real"
          value={`R$ ${financialSummary.actualProfit}`}
          tone={Number(financialSummary.actualProfit) < 0 ? "danger" : "neutral"}
        />
      </PmeProjectPermissionGate>
      <SummaryCard label="Tarefas abertas" value={String(openTasks)} />
      <SummaryCard label="Tarefas bloqueadas" value={String(blockedTasks)} tone="warning" />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div className={`project-summary-card summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
