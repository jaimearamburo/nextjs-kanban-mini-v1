import { Suspense } from "react";
import { CreateTask, CreateTaskSkeleton } from "@/components/task/create-task";
import { TaskModal } from "@/components/task/task-modal";

/** The create form opened from the Board: intercepted and shown as a modal over it. */
export default function NewTaskModalPage({ searchParams }: PageProps<"/tasks/new">) {
  return (
    <TaskModal>
      <Suspense fallback={<CreateTaskSkeleton />}>
        <CreateTask view="modal" searchParams={searchParams} />
      </Suspense>
    </TaskModal>
  );
}
