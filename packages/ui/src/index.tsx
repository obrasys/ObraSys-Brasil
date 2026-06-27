export interface FoundationBadgeProps {
  label: string;
}

export function FoundationBadge({ label }: FoundationBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 6,
        background: "var(--obs-primary-soft, #efe8fa)",
        color: "var(--obs-primary, #340773)",
        fontSize: 13,
        fontWeight: 700,
        padding: "6px 10px"
      }}
    >
      {label}
    </span>
  );
}
