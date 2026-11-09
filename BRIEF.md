# Brief: Mini kanban board, a Next.js interactive app demo

## The idea
The idea is to build a demo project exploring what modern Next.js offers for building highly interactive apps.
The app we're building is a taskboard/kanban board style app, with limited functionality but enough to exercise the core interactivity features end to end,
including but not limited to: useOptimistic instant UI updates, useTransition, suspense boundaries, action props, useActionState, data-pending, and more as needed.
I've been reading through the Next.js and React docs and want to lean on the patterns they recommend for interactivity, optimistic updates, transitions, streaming, caching etc.
so most of the app should be built the "modern Next.js way" instead of reaching for extra client state libraries.

## What it should do
In general, our app should have these features and functionality:
- Ability to create new tasks
  - Task properties: title, description, status, priority, assignee, labels/tags (these will be filter pills above the board)
- ability to drag and drop tasks between columns
- ability to add comments to tasks, optimistically so they show up instantly
- task priority cycling optimistically (click the priority and it cycles to the next one instantly)
- The UI should be responsive, and with ability to change between light (default) and dark themes
- I want a UI that is pixel perfect professional, clean, premium looking, inspired by Jira's kanban board, on desktop it should show all the columns stacked horizontally and work as a traditional kanban board. On small screens (mobile 1 breakpoint only) show 1 column at a time only, with tab like pills above the column to switch statuses (status pills must be distinguishable from the label/tag filter pills), also it would be nice that users could swipe left/right to switch to the neighbour column (carousel like), users would start the swipe gesture to either side and the neighbouring column would start appearing and it would auto center on the next column, similar to shadcn/ui's carousel first example at https://ui.shadcn.com/docs/components/base/carousel
- For the demo no login is required, whoever goes to the app can interact with the one board.
- Because any user can interact with the board we need anti race condition mechanisms where needed, the priority cycling for instance, could use a row lock so two users clicking at the same time can't corrupt the value.
- Concurrent moves, edits and comments must also behave predictably.

Extra functionality/nice to haves:
- Ability to set order of how the tasks appear in each column via drag and drop (Jira style)
- When dragging a task from one column to the other, user should be able to place the task in the order they want, and a visual indicator should appear where the task will be dropped (Jira style)
- Other low-cost features that add polish (TBD)


## Unsure about / thoughts
- Drag and drop library, shadcn/ui's drag and drop or plain native html drag and drop doesn't seem to have way to drop task in the user's desired order, so maybe we can use Jira/Atlassian drag and drop library.
- Would the drag and drop work across columns in the mobile view if we have a carousel like switch-between-columns implementation?
- How would 2 users editing the same task at the same time edge case be handled? should we allow for tasks descriptions to be edited?
- What other concurrency or mobile edge cases exist?

## Tech stack (desired)
- Next.js
- Postgres
- Prisma ORM
- Vercel deployments
- shadcn/ui components for UI where possible

## Constraints
Use free tier services where possible
