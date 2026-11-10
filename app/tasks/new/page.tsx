import { Suspense } from "react";
import { CreateTask, CreateTaskSkeleton } from "@/components/task/create-task";
import { TaskPageLayout } from "@/components/task/task-page-layout";

/** The create form loaded directly or refreshed: the full page, not the modal. */
export default function NewTaskPage({ searchParams }: PageProps<"/tasks/new">) {
  return (
    <TaskPageLayout>
      <Suspense fallback={<CreateTaskSkeleton />}>
        <CreateTask view="page" searchParams={searchParams} />
      </Suspense>
    </TaskPageLayout>
  );
}
