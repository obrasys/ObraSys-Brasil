export function PmePurchaseStatusBadge({ status }: { status: string }) {
  return <span className={`status-pill purchase-${status}`}>{status}</span>;
}
