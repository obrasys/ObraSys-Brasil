import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  pmeProjectStageSchema,
  pmeProjectTaskPrioritySchema,
  pmeProjectTaskSchema,
  pmeProjectTaskStatusSchema
} from "../pmeProjectSchemas";
import type { PmeProjectSnapshot, PmeProjectStage, PmeProjectTask } from "../pmeProjectUiTypes";
import { useCreatePmeProjectStage, useCreatePmeProjectTask } from "../hooks/usePmeProjectMutations";

type TaskFormValues = Omit<PmeProjectTask, "id">;
type StageFormValues = Omit<PmeProjectStage, "id">;

export function PmeProjectTasksTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const createTask = useCreatePmeProjectTask(snapshot.project.id);
  const createStage = useCreatePmeProjectStage(snapshot.project.id);
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(pmeProjectTaskSchema.omit({ id: true })),
    defaultValues: {
      title: "",
      description: "",
      responsibleName: "",
      plannedEndDate: "",
      progressPercentage: "0",
      status: "todo",
      priority: "medium"
    }
  });
  const stageForm = useForm<StageFormValues>({
    resolver: zodResolver(pmeProjectStageSchema.omit({ id: true })),
    defaultValues: {
      name: "",
      description: "",
      progressPercentage: "0",
      status: "planned",
      sortOrder: snapshot.stages.length + 1
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="tasks-title">
      <div className="section-heading">
        <div>
          <h2 id="tasks-title">Tarefas e etapas</h2>
          <p>Controle o que falta fazer, responsavel, prioridade e bloqueios.</p>
        </div>
      </div>

      <div className="split-grid">
        <form
          className="quick-form"
          onSubmit={taskForm.handleSubmit((values) => {
            createTask.mutate(values);
            taskForm.reset();
          })}
        >
          <h3>Adicionar tarefa</h3>
          <input placeholder="Titulo da tarefa" {...taskForm.register("title")} />
          <select {...taskForm.register("stageId")}>
            <option value="">Sem etapa</option>
            {snapshot.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
          <input placeholder="Responsavel" {...taskForm.register("responsibleName")} />
          <div className="inline-fields">
            <select {...taskForm.register("priority")}>
              {pmeProjectTaskPrioritySchema.options.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
            <select {...taskForm.register("status")}>
              {pmeProjectTaskStatusSchema.options.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <button className="primary-button" type="submit">
            Adicionar tarefa
          </button>
          {taskForm.formState.errors.title ? (
            <p className="form-error">{taskForm.formState.errors.title.message}</p>
          ) : null}
        </form>

        <form
          className="quick-form"
          onSubmit={stageForm.handleSubmit((values) => {
            createStage.mutate(values);
            stageForm.reset({ ...stageForm.getValues(), name: "", description: "" });
          })}
        >
          <h3>Adicionar etapa</h3>
          <input placeholder="Nome da etapa" {...stageForm.register("name")} />
          <textarea placeholder="Descricao curta" {...stageForm.register("description")} />
          <button className="secondary-button" type="submit">
            Adicionar etapa
          </button>
        </form>
      </div>

      {snapshot.tasks.length === 0 ? (
        <div className="empty-state">
          Nenhuma tarefa ainda. Adicione a primeira atividade da obra.
        </div>
      ) : (
        <div className="simple-list">
          {snapshot.tasks.map((task) => (
            <article className="simple-list-row" key={task.id}>
              <div>
                <strong>{task.title}</strong>
                <p>{task.description || "Sem descricao"}</p>
              </div>
              <span>{task.responsibleName || "Sem responsavel"}</span>
              <span className={`status-pill task-${task.status}`}>{task.status}</span>
              <span>{task.progressPercentage}%</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
