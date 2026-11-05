# Nothing is hard-deleted: Tasks and Comments are archived

The Board is public and needs no login, so any visitor could destroy content. Nothing a Guest does removes data permanently.

- **Tasks** have no delete. If removal is ever added, it will archive the Task, keeping it in the database so it can be restored.
- **Comments** can be deleted by any Guest, not only their author. A delete archives the Comment: it disappears from the Task but stays in the database.

Leaving a Task delete button out, and keeping deleted Comments in the database, are both deliberate.
