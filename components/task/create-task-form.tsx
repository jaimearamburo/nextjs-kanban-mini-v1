"use client";

import { startTransition, useActionState, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { labelColorClass } from "@/components/board/colors";
import { useCreatedTasks } from "@/components/board/created-tasks";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  PRIORITIES,
  PRIORITY_NAMES,
  STATUS_NAMES,
  STATUSES,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH,
  type CreateTaskField,
  type CreateTaskFieldErrors,
  type CreateTaskResult,
  type Label,
  type Status,
  type TeamMember,
} from "@/lib/board/domain";
import { createTaskInput } from "@/lib/board/schemas";
import { cn } from "@/lib/utils";
import type { TaskView } from "./task-heading";

/** The form's fields as last submitted, so a refused create keeps what the Guest typed. */
type SubmittedFields = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  labelIds: string[];
};

type FormState = {
  /**
   * Bumped by every refused submit. React resets a form after its action,
   * so the form remounts by this key to show `values` again.
   */
  key: number;
  values: SubmittedFields;
  fieldErrors: CreateTaskFieldErrors;
};

function submittedFields(formData: FormData): SubmittedFields {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    title: text("title"),
    description: text("description"),
    status: text("status"),
    priority: text("priority"),
    assigneeId: text("assigneeId"),
    labelIds: formData.getAll("labelIds").map(String),
  };
}

/** A blank form, mounted under `key`, with Priority None and the preselected Status. */
function emptyForm(key: number, status: Status): FormState {
  return {
    key,
    values: { title: "", description: "", status, priority: "NONE", assigneeId: "", labelIds: [] },
    fieldErrors: {},
  };
}

/**
 * The create form. Only the title is required. Submitting shows the Task at
 * the top of its column at once, then closes the form once it's saved. The
 * server validates every field; a refused field shows its message inline.
 */
export function CreateTaskForm({
  view,
  defaultStatus,
  labels,
  teamMembers,
  createAction,
}: {
  view: TaskView;
  defaultStatus: Status;
  labels: Label[];
  teamMembers: TeamMember[];
  createAction: (formData: FormData) => Promise<CreateTaskResult>;
}) {
  const router = useRouter();
  const { addCreated } = useCreatedTasks();
  const [state, formAction, isPending] = useActionState(
    async (previous: FormState, formData: FormData): Promise<FormState> => {
      const values = submittedFields(formData);
      // Only a Task the server will accept shows on the Board ahead of it.
      const parsed = createTaskInput.safeParse({
        ...values,
        assigneeId: values.assigneeId || null,
      });
      if (parsed.success) {
        const task = parsed.data;
        addCreated({
          id: `creating-${previous.key}`,
          title: task.title,
          status: task.status,
          priority: task.priority,
          labels: labels.filter((label) => task.labelIds.includes(label.id)),
          assignee: teamMembers.find((member) => member.id === task.assigneeId) ?? null,
          creating: true,
        });
      }
      const result = await createAction(formData);
      if (result.ok) {
        // After an await, a state update must be wrapped again (a React limitation).
        startTransition(() => {
          if (view === "modal") router.back();
          else router.push("/");
        });
        // Next keeps a closed route mounted, hidden (Activity), so the form
        // resets by key here: reopened, it's empty, with no old errors.
        return emptyForm(previous.key + 1, defaultStatus);
      }
      if (!result.fieldErrors) {
        toast.error("Couldn't create the Task", { description: result.error });
      }
      return { key: previous.key + 1, values, fieldErrors: result.fieldErrors ?? {} };
    },
    emptyForm(0, defaultStatus),
  );
  const { values, fieldErrors } = state;

  return (
    <form
      key={state.key}
      action={formAction}
      // The server validates every field, so the browser doesn't block a submit.
      noValidate
      className="flex max-w-2xl flex-col gap-5"
    >
      <Field name="title" label="Title" required error={fieldErrors.title}>
        {(props) => (
          <CountedText
            max={TASK_TITLE_MAX_LENGTH}
            // Shown in the last 20 characters.
            showFrom={TASK_TITLE_MAX_LENGTH - 20}
            defaultValue={values.title}
          >
            {(onChange) => (
              <input
                {...props}
                type="text"
                defaultValue={values.title}
                onChange={onChange}
                maxLength={TASK_TITLE_MAX_LENGTH}
                autoFocus
                autoComplete="off"
                className={inputClass}
              />
            )}
          </CountedText>
        )}
      </Field>

      <Field name="description" label="Description" error={fieldErrors.description}>
        {(props) => (
          <CountedText
            max={TASK_DESCRIPTION_MAX_LENGTH}
            // Shown in the last 200 characters.
            showFrom={TASK_DESCRIPTION_MAX_LENGTH - 200}
            defaultValue={values.description}
          >
            {(onChange) => (
              <textarea
                {...props}
                defaultValue={values.description}
                onChange={onChange}
                maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                rows={5}
                placeholder="Optional. Plain text; line breaks are kept."
                className={cn(inputClass, "h-auto resize-y py-1.5")}
              />
            )}
          </CountedText>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="status" label="Status" error={fieldErrors.status}>
          {(props) => (
            <select {...props} defaultValue={values.status} className={selectClass}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_NAMES[status]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field name="priority" label="Priority" error={fieldErrors.priority}>
          {(props) => (
            <select {...props} defaultValue={values.priority} className={selectClass}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_NAMES[priority]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field name="assigneeId" label="Assignee" error={fieldErrors.assigneeId}>
          {(props) => (
            <select {...props} defaultValue={values.assigneeId} className={selectClass}>
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <LabelChoices labels={labels} selected={values.labelIds} error={fieldErrors.labelIds} />

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          data-pending={isPending || undefined}
          className="rounded-sm px-4"
        >
          {isPending ? "Creating…" : "Create Task"}
        </Button>
        {view === "modal" ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="rounded-sm px-4"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        ) : (
          <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg", className: "rounded-sm px-4" })}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

const selectClass = cn(inputClass, "cursor-pointer");

/** What a Field gives its control: its id and name, and its error wiring. */
type ControlProps = {
  id: string;
  name: CreateTaskField;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/** A labelled control with its error, if any, under it. */
function Field({
  name,
  label,
  required = false,
  error,
  children,
}: {
  name: CreateTaskField;
  label: string;
  required?: boolean;
  error?: string;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required && <span className="font-normal text-muted-foreground"> (required)</span>}
      </label>
      {children({
        id,
        name,
        ...(error && { "aria-invalid": true, "aria-describedby": errorId }),
      })}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} className="text-sm text-destructive">
      {error}
    </p>
  );
}

/**
 * A text control with a live character count, shown once the text nears
 * its limit. Remounts with the form, so it starts from the default value.
 */
function CountedText({
  max,
  showFrom,
  defaultValue,
  children,
}: {
  max: number;
  showFrom: number;
  defaultValue: string;
  children: (onChange: (event: { target: { value: string } }) => void) => ReactNode;
}) {
  const [length, setLength] = useState(defaultValue.length);
  return (
    <>
      {children((event) => setLength(event.target.value.length))}
      {length >= showFrom && (
        <p
          aria-live="polite"
          className={cn(
            "self-end text-xs tabular-nums text-muted-foreground",
            length >= max && "text-destructive",
          )}
        >
          {length.toLocaleString("en")}/{max.toLocaleString("en")} characters
        </p>
      )}
    </>
  );
}

/**
 * The Labels as toggles, as in Task detail, coloured like their badges once
 * on. Each Label that's on is submitted as a `labelIds` value. Remounts with
 * the form, so it starts from the last submitted set.
 */
function LabelChoices({
  labels,
  selected,
  error,
}: {
  labels: Label[];
  selected: string[];
  error?: string;
}) {
  const [chosen, setChosen] = useState(selected);
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={error ? errorId : undefined}
      className="flex flex-col gap-1.5"
    >
      <p id={`${id}-label`} className="text-sm font-medium">
        Labels
      </p>
      <div className="flex flex-wrap gap-1.5">
        {labels.map((label) => {
          const on = chosen.includes(label.id);
          return (
            <button
              key={label.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setChosen(on ? chosen.filter((id) => id !== label.id) : [...chosen, label.id])
              }
              className={cn(
                "inline-flex h-7 cursor-pointer items-center rounded-md px-2.5 text-xs font-medium ring-1 ring-inset outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50",
                on
                  ? labelColorClass(label.color)
                  : "text-muted-foreground ring-border hover:text-foreground",
              )}
            >
              {label.name}
            </button>
          );
        })}
      </div>
      {chosen.map((id) => (
        <input key={id} type="hidden" name="labelIds" value={id} />
      ))}
      <FieldError id={errorId} error={error} />
    </div>
  );
}
