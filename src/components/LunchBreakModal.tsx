import { useState } from 'react';
import { X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Service } from '../lib/database.types';
import { useServicesStore } from '../store/servicesStore';
import {
  validateLunchMove,
  checkLunchConflicts,
  suggestLunchTimes,
  formatTimeLabel,
  calculateEndTime,
  getTimeOptions,
} from '../lib/lunchBreakUtils';

interface LunchBreakModalProps {
  lunchBreak: Service;
  onClose: () => void;
  onUpdate: () => void;
}

export function LunchBreakModal({ lunchBreak, onClose, onUpdate }: LunchBreakModalProps) {
  const [newStartTime, setNewStartTime] = useState(lunchBreak.start_time);
  const [loading, setLoading] = useState(false);
  const { services, updateService } = useServicesStore();

  const conflicts = checkLunchConflicts(
    newStartTime,
    lunchBreak.service_date,
    services,
    lunchBreak.id
  );

  const suggestions = suggestLunchTimes(
    lunchBreak.service_date,
    services,
    lunchBreak.id
  );

  const handleSave = async () => {
    const validation = validateLunchMove(
      lunchBreak,
      newStartTime,
      new Date(lunchBreak.service_date)
    );

    if (!validation.valid) {
      toast.error(validation.error || 'Invalid lunch time');
      return;
    }

    if (conflicts.length > 0) {
      const confirmMove = window.confirm(
        `This lunch time overlaps with ${conflicts.length} service(s). Continue anyway?`
      );
      if (!confirmMove) return;
    }

    setLoading(true);

    try {
      await updateService(lunchBreak.id, {
        start_time: newStartTime,
      });

      toast.success('Lunch break moved successfully');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('Failed to update lunch break');
    } finally {
      setLoading(false);
    }
  };

  const quickSetTime = (time: string) => {
    setNewStartTime(time);
  };

  const endTime = calculateEndTime(newStartTime);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-100 border-b-2 border-dashed border-gray-300 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Lunch Break</h2>
              <p className="text-sm text-gray-600">
                {format(new Date(lunchBreak.service_date), 'EEEE, MMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-blue-900 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Current Time</span>
            </div>
            <p className="text-lg font-bold text-blue-900">
              {formatTimeLabel(lunchBreak.start_time)} - {formatTimeLabel(calculateEndTime(lunchBreak.start_time))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Change Time
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  New start time
                </label>
                <select
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {getTimeOptions().map(time => (
                    <option key={time} value={time}>
                      {formatTimeLabel(time)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded p-3 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">End time (auto-calculated)</p>
                <p className="text-base font-semibold text-gray-900">
                  {formatTimeLabel(endTime)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Always 1 hour duration</p>
              </div>
            </div>
          </div>

          {conflicts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    Time Conflict Warning
                  </p>
                  {conflicts.map((conflict, idx) => (
                    <p key={idx} className="text-xs text-yellow-800">
                      • {conflict.message}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">💡 Common times:</p>
            <div className="grid grid-cols-3 gap-2">
              {suggestions.slice(0, 6).map(suggestion => (
                <button
                  key={suggestion.time}
                  onClick={() => quickSetTime(suggestion.time)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    suggestion.time === newStartTime
                      ? 'bg-blue-600 text-white'
                      : suggestion.conflicts
                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200'
                      : 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                  }`}
                >
                  {suggestion.label}
                  {suggestion.conflicts && <span className="ml-1 text-xs">⚠️</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Lunch break must remain on the same day
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || newStartTime === lunchBreak.start_time}
              className="w-full sm:flex-1 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 font-semibold min-h-[44px] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
