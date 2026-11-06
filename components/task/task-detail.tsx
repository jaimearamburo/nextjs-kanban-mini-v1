import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { AssigneeAvatar } from "@/components/board/assignee-avatar";
import { LabelBadge } from "@/components/board/label-badge";
import { PriorityIcon } from "@/components/board/priority-icon";
import { getTask, PRIORITY_NAMES, STATUS_NAMES } from "@/lib/board";
import { TaskDetailLayout } from "./task-detail-layout";
import { TaskHeading, type TaskView } from "./task-heading";

/**
 * A Task's read-only detail, shared by the modal and the full page. An
 * unknown or Archived id shows the route's not-found state.
 */
export async function TaskDetail({
  id,
  view,
}: {
  id: string;
  view: TaskView;
}) {
  const task = await getTask(id);
  if (!task) notFound();

  return (
    <TaskDetailLayout
      view={view}
      activity={
        <Section title="Activity">
          <p className="text-sm text-muted-foreground">Activity will appear here.</p>
        </Section>
      }
    >
      {/* Right padding keeps a long title clear of the modal's close button. */}
      <TaskHeading view={view} className="pr-8">
        {task.title}
      </TaskHeading>

      <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-4 gap-y-3 text-sm">
        <Field name="Status">{STATUS_NAMES[task.status]}</Field>
        <Field name="Priority">
          <span className="inline-flex items-center gap-1.5">
            <PriorityIcon priority={task.priority} />
            {PRIORITY_NAMES[task.priority]}
          </span>
        </Field>
        <Field name="Assignee">
          <span className="inline-flex items-center gap-2">
            <AssigneeAvatar assignee={task.assignee} />
            {task.assignee ? (
              task.assignee.name
            ) : (
              <span className="text-muted-foreground">Unassigned</span>
            )}
          </span>
        </Field>
        <Field name="Labels">
          {task.labels.length === 0 ? (
            <span className="text-muted-foreground">None</span>
          ) : (
            <ul className="flex flex-wrap gap-1" aria-label="Labels">
              {task.labels.map((label) => (
                <li key={label.id}>
                  <LabelBadge label={label} />
                </li>
              ))}
            </ul>
          )}
        </Field>
      </dl>

      <Section title="Description">
        {task.description ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No description.</p>
        )}
      </Section>
      <Section title="Comments">
        <p className="text-sm text-muted-foreground">Comments will appear here.</p>
      </Section>
    </TaskDetailLayout>
  );
}

function Field({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{name}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = `task-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2
        id={headingId}
        className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
