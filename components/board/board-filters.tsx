"use client";

import type { Label } from "@/lib/board/domain";
import { useBoardUrl } from "./board-url";
import { LabelFilter } from "./label-filter";
import { TaskSearch } from "./task-search";

/** Text search and the Label Filter, sharing one view of the Board URL. */
export function BoardFilters({
  labels,
  selected,
  q,
}: {
  labels: Label[];
  selected: string[];
  q: string;
}) {
  const boardUrl = useBoardUrl();
  return (
    <>
      <TaskSearch q={q} boardUrl={boardUrl} />
      <LabelFilter labels={labels} selected={selected} boardUrl={boardUrl} />
    </>
  );
}
