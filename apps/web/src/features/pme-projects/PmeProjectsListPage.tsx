import { usePmeProjects } from "./hooks/usePmeProject";

export function PmeProjectsListPage({ onOpen }: { onOpen: (projectId: string) => void }) {
  const projectsQuery = usePmeProjects();

  return (
    <section className="module-section" aria-labelledby="projects-list-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Obras PME</p>
          <h1 id="projects-list-title">Acompanhe suas obras sem peso de ERP</h1>
          <p className="muted">
            Tarefas, compras, custos, recebimentos, diario e fotos em uma rotina simples.
          </p>
        </div>
      </div>

      {projectsQuery.isLoading ? <div className="state-box">Carregando obras...</div> : null}
      {projectsQuery.isError ? (
        <div className="state-box error-state">Nao foi possivel carregar as obras.</div>
      ) : null}
      {projectsQuery.data?.length === 0 ? (
        <div className="empty-state">
          <h2>Nenhuma obra ainda</h2>
          <p>Converta um orcamento aprovado ou crie uma obra manualmente em fase futura.</p>
        </div>
      ) : null}
      {projectsQuery.data && projectsQuery.data.length > 0 ? (
        <div className="simple-list">
          {projectsQuery.data.map((project) => (
            <article className="simple-list-row" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <p>{project.workAddress}</p>
              </div>
              <span>{project.clientName}</span>
              <span>{project.progressPercentage}%</span>
              <button className="primary-button" onClick={() => onOpen(project.id)} type="button">
                Abrir obra
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
