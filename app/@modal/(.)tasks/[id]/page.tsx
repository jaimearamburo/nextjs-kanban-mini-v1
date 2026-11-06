import { Suspense } from "react";
import { TaskDetail } from "@/components/task/task-detail";
import { TaskDetailSkeleton } from "@/components/task/task-detail-skeleton";
import { TaskModal } from "@/components/task/task-modal";

/** A Task opened from the Board: intercepted and shown as a modal over it. */
export default function TaskModalPage({ params }: PageProps<"/tasks/[id]">) {
  return (
    <TaskModal>
      <Suspense fallback={<TaskDetailSkeleton view="modal" />}>
        {params.then(({ id }) => (
          <TaskDetail id={id} view="modal" />
        ))}
      </Suspense>
    </TaskModal>
  );
}
