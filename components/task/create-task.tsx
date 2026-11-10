import { Skeleton } from "@/components/ui/skeleton";
import { listLabels, listTeamMembers } from "@/lib/board";
import { createBoardTask } from "@/lib/board/actions";
import { status } from "@/lib/board/schemas";
import { CreateTaskForm } from "./create-task-form";
import { TaskHeading, type TaskView } from "./task-heading";

/** `?status=` preselects a Status (a column's "+ Create"); anything else is To Do. */
const preselectedStatus = status.catch("TODO");

/** The create form, shared by the modal and the full page. */
export async function CreateTask({
  view,
  searchParams,
}: {
  view: TaskView;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [labels, teamMembers, params] = await Promise.all([
    listLabels(),
    listTeamMembers(),
    searchParams,
  ]);
  return (
    <div className="flex flex-col gap-6">
      {/* Right padding keeps the heading clear of the modal's close button. */}
      <TaskHeading view={view} className="pr-8">
        Create Task
      </TaskHeading>
      <CreateTaskForm
        view={view}
        defaultStatus={preselectedStatus.parse(params.status)}
        labels={labels}
        teamMembers={teamMembers}
        createAction={createBoardTask}
      />
    </div>
  );
}

/** Shown in the static shell while the form's Labels and roster load. */
export function CreateTaskSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading the form" className="flex max-w-2xl flex-col gap-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-28 w-full" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
      <Skeleton className="h-7 w-2/3" />
    </div>
  );
}
