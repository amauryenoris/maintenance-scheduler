import { format, isSameDay, parse, setHours, setMinutes, addHours, isWithinInterval } from 'date-fns';
import type { Service } from './database.types';

export interface LunchBreakConflict {
  service: Service;
  message: string;
}

export interface LunchBreakSuggestion {
  time: string;
  label: string;
  conflicts: boolean;
}

export const DEFAULT_LUNCH_TIME = '12:00';
export const LUNCH_DURATION_MINUTES = 60;

export function createDefaultLunchBreak(date: Date, lunchTime: string = DEFAULT_LUNCH_TIME): Partial<Service> {
  const [hours, minutes] = lunchTime.split(':').map(Number);
  const dateStr = format(date, 'yyyy-MM-dd');

  return {
    type: 'scheduled_maintenance',
    client_name: 'Lunch Break',
    dishwasher_model: 'N/A',
    service_date: dateStr,
    start_time: lunchTime,
    duration_minutes: LUNCH_DURATION_MINUTES,
    zone: 'other',
    address: 'N/A',
    status: 'scheduled',
    priority: 'normal',
    is_lunch_block: true,
    notes: 'Daily lunch break',
  };
}

export function isLunchBreak(service: Service): boolean {
  return service.is_lunch_block === true;
}

export function validateLunchMove(
  currentService: Service,
  newStartTime: string,
  newDate: Date
): { valid: boolean; error?: string } {
  const currentDate = new Date(currentService.service_date);

  if (!isSameDay(currentDate, newDate)) {
    return {
      valid: false,
      error: 'Lunch break must stay on the same day',
    };
  }

  const [hours, minutes] = newStartTime.split(':').map(Number);
  if (hours < 7 || hours >= 18) {
    return {
      valid: false,
      error: 'Lunch break must be within work hours (7:00 AM - 6:00 PM)',
    };
  }

  return { valid: true };
}

export function checkLunchConflicts(
  newStartTime: string,
  date: string,
  allServices: Service[],
  excludeServiceId?: string
): LunchBreakConflict[] {
  const conflicts: LunchBreakConflict[] = [];

  const [lunchHours, lunchMinutes] = newStartTime.split(':').map(Number);
  const lunchStart = lunchHours * 60 + lunchMinutes;
  const lunchEnd = lunchStart + LUNCH_DURATION_MINUTES;

  const servicesOnDay = allServices.filter(
    s => s.service_date === date && !s.is_lunch_block && s.id !== excludeServiceId
  );

  for (const service of servicesOnDay) {
    const [serviceHours, serviceMinutes] = service.start_time.split(':').map(Number);
    const serviceStart = serviceHours * 60 + serviceMinutes;
    const serviceEnd = serviceStart + service.duration_minutes;

    const overlaps =
      (lunchStart >= serviceStart && lunchStart < serviceEnd) ||
      (lunchEnd > serviceStart && lunchEnd <= serviceEnd) ||
      (lunchStart <= serviceStart && lunchEnd >= serviceEnd);

    if (overlaps) {
      conflicts.push({
        service,
        message: `Overlaps with ${service.client_name} (${service.start_time})`,
      });
    }
  }

  return conflicts;
}

export function suggestLunchTimes(
  date: string,
  allServices: Service[],
  excludeServiceId?: string
): LunchBreakSuggestion[] {
  const commonTimes = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'];

  return commonTimes.map(time => {
    const conflicts = checkLunchConflicts(time, date, allServices, excludeServiceId);
    return {
      time,
      label: formatTimeLabel(time),
      conflicts: conflicts.length > 0,
    };
  });
}

export function findBestLunchTime(
  date: string,
  allServices: Service[],
  preferredTime: string = DEFAULT_LUNCH_TIME
): string {
  const conflicts = checkLunchConflicts(preferredTime, date, allServices);

  if (conflicts.length === 0) {
    return preferredTime;
  }

  const suggestions = suggestLunchTimes(date, allServices);
  const availableSlot = suggestions.find(s => !s.conflicts);

  return availableSlot ? availableSlot.time : preferredTime;
}

export function formatTimeLabel(time24: string): string {
  try {
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return format(date, 'h:mm a');
  } catch {
    return time24;
  }
}

export function shouldAutoCreateLunchBreak(
  date: string,
  allServices: Service[]
): boolean {
  const servicesOnDay = allServices.filter(s => s.service_date === date);

  const hasLunch = servicesOnDay.some(s => s.is_lunch_block);
  if (hasLunch) return false;

  const hasRegularServices = servicesOnDay.some(s => !s.is_lunch_block);
  return hasRegularServices;
}

export function getTimeOptions(): string[] {
  const times: string[] = [];
  for (let hour = 7; hour < 18; hour++) {
    times.push(`${hour.toString().padStart(2, '0')}:00`);
    times.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return times;
}

export function calculateEndTime(startTime: string): string {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + 1;
    return `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch {
    return startTime;
  }
}
