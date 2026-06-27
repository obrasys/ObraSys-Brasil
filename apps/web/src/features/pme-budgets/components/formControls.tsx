import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  error?: string | undefined;
  children: ReactNode;
}

interface ArraySectionProps {
  title: string;
  description: string;
  addLabel: string;
  isEmpty: boolean;
  emptyText: string;
  onAdd: () => void;
  children: ReactNode;
}

export function Field({ label, error, children }: FieldProps) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : null}
    </label>
  );
}

export function ArraySection({
  title,
  description,
  addLabel,
  isEmpty,
  emptyText,
  onAdd,
  children
}: ArraySectionProps) {
  return (
    <div className="array-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onAdd}>
          {addLabel}
        </button>
      </div>
      {isEmpty ? <div className="state-box">{emptyText}</div> : children}
    </div>
  );
}

export function RemoveButton({ onRemove }: { onRemove: () => void }) {
  return (
    <button className="link-button danger-link" type="button" onClick={onRemove}>
      Remover
    </button>
  );
}
