import { startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, format, getDay, addDays, startOfWeek, endOfWeek } from 'date-fns';
import type { ServiceInsert } from './database.types';

export interface CSVRow {
  'Account Name': string;
  'Account Number': string;
  'Address': string;
  'Customer Site': string;
}

export interface ImportClient {
  clientName: string;
  accountNumber?: string;
  address: string;
  siteName?: string;
  selected: boolean;
  visitsPerMonth: number;
  preferredDay?: number;
  duration: number;
  zone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other';
  isRecurring: boolean;
  fixedDayOfWeek?: number;
  fixedTime?: string;
  dishwasherModel: string;
}

export interface DistributionSettings {
  visitsPerMonth: number;
  preferredDay?: number;
  defaultDuration: number;
  defaultZone: 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other' | 'auto';
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    if (row['Account Name']) {
      rows.push(row as CSVRow);
    }
  }

  return rows;
}

export function detectCheesecakeFactory(clientName: string): boolean {
  return clientName.toUpperCase().includes('CHEESECAKE FACTORY');
}

export function autoDetectZone(address: string): 'north' | 'south' | 'east' | 'west' | 'downtown' | 'other' {
  const addr = address.toLowerCase();

  if (addr.includes('downtown') || addr.includes('main st') || addr.includes('center')) {
    return 'downtown';
  }
  if (addr.includes('north')) return 'north';
  if (addr.includes('south')) return 'south';
  if (addr.includes('east')) return 'east';
  if (addr.includes('west')) return 'west';

  return 'other';
}

export function getWorkDaysOfMonth(month: Date): Date[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const allDays = eachDayOfInterval({ start, end });

  return allDays.filter(day => !isWeekend(day));
}

export function getWeeksInMonth(month: Date): Date[][] {
  const workDays = getWorkDaysOfMonth(month);
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  workDays.forEach((day, index) => {
    const dayOfWeek = getDay(day);

    if (dayOfWeek === 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push(day);

    if (index === workDays.length - 1) {
      weeks.push(currentWeek);
    }
  });

  return weeks;
}

export function getSpecificDayOfWeek(week: Date[], targetDay: number): Date | null {
  return week.find(day => getDay(day) === targetDay) || null;
}

export function calculateTimeSlot(serviceCount: number): string {
  const slots = ['08:00', '10:00', '13:00', '15:00'];
  return slots[serviceCount] || '09:00';
}

export function findLeastBusyDay(workDays: Date[], dailyServiceCount: Record<string, number>): Date {
  let leastBusyDay = workDays[0];
  let minServices = dailyServiceCount[format(workDays[0], 'yyyy-MM-dd')] || 0;

  for (const day of workDays) {
    const dateKey = format(day, 'yyyy-MM-dd');
    const serviceCount = dailyServiceCount[dateKey] || 0;

    if (serviceCount < minServices && serviceCount < 4) {
      minServices = serviceCount;
      leastBusyDay = day;
    }
  }

  return leastBusyDay;
}

export interface DistributionResult {
  services: ServiceInsert[];
  summary: {
    totalVisits: number;
    clientsImported: number;
    recurringClients: number;
    averageServicesPerDay: number;
    maxDayExceeded: boolean;
    maxWeekExceeded: boolean;
    warnings: string[];
  };
}

export function distributeVisits(
  clients: ImportClient[],
  month: Date,
  settings: { max_daily_services: number; max_weekly_hours: number }
): DistributionResult {
  const workDays = getWorkDaysOfMonth(month);
  const dailyServiceCount: Record<string, number> = {};
  const services: ServiceInsert[] = [];
  const warnings: string[] = [];
  let totalHours = 0;

  const recurringClients = clients.filter(c => c.isRecurring);
  const regularClients = clients.filter(c => !c.isRecurring && c.selected);

  recurringClients.forEach(client => {
    const weeks = getWeeksInMonth(month);

    weeks.forEach(week => {
      const targetDay = getSpecificDayOfWeek(week, client.fixedDayOfWeek || 3);

      if (targetDay) {
        const dateKey = format(targetDay, 'yyyy-MM-dd');
        const servicesOnDay = dailyServiceCount[dateKey] || 0;

        if (servicesOnDay >= settings.max_daily_services) {
          warnings.push(`${client.clientName}: Day ${dateKey} already has ${servicesOnDay} services`);
        }

        services.push({
          type: 'recurring',
          client_name: client.clientName,
          dishwasher_model: client.dishwasherModel,
          service_date: dateKey,
          start_time: client.fixedTime || calculateTimeSlot(servicesOnDay),
          duration_minutes: client.duration,
          zone: client.zone,
          address: client.address,
          status: 'scheduled',
          priority: 'normal',
          is_lunch_block: false,
          account_number: client.accountNumber,
          site_name: client.siteName,
          imported_from: 'csv',
        });

        dailyServiceCount[dateKey] = servicesOnDay + 1;
        totalHours += client.duration / 60;
      }
    });
  });

  regularClients.forEach(client => {
    for (let visit = 0; visit < client.visitsPerMonth; visit++) {
      const targetDay = findLeastBusyDay(workDays, dailyServiceCount);
      const dateKey = format(targetDay, 'yyyy-MM-dd');
      const servicesOnDay = dailyServiceCount[dateKey] || 0;

      if (servicesOnDay >= settings.max_daily_services) {
        warnings.push(`${client.clientName}: Cannot schedule visit ${visit + 1}, all days at capacity`);
        continue;
      }

      services.push({
        type: 'scheduled_maintenance',
        client_name: client.clientName,
        dishwasher_model: client.dishwasherModel,
        service_date: dateKey,
        start_time: calculateTimeSlot(servicesOnDay),
        duration_minutes: client.duration,
        zone: client.zone,
        address: client.address,
        status: 'scheduled',
        priority: 'normal',
        is_lunch_block: false,
        account_number: client.accountNumber,
        site_name: client.siteName,
        imported_from: 'csv',
      });

      dailyServiceCount[dateKey] = servicesOnDay + 1;
      totalHours += client.duration / 60;
    }
  });

  const totalWorkDays = workDays.length;
  const averageServicesPerDay = services.length / totalWorkDays;
  const maxDayExceeded = Object.values(dailyServiceCount).some(count => count > settings.max_daily_services);
  const maxWeekExceeded = totalHours > settings.max_weekly_hours * 4;

  return {
    services,
    summary: {
      totalVisits: services.length,
      clientsImported: clients.filter(c => c.selected).length,
      recurringClients: recurringClients.length,
      averageServicesPerDay: parseFloat(averageServicesPerDay.toFixed(1)),
      maxDayExceeded,
      maxWeekExceeded,
      warnings,
    },
  };
}
