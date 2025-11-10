import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useServicesStore } from '../store/servicesStore';
import { findTimeSlotSuggestions, formatTime, countDailyServices, calculateWeeklyHours, getWeekRange } from '../lib/utils';
import type { Service, ServiceInsert } from '../lib/database.types';
import toast from 'react-hot-toast';

interface EmergencyRescheduleModalProps {
  emergencyData: ServiceInsert;
  conflictingServices: Service[];
  onConfirm: (emergencyData: ServiceInsert, rescheduledServices: Array<{ service: Service; newDate: string; newTime: string }>) => void;
  onCancel: () => void;
}

type SuggestionType = {
  date: string;
  time: string;
  score: number;
  category: 'optimal' | 'good' | 'acceptable';
  serviceCount: number;
  weekHours: number;
  daysFromOriginal: number;
  sameZone: boolean;
};

export function EmergencyRescheduleModal({
  emergencyData,
  conflictingServices,
  onConfirm,
  onCancel,
}: EmergencyRescheduleModalProps) {
  const { services } = useServicesStore();
  const [selectedServices, setSelectedServices] = useState<Set<string>>(
    new Set(conflictingServices.map(s => s.id))
  );
  const [rescheduleSuggestions, setRescheduleSuggestions] = useState<
    Record<string, Array<SuggestionType>>
  >({});
  const [selectedSlots, setSelectedSlots] = useState<Record<string, { date: string; time: string }>>({});

  useEffect(() => {
    conflictingServices.forEach(service => {
      const suggestions = findTimeSlotSuggestions(
        services,
        parseISO(emergencyData.service_date),
        service.duration_minutes,
        service.zone,
        service.start_time
      );
      setRescheduleSuggestions(prev => ({
        ...prev,
        [service.id]: suggestions,
      }));

      if (suggestions.length > 0) {
        setSelectedSlots(prev => ({
          ...prev,
          [service.id]: { date: suggestions[0].date, time: suggestions[0].time },
        }));
      }
    });
  }, [conflictingServices, emergencyData]);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedServices(new Set(conflictingServices.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedServices(new Set());
  };

  const handleConfirm = () => {
    const rescheduled = conflictingServices
      .filter(s => selectedServices.has(s.id))
      .map(service => ({
        service,
        newDate: selectedSlots[service.id].date,
        newTime: selectedSlots[service.id].time,
      }));

    onConfirm(emergencyData, rescheduled);
  };

  const getSuggestionBadge = (category: 'optimal' | 'good' | 'acceptable') => {
    if (category === 'optimal') return { text: '✅ Best option', class: 'bg-green-100 text-green-800 border-green-300' };
    if (category === 'good') return { text: '✅ Good option', class: 'bg-blue-100 text-blue-800 border-blue-300' };
    return { text: '⚠️ Available', class: 'bg-orange-100 text-orange-800 border-orange-300' };
  };

  const getDaysLabel = (days: number) => {
    if (days === 1) return '1 day later';
    if (days === 2) return '2 days later';
    if (days <= 7) return `${days} days later`;
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} later`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-red-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Emergency Management</h2>
          </div>
          <button onClick={onCancel} className="text-white hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Emergency Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-red-700">Client:</span>
                <span className="ml-2 font-medium">{emergencyData.client_name}</span>
              </div>
              <div>
                <span className="text-red-700">Location:</span>
                <span className="ml-2 font-medium">{emergencyData.address}</span>
              </div>
              <div>
                <span className="text-red-700">Date & Time:</span>
                <span className="ml-2 font-medium">
                  {format(parseISO(emergencyData.service_date), 'MMM d, yyyy')} at {formatTime(emergencyData.start_time)}
                </span>
              </div>
              <div>
                <span className="text-red-700">Duration:</span>
                <span className="ml-2 font-medium">{emergencyData.duration_minutes} minutes</span>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Conflicting Services ({conflictingServices.length})</h3>
              <div className="space-x-2">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {conflictingServices.map(service => {
                const suggestions = rescheduleSuggestions[service.id] || [];
                const selected = selectedServices.has(service.id);

                return (
                  <div
                    key={service.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleService(service.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{service.client_name}</h4>
                          <span className="text-sm text-gray-600">
                            {formatTime(service.start_time)} ({service.duration_minutes} min)
                          </span>
                        </div>

                        {selected && suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Select new time slot (Monday-Friday only):</span>
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                              {suggestions.map((suggestion, idx) => {
                                const badge = getSuggestionBadge(suggestion.category);
                                const isSelected =
                                  selectedSlots[service.id]?.date === suggestion.date &&
                                  selectedSlots[service.id]?.time === suggestion.time;

                                const suggestedDate = parseISO(suggestion.date);
                                const weekStart = new Date(suggestedDate);
                                weekStart.setDate(suggestedDate.getDate() - suggestedDate.getDay() + 1);
                                const currentWeekHours = calculateWeeklyHours(services, weekStart);

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      setSelectedSlots(prev => ({
                                        ...prev,
                                        [service.id]: { date: suggestion.date, time: suggestion.time },
                                      }))
                                    }
                                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-blue-300 hover:shadow'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-900 mb-1">
                                          {format(suggestedDate, 'EEEE, MMMM d, yyyy')}
                                        </div>
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                          <Clock className="w-3.5 h-3.5" />
                                          <span className="font-medium">{suggestion.time}</span>
                                          <span>•</span>
                                          <span>{getDaysLabel(suggestion.daysFromOriginal)}</span>
                                        </div>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded border font-medium ${badge.class}`}>
                                        {badge.text}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
                                      <div className="flex items-center space-x-1.5">
                                        <div className={`w-2 h-2 rounded-full ${
                                          suggestion.serviceCount <= 2 ? 'bg-green-500' :
                                          suggestion.serviceCount === 3 ? 'bg-blue-500' :
                                          'bg-orange-500'
                                        }`} />
                                        <span className="text-gray-700">
                                          <span className="font-semibold">{suggestion.serviceCount}/4</span> services
                                        </span>
                                      </div>

                                      <div className="flex items-center space-x-1.5">
                                        <TrendingUp className={`w-3.5 h-3.5 ${
                                          suggestion.weekHours < 40 ? 'text-green-600' :
                                          suggestion.weekHours < 48 ? 'text-blue-600' :
                                          'text-orange-600'
                                        }`} />
                                        <span className="text-gray-700">
                                          {currentWeekHours.toFixed(1)}h → <span className="font-semibold">{suggestion.weekHours.toFixed(1)}h</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center space-x-1.5">
                                        {suggestion.sameZone ? (
                                          <>
                                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                            <span className="text-green-700 font-medium">Same zone</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                                            <span className="text-orange-700">Different zone</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {selected && suggestions.length === 0 && (
                          <p className="text-sm text-red-600 mt-2">
                            No automatic suggestions available. Manual rescheduling required.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedServices.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Preview</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} will be rescheduled
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedServices.size === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              ✅ Confirm Rescheduling
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
