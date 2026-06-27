import type { PmeProjectReport, GenerateReportInput } from "../pmeProjectReportTypes";

interface Props {
  description: string;
  report: PmeProjectReport | undefined;
  reportType: GenerateReportInput["reportType"];
  title: string;
  visibility: GenerateReportInput["visibility"];
  onExport: (reportId: string) => void;
  onGenerate: (input: GenerateReportInput) => void;
  projectId: string;
}

export function PmeProjectReportCard({
  description,
  report,
  reportType,
  title,
  visibility,
  onExport,
  onGenerate,
  projectId
}: Props) {
  return (
    <article className="report-card">
      <div>
        <span className="status-pill">{visibility === "client" ? "Cliente" : "Interno"}</span>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <small>
          {report
            ? `Ultima geracao: ${new Date(report.generatedAt).toLocaleDateString("pt-BR")}`
            : "Ainda nao gerado"}
        </small>
      </div>
      <div className="row-actions">
        <button
          className="secondary-button"
          onClick={() => onGenerate({ projectId, reportType, visibility })}
          type="button"
        >
          Gerar relatorio
        </button>
        <button
          className="link-button"
          disabled={!report}
          onClick={() => report && onExport(report.id)}
          type="button"
        >
          Exportar
        </button>
      </div>
    </article>
  );
}
