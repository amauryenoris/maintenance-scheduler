import type { Service } from './database.types';

interface FilterState {
  showCompleted: boolean;
  showPending: boolean;
  showEmergencies: boolean;
  showRescheduled: boolean;
  showRecurring: boolean;
  showCanceled: boolean;
  showLunchBlocks: boolean;
}

export function getFilteredServices(services: Service[], filters: FilterState): Service[] {
  return services.filter((service) => {
    if (service.is_lunch_block) {
      return filters.showLunchBlocks;
    }

    let shouldShow = false;

    if (service.status === 'completed' && filters.showCompleted) {
      shouldShow = true;
    }

    if (service.status === 'scheduled' && filters.showPending) {
      shouldShow = true;
    }

    if ((service.type === 'emergency' || service.priority === 'emergency') && filters.showEmergencies) {
      shouldShow = true;
    }

    if (service.status === 'rescheduled' && filters.showRescheduled) {
      shouldShow = true;
    }

    if (service.type === 'recurring' && filters.showRecurring) {
      shouldShow = true;
    }

    if (service.status === 'canceled' && filters.showCanceled) {
      shouldShow = true;
    }

    return shouldShow;
  });
}

export function getStatusCount(services: Service[], status: string): number {
  return services.filter((s) => {
    if (status === 'completed') return s.status === 'completed';
    if (status === 'pending') return s.status === 'scheduled';
    if (status === 'emergency') return s.type === 'emergency' || s.priority === 'emergency';
    if (status === 'rescheduled') return s.status === 'rescheduled';
    if (status === 'recurring') return s.type === 'recurring';
    if (status === 'canceled') return s.status === 'canceled';
    if (status === 'lunch') return s.is_lunch_block;
    return false;
  }).length;
}
