import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  useCreatePmeProjectDailyLog,
  useLockPmeProjectDailyLog
} from "../hooks/usePmeProjectMutations";
import { pmeProjectDailyLogSchema } from "../pmeProjectSchemas";
import type { PmeProjectDailyLog, PmeProjectSnapshot } from "../pmeProjectUiTypes";

type DailyLogFormValues = Omit<PmeProjectDailyLog, "id">;

export function PmeProjectDailyLogsTab({ snapshot }: { snapshot: PmeProjectSnapshot }) {
  const createDailyLog = useCreatePmeProjectDailyLog(snapshot.project.id);
  const lockDailyLog = useLockPmeProjectDailyLog(snapshot.project.id);
  const form = useForm<DailyLogFormValues>({
    resolver: zodResolver(pmeProjectDailyLogSchema.omit({ id: true })),
    defaultValues: {
      logDate: new Date().toISOString().slice(0, 10),
      weatherMorning: "",
      weatherAfternoon: "",
      laborCount: 0,
      workPerformed: "",
      issues: "",
      nextSteps: "",
      materialsDelivered: "",
      clientNotes: "",
      photosCount: 0,
      status: "draft"
    }
  });

  return (
    <section className="tab-panel" aria-labelledby="daily-logs-title">
      <div className="section-heading">
        <div>
          <h2 id="daily-logs-title">Diario simples</h2>
          <p>Registre trabalho feito, problemas, proximos passos e fotos do dia.</p>
        </div>
      </div>
      <form
        className="quick-form"
        onSubmit={form.handleSubmit((values) => {
          createDailyLog.mutate(values);
          form.reset();
        })}
      >
        <div className="inline-fields">
          <input type="date" {...form.register("logDate")} />
          <input
            min="0"
            placeholder="Equipe presente"
            type="number"
            {...form.register("laborCount", { valueAsNumber: true })}
          />
        </div>
        <textarea placeholder="Trabalho realizado" {...form.register("workPerformed")} />
        <textarea placeholder="Problemas ou impedimentos" {...form.register("issues")} />
        <textarea placeholder="Proximos passos" {...form.register("nextSteps")} />
        <button className="primary-button" type="submit">
          Criar diario
        </button>
      </form>
      <div className="simple-list">
        {snapshot.dailyLogs.map((dailyLog) => (
          <article className="simple-list-row" key={dailyLog.id}>
            <div>
              <strong>{dailyLog.logDate}</strong>
              <p>{dailyLog.workPerformed}</p>
            </div>
            <span>{dailyLog.photosCount} fotos</span>
            <span className="status-pill">{dailyLog.status}</span>
            <button
              className="link-button"
              disabled={dailyLog.status === "locked"}
              onClick={() => lockDailyLog.mutate(dailyLog.id)}
              type="button"
            >
              Bloquear diario
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
