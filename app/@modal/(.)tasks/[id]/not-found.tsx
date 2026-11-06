import { TaskModal } from "@/components/task/task-modal";
import { TaskNotFound } from "@/components/task/task-not-found";

export default function TaskModalNotFound() {
  return (
    <TaskModal>
      <TaskNotFound view="modal" />
    </TaskModal>
  );
}
