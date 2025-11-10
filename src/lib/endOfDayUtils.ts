import { startOfDay, isSameDay, format } from 'date-fns';
import type { Service } from './database.types';

export function checkEndOfDayPendingServices(
  services: Service[],
  alertHour: number = 17
): Service[] {
  const now = new Date();
  const today = startOfDay(now);
  const currentHour = now.getHours();

  if (currentHour < alertHour) {
    return [];
  }

  const todayServices = services.filter(service => {
    const serviceDate = startOfDay(new Date(service.service_date));
    return (
      isSameDay(serviceDate, today) &&
      !service.is_lunch_block &&
      service.status !== 'completed' &&
      service.status !== 'canceled'
    );
  });

  return todayServices;
}

export function hasSeenAlertToday(): boolean {
  const dismissedDate = localStorage.getItem('endOfDayAlertDismissed');
  if (!dismissedDate) return false;

  const today = format(new Date(), 'yyyy-MM-dd');
  return dismissedDate === today;
}

export function markAlertSeenToday(): void {
  localStorage.setItem('endOfDayAlertDismissed', format(new Date(), 'yyyy-MM-dd'));
}

export function clearAlertSeenToday(): void {
  localStorage.removeItem('endOfDayAlertDismissed');
}

export function getDailyCompletionRate(services: Service[], date: Date): number {
  const dayServices = services.filter(s => {
    const serviceDate = startOfDay(new Date(s.service_date));
    return isSameDay(serviceDate, date) && !s.is_lunch_block;
  });

  if (dayServices.length === 0) return 100;

  const completed = dayServices.filter(s => s.status === 'completed').length;
  return (completed / dayServices.length) * 100;
}

export function getTodayPendingCount(services: Service[]): number {
  const today = startOfDay(new Date());

  return services.filter(service => {
    const serviceDate = startOfDay(new Date(service.service_date));
    return (
      isSameDay(serviceDate, today) &&
      !service.is_lunch_block &&
      service.status !== 'completed' &&
      service.status !== 'canceled'
    );
  }).length;
}
