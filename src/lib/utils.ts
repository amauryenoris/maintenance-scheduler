import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addMinutes, parseISO } from 'date-fns';
import type { Service } from './database.types';

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatTime(time: string | Date): string {
  if (typeof time === 'string') {
    return time.substring(0, 5);
  }
  return format(time, 'HH:mm');
}

export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function parseTime(timeStr: string): Date {
  return parse(timeStr, 'HH:mm', new Date());
}

export function addMinutesToTime(timeStr: string, minutes: number): string {
  const time = parseTime(timeStr);
  const newTime = addMinutes(time, minutes);
  return format(newTime, 'HH:mm');
}

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}

export function calculateWeeklyHours(services: Service[], weekStart: Date): number {
  const { start, end } = getWeekRange(weekStart);
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  const weekServices = services.filter(
    (s) => s.service_date >= startStr && s.service_date <= endStr && s.status !== 'canceled'
  );

  return weekServices.reduce((total, service) => {
    return total + service.duration_minutes / 60;
  }, 0);
}

export function calculateDailyHours(services: Service[], date: Date): number {
  const dateStr = formatDate(date);
  const dayServices = services.filter((s) => s.service_date === dateStr && s.status !== 'canceled');

  return dayServices.reduce((total, service) => {
    return total + service.duration_minutes / 60;
  }, 0);
}

export function countDailyServices(services: Service[], date: Date): number {
  const dateStr = formatDate(date);
  return services.filter(
    (s) => s.service_date === dateStr && !s.is_lunch_block && s.status !== 'canceled'
  ).length;
}

export function countWeeklyServices(services: Service[], weekStart: Date): number {
  const { start, end } = getWeekRange(weekStart);
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  return services.filter(
    (s) =>
      s.service_date >= startStr &&
      s.service_date <= endStr &&
      !s.is_lunch_block &&
      s.status !== 'canceled'
  ).length;
}

export function countMonthlyServices(services: Service[], date: Date): { completed: number; total: number } {
  const { start, end } = getMonthRange(date);
  const startStr = formatDate(start);
  const endStr = formatDate(end);

  const monthServices = services.filter(
    (s) => s.service_date >= startStr && s.service_date <= endStr && !s.is_lunch_block && s.status !== 'canceled'
  );

  const completed = monthServices.filter((s) => s.status === 'completed').length;

  return { completed, total: monthServices.length };
}

export function getServiceColor(service: Service): string {
  if (service.is_lunch_block) return '#E5E7EB';
  if (service.type === 'emergency' || service.priority === 'emergency') return '#EF4444';
  if (service.status === 'rescheduled') return '#F97316';
  if (service.type === 'recurring') return '#8B5CF6';
  return '#3B82F6';
}

export function getServiceIcon(service: Service): string {
  if (service.is_lunch_block) return '🍽️';
  if (service.type === 'emergency' || service.priority === 'emergency') return '🚨';
  if (service.type === 'recurring') return '🔁';
  return '🔧';
}

export function getStatusBadgeColor(status: Service['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'rescheduled':
      return 'bg-orange-100 text-orange-800';
    case 'canceled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export function getZoneColor(zone: string): string {
  const colors: Record<string, string> = {
    north: '#10B981',
    south: '#F59E0B',
    east: '#8B5CF6',
    west: '#EC4899',
    downtown: '#3B82F6',
    other: '#6B7280',
  };
  return colors[zone] || colors.other;
}

export function getZoneInitial(zone: string): string {
  return zone.charAt(0).toUpperCase();
}

export function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function findTimeSlotSuggestions(
  services: Service[],
  originalDate: Date,
  durationMinutes: number,
  preferredZone?: string,
  originalTime?: string
): Array<{
  date: string;
  time: string;
  score: number;
  category: 'optimal' | 'good' | 'acceptable';
  serviceCount: number;
  weekHours: number;
  daysFromOriginal: number;
  sameZone: boolean;
}> {
  const suggestions: Array<{
    date: string;
    time: string;
    score: number;
    category: 'optimal' | 'good' | 'acceptable';
    serviceCount: number;
    weekHours: number;
    daysFromOriginal: number;
    sameZone: boolean;
  }> = [];

  const workStart = 7 * 60;
  const workEnd = 18 * 60;
  const lunchStart = 12 * 60;
  const lunchEnd = 13 * 60;
  const maxWeeklyHours = 50;

  let currentDate = new Date(originalDate);
  currentDate.setDate(currentDate.getDate() + 1);

  let daysChecked = 0;
  const maxDaysToCheck = 30;

  while (suggestions.length < 3 && daysChecked < maxDaysToCheck) {
    const dayOfWeek = currentDate.getDay();
    const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekendDay || !isWeekday(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
      continue;
    }

    const dateStr = formatDate(currentDate);
    const dayServices = services.filter((s) => s.service_date === dateStr && s.status !== 'canceled');
    const serviceCount = dayServices.filter((s) => !s.is_lunch_block).length;

    if (serviceCount >= 5) {
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
      continue;
    }

    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const currentWeekHours = calculateWeeklyHours(services, weekStart);
    const newWeekHours = currentWeekHours + (durationMinutes / 60);

    if (newWeekHours > maxWeeklyHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
      continue;
    }

    const preferredStartTime = originalTime ? timeToMinutes(originalTime) : 9 * 60;
    const timeSlots = [preferredStartTime];

    for (let t = workStart; t + durationMinutes <= workEnd; t += 60) {
      if (!timeSlots.includes(t) && t !== preferredStartTime) {
        timeSlots.push(t);
      }
    }

    for (const startMinutes of timeSlots) {
      const endMinutes = startMinutes + durationMinutes;

      if (endMinutes > workEnd) continue;

      if (
        (startMinutes >= lunchStart && startMinutes < lunchEnd) ||
        (endMinutes > lunchStart && endMinutes <= lunchEnd)
      ) {
        continue;
      }

      const hasConflict = dayServices.some((s) => {
        const serviceStart = timeToMinutes(s.start_time);
        const serviceEnd = serviceStart + s.duration_minutes;

        return (
          (startMinutes >= serviceStart && startMinutes < serviceEnd) ||
          (endMinutes > serviceStart && endMinutes <= serviceEnd) ||
          (startMinutes <= serviceStart && endMinutes >= serviceEnd)
        );
      });

      if (!hasConflict) {
        let score = 100;
        let category: 'optimal' | 'good' | 'acceptable' = 'acceptable';

        if (serviceCount <= 2) {
          score += 30;
          category = 'optimal';
        } else if (serviceCount === 3) {
          score += 15;
          category = 'good';
        }

        const daysFromOriginal = Math.floor((currentDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysFromOriginal === 1) score += 25;
        else if (daysFromOriginal <= 3) score += 15;
        else if (daysFromOriginal <= 7) score += 5;
        else score -= (daysFromOriginal - 7) * 2;

        if (currentWeekHours < 40) score += 10;
        else if (currentWeekHours > 45) score -= 15;

        const sameZoneServices = dayServices.filter((s) => s.zone === preferredZone && !s.is_lunch_block);
        const sameZone = preferredZone ? sameZoneServices.length > 0 : false;
        if (sameZone) score += 20;

        if (originalTime && Math.abs(startMinutes - timeToMinutes(originalTime)) < 120) {
          score += 15;
        }

        suggestions.push({
          date: dateStr,
          time: minutesToTime(startMinutes),
          score,
          category,
          serviceCount,
          weekHours: newWeekHours,
          daysFromOriginal,
          sameZone,
        });

        break;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
    daysChecked++;
  }

  const sortedSuggestions = suggestions.sort((a, b) => {
    if (a.category !== b.category) {
      const order = { optimal: 0, good: 1, acceptable: 2 };
      return order[a.category] - order[b.category];
    }
    return b.score - a.score;
  });

  return sortedSuggestions.slice(0, 3);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function canRescheduleService(service: Service): boolean {
  if (service.status === 'completed') {
    return false;
  }

  if (service.is_lunch_block) {
    return false;
  }

  if (service.status === 'in_progress') {
    return false;
  }

  return true;
}

export function getAvailableActions(service: Service): {
  canReschedule: boolean;
  canMarkCompleted: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddNotes: boolean;
} {
  const isLunch = service.is_lunch_block;

  switch (service.status) {
    case 'completed':
      return {
        canReschedule: false,
        canMarkCompleted: false,
        canEdit: true,
        canDelete: true,
        canAddNotes: true,
      };

    case 'in_progress':
      return {
        canReschedule: false,
        canMarkCompleted: true,
        canEdit: true,
        canDelete: false,
        canAddNotes: true,
      };

    case 'canceled':
      return {
        canReschedule: false,
        canMarkCompleted: false,
        canEdit: true,
        canDelete: true,
        canAddNotes: true,
      };

    case 'scheduled':
    case 'rescheduled':
    default:
      return {
        canReschedule: !isLunch,
        canMarkCompleted: !isLunch,
        canEdit: true,
        canDelete: true,
        canAddNotes: !isLunch,
      };
  }
}

export function validateReschedule(service: Service): { valid: boolean; error?: string; suggestion?: string } {
  if (service.status === 'completed') {
    return {
      valid: false,
      error: 'Cannot reschedule completed services',
      suggestion: 'Create a new service instead',
    };
  }

  if (service.is_lunch_block) {
    return {
      valid: false,
      error: 'Lunch breaks use a different rescheduling flow',
      suggestion: 'Click on lunch break to move it within the same day',
    };
  }

  if (service.status === 'in_progress') {
    return {
      valid: false,
      error: 'Cannot reschedule services in progress',
      suggestion: 'Complete or cancel the service first',
    };
  }

  return { valid: true };
}
