"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

type FieldProps = { label: string; icon?: LucideIcon; fieldClassName?: string };

/** Keep labels visible while typing and preserve native form validation. */
export function TextField({ label, icon: Icon, fieldClassName = "", id, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <div className={`form-field ${fieldClassName}`}>
    <label className="form-field-surface" htmlFor={controlId}>
      {Icon && <Icon className="form-field-icon" size={18} aria-hidden="true"/>}
      <span className="form-field-content"><span className="form-field-label">{label}</span><input {...input} id={controlId}/></span>
    </label>
  </div>;
}

export function NoteField({ label, icon: Icon, fieldClassName = "", id, rows = 2, ...input }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return <div className={`form-field form-field-note ${fieldClassName}`}>
    <label className="form-field-surface" htmlFor={controlId}>
      {Icon && <Icon className="form-field-icon" size={18} aria-hidden="true"/>}
      <span className="form-field-content"><span className="form-field-label">{label}</span><textarea {...input} id={controlId} rows={rows}/></span>
    </label>
  </div>;
}
