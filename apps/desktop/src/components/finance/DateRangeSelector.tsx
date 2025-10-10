'use client';

import * as React from 'react';
import { format, subMonths, subYears, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type PresetRange = {
  label: string;
  range: DateRange;
};

interface DateRangeSelectorProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

export function DateRangeSelector({ value, onChange, className }: DateRangeSelectorProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(value);

  // Preset ranges
  const presets: PresetRange[] = React.useMemo(() => {
    const now = new Date();
    return [
      {
        label: 'Last 30 Days',
        range: { from: subMonths(now, 1), to: now },
      },
      {
        label: 'Last 3 Months',
        range: { from: subMonths(now, 3), to: now },
      },
      {
        label: 'Last 6 Months',
        range: { from: subMonths(now, 6), to: now },
      },
      {
        label: 'Last 12 Months',
        range: { from: subMonths(now, 12), to: now },
      },
      {
        label: 'Year to Date',
        range: { from: new Date(now.getFullYear(), 0, 1), to: now },
      },
      {
        label: 'Last Year',
        range: {
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31),
        },
      },
    ];
  }, []);

  const handlePresetSelect = (label: string) => {
    const preset = presets.find((p) => p.label === label);
    if (preset) {
      setDate(preset.range);
      onChange(preset.range);
    }
  };

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onChange(newDate);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Preset Selector */}
      <Select onValueChange={handlePresetSelect}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select period" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.label} value={preset.label}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Custom Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Helper function to calculate percentage change
export function calculatePercentChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// Helper function to format the date range for display
export function formatDateRange(range?: DateRange): string {
  if (!range?.from) return 'Select period';
  if (!range.to) return format(range.from, 'LLL dd, y');
  return `${format(range.from, 'LLL dd, y')} - ${format(range.to, 'LLL dd, y')}`;
}

