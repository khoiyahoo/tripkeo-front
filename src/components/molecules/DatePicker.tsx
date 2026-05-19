import { format, isValid, parse } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // ISO date string YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string; // ISO date string YYYY-MM-DD
  maxDate?: string;
  id?: string;
  className?: string;
}

function parseDateStr(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

export const DatePicker = ({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled = false,
  minDate,
  maxDate,
  id,
  className,
}: DatePickerProps) => {
  const [open, setOpen] = useState(false);

  const selectedDate = parseDateStr(value);
  const minDateObj = parseDateStr(minDate ?? "");
  const maxDateObj = parseDateStr(maxDate ?? "");

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("");
      return;
    }
    const formatted = format(date, "yyyy-MM-dd");
    onChange(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-start gap-2 border-outline-variant bg-surface-dim px-4 font-normal text-sm",
            !value && "text-secondary-400",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-on-surface-variant" />
          {selectedDate ? (
            <span className="text-on-surface">
              {format(selectedDate, "dd/MM/yyyy")}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate ?? minDateObj}
          locale={vi}
          disabled={(date) => {
            if (minDateObj && date < minDateObj) return true;
            if (maxDateObj && date > maxDateObj) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
