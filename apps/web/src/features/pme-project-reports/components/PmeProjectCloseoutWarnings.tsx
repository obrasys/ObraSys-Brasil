import type { PmeProjectCloseout } from "../pmeProjectReportTypes";

export function PmeProjectCloseoutWarnings({ closeout }: { closeout: PmeProjectCloseout }) {
  const warnings = [...closeout.warnings, ...closeout.blockingReasons];
  if (warnings.length === 0) {
    return <div className="state-box success-state">Obra sem pendencias criticas para fecho.</div>;
  }

  return (
    <div className="state-box warning-state">
      <strong>Pendencias antes de fechar</strong>
      <ul>
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
