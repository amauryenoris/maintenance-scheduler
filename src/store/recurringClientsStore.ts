import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RecurringClient, RecurringClientInsert, RecurringClientUpdate } from '../lib/database.types';

interface RecurringClientsState {
  recurringClients: RecurringClient[];
  loading: boolean;
  error: string | null;
  fetchRecurringClients: () => Promise<void>;
  addRecurringClient: (client: RecurringClientInsert) => Promise<RecurringClient | null>;
  updateRecurringClient: (id: string, updates: RecurringClientUpdate) => Promise<void>;
  deleteRecurringClient: (id: string) => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
}

export const useRecurringClientsStore = create<RecurringClientsState>((set) => ({
  recurringClients: [],
  loading: false,
  error: null,

  fetchRecurringClients: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('recurring_clients')
        .select('*')
        .order('client_name', { ascending: true });

      if (error) throw error;
      set({ recurringClients: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  addRecurringClient: async (client: RecurringClientInsert) => {
    try {
      const { data, error } = await supabase
        .from('recurring_clients')
        .insert(client)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        recurringClients: [...state.recurringClients, data],
      }));

      return data;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    }
  },

  updateRecurringClient: async (id: string, updates: RecurringClientUpdate) => {
    try {
      const { data, error } = await supabase
        .from('recurring_clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        recurringClients: state.recurringClients.map((c) => (c.id === id ? data : c)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteRecurringClient: async (id: string) => {
    try {
      const { error } = await supabase.from('recurring_clients').delete().eq('id', id);

      if (error) throw error;

      set((state) => ({
        recurringClients: state.recurringClients.filter((c) => c.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  toggleActive: async (id: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('recurring_clients')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        recurringClients: state.recurringClients.map((c) => (c.id === id ? data : c)),
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
