import { Suspense, type ReactNode } from "react";
import { notFound } from "next/navigation";
import { PriorityButton } from "@/components/board/priority-button";
import { getTask, listLabels, listTeamMembers, STATUS_NAMES, STATUSES } from "@/lib/board";
import {
  setTaskAssignee,
  setTaskLabels,
  setTaskPriority,
  setTaskStatus,
} from "@/lib/board/actions";
import { Comments, CommentsSkeleton } from "./comments";
import { FieldSelect } from "./field-select";
import { LabelPicker } from "./label-picker";
import { TaskHeading, type TaskView } from "./task-heading";

/**
 * A Task's detail, shared by the modal and the full page. An
 * unknown or Archived id shows the route's not-found state.
 */
export async function TaskDetail({
  id,
  view,
}: {
  id: string;
  view: TaskView;
}) {
  const [task, labels, teamMembers] = await Promise.all([
    getTask(id),
    listLabels(),
    listTeamMembers(),
  ]);
  if (!task) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Right padding keeps a long title clear of the modal's close button. */}
      <TaskHeading view={view} className="pr-8">
        {task.title}
      </TaskHeading>

      <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-4 gap-y-3 text-sm">
        <Field name="Status">
          <FieldSelect
            name="Status"
            value={task.status}
            options={STATUSES.map((status) => ({ value: status, name: STATUS_NAMES[status] }))}
            changeAction={setTaskStatus.bind(null, task.id)}
          />
        </Field>
        <Field name="Priority">
          <PriorityButton
            showName
            priority={task.priority}
            changeAction={setTaskPriority.bind(null, task.id)}
          />
        </Field>
        <Field name="Assignee">
          <FieldSelect
            name="Assignee"
            value={task.assignee?.id ?? ""}
            options={[
              { value: "", name: "Unassigned" },
              ...teamMembers.map((member) => ({ value: member.id, name: member.name })),
            ]}
            changeAction={setTaskAssignee.bind(null, task.id)}
          />
        </Field>
        <Field name="Labels">
          <LabelPicker
            labels={labels}
            selected={task.labels.map((label) => label.id)}
            changeAction={setTaskLabels.bind(null, task.id)}
          />
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
        <Suspense fallback={<CommentsSkeleton />}>
          <Comments taskId={task.id} />
        </Suspense>
      </Section>
    </div>
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
