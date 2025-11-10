import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useServicesStore } from '../store/servicesStore';
import { useRecurringClientsStore } from '../store/recurringClientsStore';
import type { ServiceInsert } from '../lib/database.types';

interface ServiceFormProps {
  onClose: () => void;
  onSubmit: (service: ServiceInsert) => void;
  isEmergency?: boolean;
  defaultDate?: Date;
}

export function ServiceForm({ onClose, onSubmit, isEmergency = false, defaultDate }: ServiceFormProps) {
  const { services } = useServicesStore();
  const { recurringClients } = useRecurringClientsStore();

  const [formData, setFormData] = useState<ServiceInsert>({
    type: isEmergency ? 'emergency' : 'scheduled_maintenance',
    client_name: '',
    dishwasher_model: '',
    service_date: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    start_time: '09:00',
    duration_minutes: 60,
    zone: 'downtown',
    address: '',
    notes: '',
    status: 'scheduled',
    priority: isEmergency ? 'emergency' : 'normal',
    is_lunch_block: false,
  });

  const [conflicts, setConflicts] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const clientNames = Array.from(new Set([
    ...services.map(s => s.client_name),
    ...recurringClients.map(c => c.client_name)
  ])).sort();

  useEffect(() => {
    checkConflicts();
  }, [formData.service_date, formData.start_time, formData.duration_minutes]);

  const checkConflicts = () => {
    const newConflicts: any[] = [];
    const newWarnings: string[] = [];

    const serviceStartMinutes = parseInt(formData.start_time.split(':')[0]) * 60 + parseInt(formData.start_time.split(':')[1]);
    const serviceEndMinutes = serviceStartMinutes + formData.duration_minutes;

    const dayServices = services.filter(s => s.service_date === formData.service_date && s.status !== 'canceled');

    dayServices.forEach(s => {
      const existingStartMinutes = parseInt(s.start_time.split(':')[0]) * 60 + parseInt(s.start_time.split(':')[1]);
      const existingEndMinutes = existingStartMinutes + s.duration_minutes;

      if (
        (serviceStartMinutes >= existingStartMinutes && serviceStartMinutes < existingEndMinutes) ||
        (serviceEndMinutes > existingStartMinutes && serviceEndMinutes <= existingEndMinutes) ||
        (serviceStartMinutes <= existingStartMinutes && serviceEndMinutes >= existingEndMinutes)
      ) {
        newConflicts.push(s);
      }
    });

    const nonLunchServices = dayServices.filter(s => !s.is_lunch_block);
    if (nonLunchServices.length >= 4) {
      newWarnings.push('This day already has 4 or more services scheduled.');
    }

    setConflicts(newConflicts);
    setWarnings(newWarnings);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (conflicts.length > 0 && !isEmergency) {
      alert('There are time conflicts. Please choose a different time or use Emergency mode to reschedule conflicting services.');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (field: keyof ServiceInsert, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const quickDurations = [60, 90, 120, 150, 180];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isEmergency ? '🚨 New Emergency Service' : 'New Service'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">Time Conflict Detected</h3>
                  <p className="text-sm text-red-700 mt-1">
                    The following services overlap with your selected time:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {conflicts.map(c => (
                      <li key={c.id} className="text-sm text-red-700">
                        • {c.client_name} - {c.start_time.substring(0, 5)} ({c.duration_minutes} min)
                      </li>
                    ))}
                  </ul>
                  {isEmergency && (
                    <p className="text-sm text-red-700 mt-2 font-medium">
                      Emergency mode: Conflicting services will be automatically rescheduled.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  {warnings.map((warning, idx) => (
                    <p key={idx} className="text-sm text-yellow-700">{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Name *
            </label>
            <input
              type="text"
              list="clients"
              required
              value={formData.client_name}
              onChange={(e) => handleChange('client_name', e.target.value)}
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <datalist id="clients">
              {clientNames.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.service_date}
                onChange={(e) => handleChange('service_date', e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => handleChange('start_time', e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {quickDurations.map(duration => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => handleChange('duration_minutes', duration)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors min-h-[44px] ${
                    formData.duration_minutes === duration
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {duration / 60}h
                </button>
              ))}
              <input
                type="number"
                min="30"
                max="300"
                step="15"
                value={formData.duration_minutes}
                onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value))}
                className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zone *
            </label>
            <select
              required
              value={formData.zone}
              onChange={(e) => handleChange('zone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="north">North</option>
              <option value="south">South</option>
              <option value="east">East</option>
              <option value="west">West</option>
              <option value="downtown">Downtown</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="123 Main St, City"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional service notes..."
              className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`w-full sm:w-auto px-6 py-2.5 font-semibold text-white rounded-lg min-h-[44px] ${
                isEmergency
                  ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isEmergency ? 'Schedule Emergency' : 'Save Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
