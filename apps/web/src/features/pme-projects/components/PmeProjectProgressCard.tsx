import type { PmeProjectSnapshot } from "../pmeProjectUiTypes";

export function PmeProjectProgressCard({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const latestLog = snapshot.dailyLogs[0];
  const latestPhoto = snapshot.photos[0];

  return (
    <section className="tab-panel project-progress-card" aria-labelledby="project-progress-title">
      <div>
        <h2 id="project-progress-title">O que esta acontecendo</h2>
        {latestLog ? (
          <p>{latestLog.workPerformed}</p>
        ) : (
          <p className="muted">Nenhum diario registrado ainda.</p>
        )}
        <p className="muted">
          Proxima atividade:{" "}
          {latestLog?.nextSteps ?? "adicione uma tarefa ou diario para acompanhar."}
        </p>
      </div>
      {latestPhoto ? (
        <img src={latestPhoto.fileUrl} alt={latestPhoto.caption ?? latestPhoto.fileName} />
      ) : null}
    </section>
  );
}
