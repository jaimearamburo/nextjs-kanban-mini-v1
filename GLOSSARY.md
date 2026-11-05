# Kanban Mini

A single, public, login-free kanban board where anyone can create and move tasks together in real time.

## Board and work

**Board**:
The one shared kanban board. Every visitor sees and changes the same Board.
_Avoid_: Project, workspace

**Task**:
A unit of work on the Board, with a title, description, Status, Priority, Assignee and Labels.
_Avoid_: Issue, ticket, card (a card is only the visual of a Task)

**Status**:
Where a Task is in the workflow: To Do, In Progress, In Review or Done. The set is fixed. Each Status is shown as one column.
_Avoid_: Column (as a data concept), state, stage

**Rank**:
A Task's position relative to the other Tasks in the same Status.
_Avoid_: Order, index, position

**Label**:
A tag from a fixed, coloured set (Frontend, Backend, Bug, Design, Docs, Infra) attached to Tasks and used to filter the Board.
_Avoid_: Tag, category

**Label Filter**:
The set of Labels currently selected on the Board. A Task is shown if it has any of them.
_Avoid_: Search (text search is a separate thing)

**Archived Task**:
A Task removed from the Board but kept. Tasks are archived, never deleted.
_Avoid_: Deleted task

## People

**Guest**:
A visitor's anonymous identity, a generated creative name (e.g. "Guest Otter") with an avatar colour, remembered per browser. Guests perform all actions.
_Avoid_: User, account, member

**Team Member**:
One of a fixed roster of fictional people a Task can be assigned to. A Team Member is never a Guest.
_Avoid_: User, assignee (as a noun for the person)

**Assignee**:
The Team Member a Task is assigned to, if any.

## Collaboration

**Comment**:
A Guest's message on a Task. Any Guest can delete any Comment.
_Avoid_: Note, reply

**Activity**:
A record of a meaningful change to a Task (a field change, or a Comment added or deleted) and the Guest who made it. Reordering a Task within its Status is not Activity.
_Avoid_: History, log, event

**Archived Comment**:
A deleted Comment. It disappears from the Task but is kept.
_Avoid_: Deleted comment
