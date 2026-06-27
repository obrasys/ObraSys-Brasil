interface PmeAxiaWarningsBoxProps {
  warnings: string[];
}

export function PmeAxiaWarningsBox({ warnings }: PmeAxiaWarningsBoxProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="notice-box">
      {warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}
