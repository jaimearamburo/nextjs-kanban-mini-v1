import { TaskNotFound } from "@/components/task/task-not-found";
import { TaskPageLayout } from "@/components/task/task-page-layout";

export default function TaskPageNotFound() {
  return (
    <TaskPageLayout>
      <TaskNotFound view="page" />
    </TaskPageLayout>
  );
}
