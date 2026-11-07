"use client";

import { Gauge } from "lucide-react";
import { useId, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { DemoSettings, Failure, Latency } from "@/lib/demo/demo-controls";
import { updateDemoSettings } from "@/lib/demo/actions";

const latencyOptions: { value: Latency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "1s", label: "1s" },
  { value: "3s", label: "3s" },
];

const failureOptions: { value: Failure; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "random", label: "30% random" },
  { value: "always", label: "Always" },
];

/** Header popover for this browser's added latency and forced failures. */
export function DemoControlsPopover({ settings }: { settings: DemoSettings }) {
  const [optimistic, setOptimistic] = useOptimistic(settings);
  const [, startTransition] = useTransition();
  const active = optimistic.latency !== "off" || optimistic.failure !== "off";

  function change(patch: Partial<DemoSettings>) {
    const next = { ...optimistic, ...patch };
    startTransition(async () => {
      setOptimistic(next);
      await updateDemoSettings(next);
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="sm" className="relative">
            <Gauge aria-hidden />
            <span className="max-sm:sr-only">Demo controls</span>
            {active && (
              <>
                <span
                  aria-hidden
                  className="absolute top-1 right-1 size-1.5 rounded-full bg-amber-500"
                />
                <span className="sr-only"> (active)</span>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64 gap-4">
        <PopoverHeader>
          <PopoverTitle>Demo controls</PopoverTitle>
          <PopoverDescription>
            Delays or fails database writes only, like Priority changes, to
            show optimistic updates and rollbacks.
          </PopoverDescription>
        </PopoverHeader>
        <Choice
          legend="Latency"
          options={latencyOptions}
          value={optimistic.latency}
          onChange={(latency) => change({ latency })}
        />
        <Choice
          legend="Failures"
          options={failureOptions}
          value={optimistic.failure}
          onChange={(failure) => change({ failure })}
        />
      </PopoverContent>
    </Popover>
  );
}

function Choice<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={id} className="text-xs font-medium text-muted-foreground">
        {legend}
      </span>
      <RadioGroup
        aria-labelledby={id}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-1.5 text-sm"
          >
            <RadioGroupItem value={option.value} />
            {option.label}
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
