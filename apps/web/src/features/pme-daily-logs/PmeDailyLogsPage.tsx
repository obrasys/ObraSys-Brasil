import { usePmeDailyLogs } from "./hooks/usePmeDailyLogs";

export function PmeDailyLogsPage({
  projectId,
  onOpen
}: {
  projectId: string;
  onOpen: (dailyLogId: string) => void;
}) {
  const dailyLogsQuery = usePmeDailyLogs(projectId);

  return (
    <section className="module-section" aria-labelledby="daily-logs-page-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Diario de obra PME</p>
          <h1 id="daily-logs-page-title">Registre o dia da obra em poucos minutos</h1>
          <p className="muted">Fluxo guiado com clima, equipe, atividades, voz e fotos.</p>
        </div>
        <button className="primary-button" onClick={() => onOpen("daily-log-1")} type="button">
          Criar diario de hoje
        </button>
      </div>
      {dailyLogsQuery.isLoading ? <div className="state-box">Carregando diarios...</div> : null}
      <div className="simple-list">
        {dailyLogsQuery.data?.map((dailyLog) => (
          <article className="simple-list-row" key={dailyLog.id}>
            <div>
              <strong>{dailyLog.logDate}</strong>
              <p>{dailyLog.workPerformed || "Rascunho sem atividades"}</p>
            </div>
            <span>{dailyLog.weatherSummary || "Clima pendente"}</span>
            <span className="status-pill">{dailyLog.status}</span>
            <button className="primary-button" onClick={() => onOpen(dailyLog.id)} type="button">
              Editar
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
