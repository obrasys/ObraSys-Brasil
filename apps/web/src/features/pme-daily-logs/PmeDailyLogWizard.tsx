import { useState } from "react";

import { usePmeDailyLog, usePmeDailyLogMutations } from "./hooks/usePmeDailyLogs";

const steps = [
  "Clima",
  "Equipe",
  "Atividades",
  "Ocorrencias",
  "Materiais",
  "Equipamentos",
  "Fotos",
  "Voz",
  "Revisao",
  "Concluir"
];

export function PmeDailyLogWizard({
  projectId,
  dailyLogId
}: {
  projectId: string;
  dailyLogId: string;
}) {
  const [step, setStep] = useState(0);
  const [fieldValue, setFieldValue] = useState("");
  const dailyLogQuery = usePmeDailyLog(projectId, dailyLogId);
  const mutations = usePmeDailyLogMutations(projectId, dailyLogId);

  if (dailyLogQuery.isLoading) {
    return <div className="state-box">Carregando diario...</div>;
  }
  if (dailyLogQuery.isError || !dailyLogQuery.data) {
    return <div className="state-box error-state">Nao foi possivel carregar o diario.</div>;
  }

  const snapshot = dailyLogQuery.data;
  const isLocked = snapshot.dailyLog.status === "locked";
  const progress = Math.round(((step + 1) / steps.length) * 100);

  function nextStep() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
    setFieldValue("");
  }

  return (
    <section className="module-section daily-log-wizard" aria-labelledby="daily-log-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Diario guiado</p>
          <h1 id="daily-log-title">{snapshot.projectName}</h1>
          <p className="muted">
            {snapshot.dailyLog.logDate} - {snapshot.dailyLog.status}
          </p>
        </div>
      </div>
      <div className="wizard-progress">
        <span>{steps[step]}</span>
        <strong>{progress}%</strong>
      </div>
      <div className="project-tabs" role="tablist" aria-label="Passos do diario">
        {steps.map((label, index) => (
          <button
            className={step === index ? "active" : ""}
            key={label}
            onClick={() => setStep(index)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {isLocked ? (
        <div className="state-box warning-state">Este diario esta bloqueado para edicao.</div>
      ) : null}

      <section className="tab-panel">
        {step === 0 ? (
          <StepPanel
            buttonLabel="Salvar clima manual"
            description={
              snapshot.dailyLog.weatherSummary || "Informe o clima observado no canteiro."
            }
            disabled={isLocked}
            onSubmit={() =>
              mutations.saveManualWeather.mutate(fieldValue || "Clima informado manualmente.")
            }
            placeholder="Ex.: manha com sol, tarde com chuva fraca"
            title="Clima"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 1 ? (
          <StepPanel
            buttonLabel="Adicionar equipe"
            description={`${snapshot.labor.length} registro(s) de equipe`}
            disabled={isLocked}
            onSubmit={() =>
              mutations.addLabor.mutate({
                workerType: "pedreiro",
                quantity: fieldValue || "1",
                notes: "Adicionado pelo wizard"
              })
            }
            placeholder="Quantidade de profissionais"
            title="Equipe presente"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 2 ? (
          <StepPanel
            buttonLabel="Adicionar atividade"
            description={`${snapshot.activities.length} atividade(s)`}
            disabled={isLocked}
            onSubmit={() =>
              mutations.addActivity.mutate({
                title: fieldValue || "Atividade executada",
                description: fieldValue || "Atividade registrada no diario.",
                status: "in_progress"
              })
            }
            placeholder="O que foi feito hoje?"
            title="Atividades executadas"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 3 ? (
          <StepPanel
            buttonLabel="Adicionar ocorrencia"
            description={`${snapshot.occurrences.length} ocorrencia(s)`}
            disabled={isLocked}
            onSubmit={() =>
              mutations.addOccurrence.mutate({
                occurrenceType: "outro",
                title: fieldValue || "Ocorrencia registrada",
                description: fieldValue || "Ocorrencia do dia.",
                severity: "medium",
                requiresFollowUp: true
              })
            }
            placeholder="Houve algum problema?"
            title="Ocorrencias"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 4 ? (
          <StepPanel
            buttonLabel="Adicionar material"
            description={`${snapshot.materials.length} material(is)`}
            disabled={isLocked}
            onSubmit={() =>
              mutations.addMaterial.mutate({
                materialName: fieldValue || "Material registrado",
                quantity: "1",
                unit: "un",
                usageType: "used"
              })
            }
            placeholder="Material entregue ou usado"
            title="Materiais"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 5 ? (
          <StepPanel
            buttonLabel="Adicionar equipamento"
            description={`${snapshot.equipment.length} equipamento(s)`}
            disabled={isLocked}
            onSubmit={() =>
              mutations.addEquipment.mutate({
                equipmentName: fieldValue || "Equipamento registrado",
                quantity: "1",
                status: "in_use"
              })
            }
            placeholder="Equipamento usado"
            title="Equipamentos"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 6 ? (
          <StepPanel
            buttonLabel="Adicionar foto"
            description={`${snapshot.photos.length} foto(s) no diario`}
            disabled={false}
            onSubmit={() =>
              mutations.addPhoto.mutate({
                fileUrl:
                  fieldValue || "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=640",
                fileName: "foto-diario.jpg",
                caption: "Foto adicionada ao diario"
              })
            }
            placeholder="URL da foto"
            title="Fotos"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 7 ? (
          <StepPanel
            buttonLabel="Gerar sugestoes da Axia"
            description="A Axia separa o relato em campos para revisao humana."
            disabled={isLocked}
            onSubmit={() => mutations.addVoiceNote.mutate(fieldValue || "Relato de voz do dia.")}
            placeholder="Cole ou transcreva o relato de voz"
            title="Voz e resumo"
            value={fieldValue}
            onChange={setFieldValue}
          />
        ) : null}
        {step === 8 ? <ReviewStep snapshot={snapshot} /> : null}
        {step === 9 ? (
          <div className="daily-log-review">
            <h2>Concluir diario</h2>
            <p className="muted">Revise as informacoes antes de concluir ou bloquear a edicao.</p>
            <div className="row-actions">
              <button
                className="primary-button"
                disabled={isLocked}
                onClick={() => mutations.complete.mutate()}
                type="button"
              >
                Concluir diario
              </button>
              <button
                className="secondary-button"
                disabled={isLocked}
                onClick={() => mutations.lock.mutate()}
                type="button"
              >
                Bloquear edicao
              </button>
              <button
                className="secondary-button"
                onClick={() => mutations.exportReport.mutate()}
                type="button"
              >
                Gerar relatorio
              </button>
            </div>
            {mutations.complete.data && mutations.complete.data.length > 0 ? (
              <p className="form-error">Campos pendentes: {mutations.complete.data.join(", ")}</p>
            ) : null}
          </div>
        ) : null}
      </section>

      <div className="modal-actions">
        <button
          className="secondary-button"
          onClick={() => setStep(Math.max(step - 1, 0))}
          type="button"
        >
          Voltar
        </button>
        <button className="primary-button" onClick={nextStep} type="button">
          Proximo
        </button>
      </div>
    </section>
  );
}

function StepPanel({
  title,
  description,
  placeholder,
  value,
  disabled,
  buttonLabel,
  onChange,
  onSubmit
}: {
  title: string;
  description: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  buttonLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="daily-log-step">
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      <textarea
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <button className="primary-button" disabled={disabled} onClick={onSubmit} type="button">
        {buttonLabel}
      </button>
    </div>
  );
}

function ReviewStep({
  snapshot
}: {
  snapshot: { axiaSuggestions: string[]; photos: unknown[]; activities: unknown[] };
}) {
  return (
    <div className="daily-log-review">
      <h2>Revisao</h2>
      <p className="muted">
        Atividades: {snapshot.activities.length} | Fotos: {snapshot.photos.length}
      </p>
      {snapshot.axiaSuggestions.length > 0 ? (
        <div className="state-box warning-state">
          <strong>Sugestoes da Axia</strong>
          <ul>
            {snapshot.axiaSuggestions.map((suggestion) => (
              <li key={suggestion}>{suggestion}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="empty-state">Nenhuma sugestao da Axia pendente.</div>
      )}
    </div>
  );
}
