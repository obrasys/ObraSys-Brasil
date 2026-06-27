import { useState } from "react";

interface PmeAxiaFeedbackFormProps {
  runId?: string;
}

export function PmeAxiaFeedbackForm({ runId }: PmeAxiaFeedbackFormProps) {
  const [submitted, setSubmitted] = useState(false);

  if (typeof runId === "undefined") {
    return null;
  }

  if (submitted) {
    return <div className="state-box compact-state">Feedback registrado para esta execução.</div>;
  }

  return (
    <div className="feedback-box">
      <span>Esta ajuda foi útil?</span>
      <button className="secondary-button" type="button" onClick={() => setSubmitted(true)}>
        Sim
      </button>
      <button className="secondary-button" type="button" onClick={() => setSubmitted(true)}>
        Não
      </button>
    </div>
  );
}
