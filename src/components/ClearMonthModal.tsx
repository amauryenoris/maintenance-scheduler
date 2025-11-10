import { useState } from 'react';
import { X, AlertTriangle, Trash2, Info, Download, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useServicesStore } from '../store/servicesStore';
import type { Service } from '../lib/database.types';

interface ClearMonthModalProps {
  onClose: () => void;
  currentDate: Date;
}

interface ServiceCounts {
  total: number;
  completed: number;
  pending: number;
  emergencies: number;
  rescheduled: number;
  lunch: number;
  recurring: number;
}

export function ClearMonthModal({ onClose, currentDate }: ClearMonthModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { services, deleteService } = useServicesStore();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthName = format(currentDate, 'MMMM yyyy');

  const servicesInMonth = services.filter(service => {
    const serviceDate = new Date(service.service_date);
    return serviceDate >= monthStart && serviceDate <= monthEnd;
  });

  const counts: ServiceCounts = {
    total: servicesInMonth.length,
    completed: servicesInMonth.filter(s => s.status === 'completed').length,
    pending: servicesInMonth.filter(s => s.status === 'scheduled').length,
    emergencies: servicesInMonth.filter(s => s.type === 'emergency' || s.priority === 'emergency').length,
    rescheduled: servicesInMonth.filter(s => s.status === 'rescheduled').length,
    lunch: servicesInMonth.filter(s => s.is_lunch_block).length,
    recurring: servicesInMonth.filter(s => s.type === 'recurring').length,
  };

  const handleExport = () => {
    const exportData = {
      month: monthName,
      exportDate: new Date().toISOString(),
      services: servicesInMonth,
      counts,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `services_${format(currentDate, 'yyyy-MM')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Data exported successfully');
  };

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setIsDeleting(true);

    try {
      for (const service of servicesInMonth) {
        await deleteService(service.id);
      }

      toast.success(
        `Successfully deleted ${counts.total} event${counts.total !== 1 ? 's' : ''} from ${monthName}`,
        { duration: 5000 }
      );

      onClose();
    } catch (error) {
      toast.error('Failed to delete some services. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Clear All Events?
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
          {counts.total === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No events found for {monthName}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-900 mb-2">
                  This will permanently delete all events for {monthName}:
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">📅 Total Services</span>
                  <span className="font-semibold text-gray-900">{counts.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">✅ Completed</span>
                  <span className="font-semibold text-green-700">{counts.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">📋 Pending</span>
                  <span className="font-semibold text-blue-700">{counts.pending}</span>
                </div>
                {counts.emergencies > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">🚨 Emergencies</span>
                    <span className="font-semibold text-red-700">{counts.emergencies}</span>
                  </div>
                )}
                {counts.rescheduled > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">🔄 Rescheduled</span>
                    <span className="font-semibold text-orange-700">{counts.rescheduled}</span>
                  </div>
                )}
                {counts.recurring > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">🔁 Recurring</span>
                    <span className="font-semibold text-purple-700">{counts.recurring}</span>
                  </div>
                )}
                {counts.lunch > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">🍽️ Lunch Breaks</span>
                    <span className="font-semibold text-gray-600">{counts.lunch}</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      Recommended: Export data first
                    </p>
                    <p className="text-xs text-blue-700 mb-3">
                      Create a backup before deleting all events
                    </p>
                    <button
                      onClick={handleExport}
                      className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export {monthName} Data
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
                <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  This action CANNOT be undone!
                </p>
                <p className="text-xs text-yellow-800">
                  All service records, notes, and history for this month will be permanently deleted from the database.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2.5 text-base text-center font-mono font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoFocus
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  disabled={isDeleting}
                  className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px] font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE' || isDeleting}
                  className="w-full sm:flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px] flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete All {counts.total} Events
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
