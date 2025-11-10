import { useState } from 'react';
import { X, AlertCircle, CheckCircle, Calendar, Eye, Clock, MapPin, Timer, AlertTriangle, Info } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { toast } from 'react-hot-toast';
import type { Service } from '../lib/database.types';
import { useServicesStore } from '../store/servicesStore';

interface EndOfDayAlertProps {
  pendingServices: Service[];
  onClose: () => void;
  onRemindLater: () => void;
  onDismiss: () => void;
  onReschedule: (service: Service) => void;
  onViewDetails: (service: Service) => void;
}

export function EndOfDayAlert({
  pendingServices,
  onClose,
  onRemindLater,
  onDismiss,
  onReschedule,
  onViewDetails,
}: EndOfDayAlertProps) {
  const { updateService } = useServicesStore();
  const [localPending, setLocalPending] = useState(pendingServices);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleQuickComplete = async (serviceId: string) => {
    const service = localPending.find(s => s.id === serviceId);
    if (!service) return;

    try {
      await updateService(serviceId, {
        status: 'completed',
        notes: notes[serviceId] ? `${service.notes || ''}\n${notes[serviceId]}`.trim() : service.notes,
      });

      toast.success(`${service.client_name} marked as completed`);

      const updatedPending = localPending.filter(s => s.id !== serviceId);
      setLocalPending(updatedPending);

      if (updatedPending.length === 0) {
        toast.success('All services completed! Great job!', {
          icon: '🎉',
          duration: 4000,
        });
        setTimeout(() => onClose(), 1000);
      }
    } catch (error) {
      toast.error('Failed to mark service as completed');
    }
  };

  const handleMarkAllCompleted = async () => {
    if (!confirm(`Mark all ${localPending.length} services as completed?`)) {
      return;
    }

    try {
      for (const service of localPending) {
        await updateService(service.id, {
          status: 'completed',
        });
      }

      toast.success(`${localPending.length} services marked as completed!`, {
        icon: '🎉',
        duration: 4000,
      });

      setLocalPending([]);
      setTimeout(() => onClose(), 1000);
    } catch (error) {
      toast.error('Failed to mark services as completed');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'rescheduled':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEndTime = (service: Service) => {
    const [hours, minutes] = service.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration_minutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  const isServicePast = (service: Service) => {
    const endTime = getEndTime(service);
    const serviceDateTime = new Date(`${service.service_date}T${endTime}`);
    return isPast(serviceDateTime);
  };

  if (localPending.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Pending Services for Today
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <p className="text-gray-600 mb-4">
            You have <span className="font-semibold text-orange-600">{localPending.length}</span> service(s) that haven't been marked as completed today.
          </p>

          <div className="space-y-3 mb-6">
            {localPending.map((service) => (
              <div
                key={service.id}
                className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg">{service.client_name}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(service.status)}`}>
                        {service.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {service.start_time.substring(0, 5)} - {getEndTime(service)}
                        </span>
                      </div>

                      {service.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{service.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        <span>Duration: {service.duration_minutes} minutes</span>
                      </div>
                    </div>

                    {isServicePast(service) && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-800">
                          This service was scheduled to end at {getEndTime(service)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-2">
                  <button
                    onClick={() => handleQuickComplete(service.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition font-medium"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark Completed
                  </button>

                  <button
                    onClick={() => onReschedule(service)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <Calendar className="h-4 w-4" />
                    Reschedule
                  </button>

                  <button
                    onClick={() => onViewDetails(service)}
                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Add quick note (press Enter)..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      setNotes(prev => ({ ...prev, [service.id]: e.currentTarget.value }));
                      toast.success('Note will be added when marked complete');
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
            ))}
          </div>

          <div className="border-t pt-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-orange-600">{localPending.length}</span> pending service(s)
              </div>

              <button
                onClick={handleMarkAllCompleted}
                className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 active:bg-green-100 transition text-sm font-medium"
              >
                <CheckCircle className="h-4 w-4" />
                Mark All as Completed
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                This reminder helps you keep track of completed services. You can also access this anytime from the dashboard.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
            <button
              onClick={onRemindLater}
              className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            >
              Remind Me in 30 Minutes
            </button>

            <button
              onClick={onDismiss}
              className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 min-h-[44px]"
            >
              I'll Review Later
            </button>

            <button
              onClick={onClose}
              disabled={localPending.length > 0}
              className={`w-full sm:w-auto flex-1 px-6 py-2.5 rounded-lg font-semibold min-h-[44px] transition ${
                localPending.length > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {localPending.length > 0 ? 'Please Complete or Reschedule' : 'All Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
