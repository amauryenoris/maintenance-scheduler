import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { format, parse, addDays, isWeekend, isBefore, isAfter, startOfDay } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Service } from '../lib/database.types';
import { useServicesStore } from '../store/servicesStore';
import { supabase } from '../lib/supabase';

interface RescheduleModalProps {
  service: Service;
  onClose: () => void;
  onRescheduled: () => void;
}

export function RescheduleModal({ service, onClose, onRescheduled }: RescheduleModalProps) {
  const [newDate, setNewDate] = useState(service.service_date);
  const [newTime, setNewTime] = useState(service.start_time);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { updateService, services } = useServicesStore();

  const checkConflicts = () => {
    return services.filter(s =>
      s.id !== service.id &&
      s.service_date === newDate &&
      s.start_time === newTime &&
      !s.is_lunch_block
    );
  };

  const handleReschedule = async () => {
    const selectedDate = startOfDay(new Date(newDate));
    const today = startOfDay(new Date());
    const originalDate = startOfDay(new Date(service.service_date));

    if (isWeekend(selectedDate)) {
      toast.error('Cannot reschedule to weekends. Please select a weekday (Monday-Friday).');
      return;
    }

    if (isBefore(selectedDate, today)) {
      toast.error('Cannot reschedule to a past date. Please select a future date.');
      return;
    }

    if (isBefore(selectedDate, originalDate)) {
      toast.error(`Cannot reschedule to a date before the original service (${format(originalDate, 'MMM d, yyyy')}).`);
      return;
    }

    setLoading(true);

    try {
      await supabase.from('reschedule_history').insert({
        service_id: service.id,
        original_date: service.service_date,
        original_time: service.start_time,
        new_date: newDate,
        new_time: newTime,
        reason: reason || null,
      });

      await updateService(service.id, {
        service_date: newDate,
        start_time: newTime,
        status: service.status === 'completed' ? 'completed' : 'rescheduled',
        rescheduled_from: service.service_date,
        rescheduled_reason: reason || null,
      });

      toast.success(`${service.client_name} rescheduled to ${format(new Date(newDate), 'MMM d, yyyy')}`);
      onRescheduled();
      onClose();
    } catch (error) {
      toast.error('Failed to reschedule service');
    } finally {
      setLoading(false);
    }
  };

  const conflicts = checkConflicts();

  const getNextWeekday = (startDate: Date, daysToAdd: number): string => {
    let currentDate = addDays(startDate, daysToAdd);

    while (isWeekend(currentDate)) {
      currentDate = addDays(currentDate, 1);
    }

    return format(currentDate, 'yyyy-MM-dd');
  };

  const getServiceCountForDate = (dateStr: string): number => {
    return services.filter(
      s => s.service_date === dateStr && !s.is_lunch_block && s.status !== 'canceled'
    ).length;
  };

  const generateSuggestions = () => {
    const suggestions: Array<{ date: string; label: string; serviceCount: number }> = [];
    const today = startOfDay(new Date());
    const originalDate = startOfDay(new Date(service.service_date));

    const searchStartDate = isAfter(today, originalDate) ? today : originalDate;
    let currentDate = addDays(searchStartDate, 1);

    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate = addDays(currentDate, 1);
    }

    let daysChecked = 0;
    const maxDaysToCheck = 60;

    while (suggestions.length < 3 && daysChecked < maxDaysToCheck) {
      const dayOfWeek = currentDate.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDate = addDays(currentDate, 1);
        daysChecked++;
        continue;
      }

      if (isBefore(startOfDay(currentDate), today)) {
        currentDate = addDays(currentDate, 1);
        daysChecked++;
        continue;
      }

      if (isBefore(startOfDay(currentDate), originalDate)) {
        currentDate = addDays(currentDate, 1);
        daysChecked++;
        continue;
      }

      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const serviceCount = getServiceCountForDate(dateStr);

      if (serviceCount < 4) {
        let label = '';
        const daysDiff = Math.floor((currentDate.getTime() - searchStartDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 3) {
          label = 'Next available weekday';
        } else if (daysDiff <= 7) {
          label = 'Later this week';
        } else if (daysDiff <= 14) {
          label = 'Next week';
        } else {
          label = `${Math.ceil(daysDiff / 7)} weeks out`;
        }

        suggestions.push({
          date: dateStr,
          label,
          serviceCount,
        });
      }

      currentDate = addDays(currentDate, 1);
      daysChecked++;
    }

    return suggestions;
  };

  const suggestedDates = generateSuggestions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Reschedule Service
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">Currently scheduled:</p>
            <p className="font-semibold text-gray-900 mt-1">
              {format(new Date(service.service_date), 'EEEE, MMMM d, yyyy')} at {service.start_time}
            </p>
            <p className="text-sm text-gray-600 mt-1">{service.client_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Date * (Weekdays only)
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                const selectedDate = startOfDay(new Date(e.target.value));
                const today = startOfDay(new Date());
                const originalDate = startOfDay(new Date(service.service_date));

                if (isWeekend(selectedDate)) {
                  toast.error('Weekend dates are not available. Please select a weekday.');
                  return;
                }

                if (isBefore(selectedDate, today)) {
                  toast.error('Cannot select a past date. Please select a future date.');
                  return;
                }

                if (isBefore(selectedDate, originalDate)) {
                  toast.error(`Cannot select a date before the original service (${format(originalDate, 'MMM d, yyyy')}).`);
                  return;
                }

                setNewDate(e.target.value);
              }}
              min={(() => {
                const today = startOfDay(new Date());
                const originalDate = startOfDay(new Date(service.service_date));
                const minDate = isAfter(today, originalDate) ? today : originalDate;
                return format(addDays(minDate, 1), 'yyyy-MM-dd');
              })()}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be after {format(new Date(service.service_date), 'MMM d, yyyy')} and on a weekday
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Time *
            </label>
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being rescheduled?"
              rows={3}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {conflicts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-yellow-900">⚠️ Time conflict detected:</p>
              <p className="text-sm text-yellow-700 mt-1">
                {conflicts[0].client_name} is already scheduled at this time
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Suggested alternatives (Weekdays only):</p>
            <div className="space-y-2">
              {suggestedDates.map((suggestion, idx) => {
                const suggestionDate = new Date(suggestion.date);
                const dayName = format(suggestionDate, 'EEEE');
                return (
                  <button
                    key={idx}
                    onClick={() => setNewDate(suggestion.date)}
                    className="w-full text-left px-3 py-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 active:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {dayName}, {format(suggestionDate, 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">{suggestion.label}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {suggestion.serviceCount}/4 services
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900 flex items-center gap-2">
              <span className="text-base">💡</span>
              All suggestions are weekdays (Monday-Friday). Weekend scheduling is not available.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              onClick={handleReschedule}
              disabled={loading || !newDate || !newTime}
              className="w-full sm:w-auto flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 font-semibold min-h-[44px]"
            >
              {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
