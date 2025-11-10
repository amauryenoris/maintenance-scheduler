import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Settings, SettingsUpdate } from '../lib/database.types';

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: SettingsUpdate) => Promise<void>;
  initializeSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await get().initializeSettings();
      } else {
        set({ settings: data, loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  initializeSettings: async () => {
    try {
      const defaultSettings = {
        work_start_time: '07:00:00',
        work_end_time: '18:00:00',
        lunch_time: '12:00:00',
        lunch_duration_minutes: 60,
        max_weekly_hours: 50,
        max_daily_services: 4,
        min_service_duration_minutes: 30,
        max_service_duration_minutes: 240,
        work_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        custom_zones: [],
        end_of_day_alert_enabled: true,
        end_of_day_alert_hour: 17,
        auto_show_alert_on_open: true,
      };

      const { data, error } = await supabase
        .from('settings')
        .insert(defaultSettings)
        .select()
        .single();

      if (error) throw error;

      set({ settings: data, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  updateSettings: async (updates: SettingsUpdate) => {
    const { settings } = get();
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;

      set({ settings: data });
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
