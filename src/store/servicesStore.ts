import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Service, ServiceInsert, ServiceUpdate } from '../lib/database.types';

interface ServicesState {
  services: Service[];
  loading: boolean;
  error: string | null;
  fetchServices: () => Promise<void>;
  addService: (service: ServiceInsert) => Promise<Service | null>;
  updateService: (id: string, updates: ServiceUpdate) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  getServicesByDateRange: (startDate: Date, endDate: Date) => Service[];
  getServicesByDate: (date: Date) => Service[];
  getConflictingServices: (date: string, startTime: string, durationMinutes: number, excludeId?: string) => Service[];
}

export const useServicesStore = create<ServicesState>((set, get) => ({
  services: [],
  loading: false,
  error: null,

  fetchServices: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('service_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      set({ services: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addService: async (service: ServiceInsert) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .insert(service)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        services: [...state.services, data],
      }));

      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateService: async (id: string, updates: ServiceUpdate) => {
    try {
      const { data, error } = await supabase
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        services: state.services.map((s) => (s.id === id ? data : s)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteService: async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        services: state.services.filter((s) => s.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  getServicesByDateRange: (startDate: Date, endDate: Date) => {
    const { services } = get();
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    return services.filter((s) => s.service_date >= start && s.service_date <= end);
  },

  getServicesByDate: (date: Date) => {
    const { services } = get();
    const dateStr = date.toISOString().split('T')[0];

    return services.filter((s) => s.service_date === dateStr);
  },

  getConflictingServices: (date: string, startTime: string, durationMinutes: number, excludeId?: string) => {
    const { services } = get();

    const serviceStartMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const serviceEndMinutes = serviceStartMinutes + durationMinutes;

    return services.filter((s) => {
      if (s.id === excludeId) return false;
      if (s.service_date !== date) return false;

      const existingStartMinutes = parseInt(s.start_time.split(':')[0]) * 60 + parseInt(s.start_time.split(':')[1]);
      const existingEndMinutes = existingStartMinutes + s.duration_minutes;

      return (
        (serviceStartMinutes >= existingStartMinutes && serviceStartMinutes < existingEndMinutes) ||
        (serviceEndMinutes > existingStartMinutes && serviceEndMinutes <= existingEndMinutes) ||
        (serviceStartMinutes <= existingStartMinutes && serviceEndMinutes >= existingEndMinutes)
      );
    });
  },
}));
