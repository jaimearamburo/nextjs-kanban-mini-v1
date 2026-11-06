import { Suspense } from "react";
import { TaskDetail } from "@/components/task/task-detail";
import { TaskDetailSkeleton } from "@/components/task/task-detail-skeleton";
import { TaskPageLayout } from "@/components/task/task-page-layout";

/** A Task loaded directly or refreshed: the full page, not the modal. */
export default function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <TaskPageLayout>
      <Suspense fallback={<TaskDetailSkeleton />}>
        {params.then(({ id }) => (
          <TaskDetail id={id} view="page" />
        ))}
      </Suspense>
    </TaskPageLayout>
  );
}
