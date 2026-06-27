import type { PmeProjectCloseout } from "../pmeProjectReportTypes";

interface Props {
  closeout: PmeProjectCloseout;
  onChange: (checklistItemId: string, status: "pending" | "completed" | "waived") => void;
}

export function PmeProjectCloseoutChecklist({ closeout, onChange }: Props) {
  return (
    <section className="tab-panel" aria-labelledby="closeout-checklist-title">
      <div className="section-heading">
        <div>
          <h2 id="closeout-checklist-title">Checklist de fecho</h2>
          <p>Marque o que ja foi conferido antes de encerrar a obra.</p>
        </div>
      </div>
      <div className="simple-list">
        {closeout.checklist.map((item) => (
          <article className="simple-list-row checklist-row" key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
            <span>{item.isRequired ? "Obrigatorio" : "Opcional"}</span>
            <select
              aria-label={`Status de ${item.title}`}
              onChange={(event) =>
                onChange(item.id, event.target.value as "pending" | "completed" | "waived")
              }
              value={item.status}
            >
              <option value="pending">Pendente</option>
              <option value="completed">Concluido</option>
              <option value="waived">Justificado</option>
            </select>
          </article>
        ))}
      </div>
    </section>
  );
}
