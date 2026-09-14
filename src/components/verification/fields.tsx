import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

const inputBase =
  "w-full rounded-lg border bg-white/10 px-3 py-2 text-white placeholder-white/40 transition-colors focus:outline-none focus:ring-2";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1 text-xs text-red-300">
      <CircleAlert className="mt-px size-3 shrink-0" />
      {message}
    </p>
  );
}

export function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <h2 tabIndex={-1} data-focus-heading className="text-lg font-semibold text-white focus:outline-none">
        {title}
      </h2>
      {children && <p className="mt-1 text-sm text-blue-100/70">{children}</p>}
    </div>
  );
}

/** A monospace sketch of where the numbers sit on the tag. */
export function TagSketch({ lines }: { lines: { text: string; note?: string }[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs leading-6 text-blue-100/80">
      {lines.map((line) => (
        <div key={line.text} className="flex flex-wrap justify-between gap-x-3">
          <span className="text-white">{line.text}</span>
          {line.note && <span className="text-blue-100/50">← {line.note}</span>}
        </div>
      ))}
    </div>
  );
}

interface ChoiceGroupProps<T extends string> {
  name: string;
  legend: string;
  hint?: ReactNode;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

export function ChoiceGroup<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  error,
}: ChoiceGroupProps<T>) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1 text-sm font-medium text-blue-100/90">{legend}</legend>
      {hint && <p className="mb-2 text-xs text-blue-100/60">{hint}</p>}
      <div className="grid gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
              value === option.value
                ? "border-purple-400/70 bg-purple-500/20"
                : "border-white/15 bg-white/5 hover:bg-white/10",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              className="mt-0.5 accent-purple-400"
            />
            <span>
              {option.label}
              {option.hint && <span className="block text-xs text-blue-100/60">{option.hint}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={`${name}-error`} message={error} />
    </fieldset>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "url";
  inputMode?: "text" | "url" | "numeric" | "decimal";
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  children?: ReactNode;
}

export function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  placeholder,
  maxLength,
  disabled = false,
  children,
}: TextFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-blue-100/90">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mb-2 text-xs text-blue-100/60">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          inputBase,
          error ? "border-red-400/60 focus:ring-red-400" : "border-white/20 focus:ring-purple-400",
          disabled && "opacity-40",
        )}
      />
      <FieldError id={`${id}-error`} message={error} />
      {children}
    </div>
  );
}

export function UnknownToggle({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-blue-100/80">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="accent-purple-400"
      />
      Nie widać
    </label>
  );
}
