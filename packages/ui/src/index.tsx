export interface FoundationBadgeProps {
  label: string;
}

export function FoundationBadge({ label }: FoundationBadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        borderRadius: 6,
        background: "#e7f0ff",
        color: "#164b8f",
        fontSize: 13,
        fontWeight: 700,
        padding: "6px 10px"
      }}
    >
      {label}
    </span>
  );
}
