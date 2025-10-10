'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
  enabled: boolean;
}

interface AvailabilityDay {
  date: string;
  timeSlots: TimeSlot[];
}

interface AdminAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  onAvailabilitySet: (availability: AvailabilityDay[]) => void;
}

const TIME_SLOTS = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
  '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
];

export default function AdminAvailabilityModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  onAvailabilitySet
}: AdminAvailabilityModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availability, setAvailability] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing availability
  useEffect(() => {
    if (isOpen) {
      loadAvailability();
    }
  }, [isOpen, projectId]);

  const loadAvailability = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/availability?admin_email=${encodeURIComponent('lwhitworth@ngicapitaladvisory.com')}`);
      if (response.ok) {
        const data = await response.json();
        // Convert API data to our format
        const availabilityMap = new Map<string, TimeSlot[]>();
        
        data.availability.forEach((slot: any) => {
          const date = new Date(slot.start_ts).toISOString().split('T')[0];
          if (!availabilityMap.has(date)) {
            availabilityMap.set(date, []);
          }
          
          const startTime = new Date(slot.start_ts).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          const endTime = new Date(slot.end_ts).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          availabilityMap.get(date)!.push({
            id: `${date}-${startTime}`,
            start: startTime,
            end: endTime,
            enabled: true
          });
        });
        
        const availabilityArray = Array.from(availabilityMap.entries()).map(([date, timeSlots]) => ({
          date,
          timeSlots
        }));
        
        setAvailability(availabilityArray);
      }
    } catch (error) {
      console.error('Failed to load availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateDay = (date: Date): AvailabilityDay => {
    const dateStr = date.toISOString().split('T')[0];
    const existing = availability.find(day => day.date === dateStr);
    
    if (existing) {
      return existing;
    }
    
    return {
      date: dateStr,
      timeSlots: []
    };
  };

  const addTimeSlot = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const day = getOrCreateDay(date);
    
    const newSlot: TimeSlot = {
      id: `${dateStr}-${Date.now()}`,
      start: '9:00 AM',
      end: '10:00 AM',
      enabled: true
    };
    
    const updatedAvailability = availability.map(d => 
      d.date === dateStr 
        ? { ...d, timeSlots: [...d.timeSlots, newSlot] }
        : d
    );
    
    if (!availability.find(d => d.date === dateStr)) {
      updatedAvailability.push({ ...day, timeSlots: [...day.timeSlots, newSlot] });
    }
    
    setAvailability(updatedAvailability);
  };

  const updateTimeSlot = (date: Date, slotId: string, field: keyof TimeSlot, value: any) => {
    const dateStr = date.toISOString().split('T')[0];
    setAvailability(prev => prev.map(day => 
      day.date === dateStr 
        ? {
            ...day,
            timeSlots: day.timeSlots.map(slot =>
              slot.id === slotId ? { ...slot, [field]: value } : slot
            )
          }
        : day
    ));
  };

  const removeTimeSlot = (date: Date, slotId: string) => {
    const dateStr = date.toISOString().split('T')[0];
    setAvailability(prev => prev.map(day => 
      day.date === dateStr 
        ? {
            ...day,
            timeSlots: day.timeSlots.filter(slot => slot.id !== slotId)
          }
        : day
    ));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      // Convert our format to API format
      const apiSlots = availability.flatMap(day => 
        day.timeSlots.filter(slot => slot.enabled).map(slot => {
          const startDateTime = new Date(`${day.date}T${slot.start.replace(' ', '')}`);
          const endDateTime = new Date(`${day.date}T${slot.end.replace(' ', '')}`);
          
          return {
            start_ts: startDateTime.toISOString(),
            end_ts: endDateTime.toISOString(),
            slot_len_min: 60 // Default 1 hour slots
          };
        })
      );

      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_email: 'lwhitworth@ngicapitaladvisory.com',
          availability: apiSlots
        }),
      });

      if (response.ok) {
        onAvailabilitySet(availability);
        onClose();
      } else {
        console.error('Failed to save availability');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const currentDay = selectedDate ? getOrCreateDay(selectedDate) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Interview Availability</DialogTitle>
          <DialogDescription>
            Set your available interview times for {projectName}. Students will be able to book from these slots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Calendar Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                disabled={(date) => date < new Date()}
              />
            </CardContent>
          </Card>

          {/* Time Slots for Selected Date */}
          {selectedDate && currentDay && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Time Slots for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                  </CardTitle>
                  <Button
                    onClick={() => addTimeSlot(selectedDate)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Time Slot
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {currentDay.timeSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No time slots set for this date. Click "Add Time Slot" to get started.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentDay.timeSlots.map((slot) => (
                      <div key={slot.id} className="flex items-center gap-4 p-3 border rounded-lg">
                        <Checkbox
                          checked={slot.enabled}
                          onCheckedChange={(checked) => 
                            updateTimeSlot(selectedDate, slot.id, 'enabled', checked)
                          }
                        />
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">From:</Label>
                          <select
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(selectedDate, slot.id, 'start', e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">To:</Label>
                          <select
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(selectedDate, slot.id, 'end', e.target.value)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            {TIME_SLOTS.map(time => (
                              <option key={time} value={time}>{time}</option>
                            ))}
                          </select>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(selectedDate, slot.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Availability Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availability.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-medium">
                      {format(new Date(day.date), 'EEEE, MMMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {day.timeSlots.filter(slot => slot.enabled).length} slots
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {day.timeSlots.filter(slot => slot.enabled).map(slot => 
                          `${slot.start} - ${slot.end}`
                        ).join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
                {availability.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No availability set yet. Select a date and add time slots.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveAvailability} disabled={saving}>
            {saving ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Availability
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
