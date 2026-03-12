import { useState } from "react";
import { subDays, startOfDay, startOfMonth, startOfYear, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateRange = { from: Date | undefined; to: Date | undefined };

const presets = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "This Year", value: "year" },
  { label: "All Time", value: "all" },
] as const;

function getPresetRange(preset: string): DateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: now };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: now };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: now };
    case "90d":
      return { from: startOfDay(subDays(now, 89)), to: now };
    case "year":
      return { from: startOfYear(now), to: now };
    case "all":
    default:
      return { from: undefined, to: undefined };
  }
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<string>("all");

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    onChange(getPresetRange(preset));
  };

  const handleCustomDate = (range: { from?: Date; to?: Date } | undefined) => {
    setActivePreset("custom");
    onChange({ from: range?.from, to: range?.to });
  };

  const label =
    value.from && value.to
      ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`
      : value.from
      ? `${format(value.from, "MMM d, yyyy")} –`
      : "All Time";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={activePreset === p.value ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs px-3"
          onClick={() => handlePreset(p.value)}
        >
          {p.label}
        </Button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activePreset === "custom" ? "default" : "outline"}
            size="sm"
            className={cn("h-8 text-xs px-3 gap-1.5")}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {activePreset === "custom" ? label : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value.from ? { from: value.from, to: value.to } : undefined}
            onSelect={handleCustomDate}
            numberOfMonths={2}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Helper to filter an array of records by a date field within the range */
export function filterByDateRange<T>(
  items: T[],
  range: DateRange,
  getDate: (item: T) => Date | string
): T[] {
  if (!range.from && !range.to) return items;
  return items.filter((item) => {
    const d = new Date(getDate(item));
    if (range.from && d < range.from) return false;
    if (range.to) {
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }
    return true;
  });
}
