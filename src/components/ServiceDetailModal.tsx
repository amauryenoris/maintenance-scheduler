import { X, Edit, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getServiceColor, getServiceIcon, getStatusBadgeColor, formatTime } from '../lib/utils';
import type { Service } from '../lib/database.types';

interface ServiceDetailModalProps {
  service: Service;
  onClose: () => void;
  onEdit?: (service: Service) => void;
  onComplete?: (service: Service) => void;
  onDelete?: (service: Service) => void;
}

export function ServiceDetailModal({
  service,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}: ServiceDetailModalProps) {
  const isLunch = service.is_lunch_block;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div
          className="p-6 rounded-t-lg text-white"
          style={{ backgroundColor: getServiceColor(service) }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getServiceIcon(service)}</span>
              <div>
                <h2 className="text-2xl font-bold">
                  {isLunch ? 'Lunch Break' : service.client_name}
                </h2>
                <p className="text-sm opacity-90">
                  {format(parseISO(service.service_date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {!isLunch && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(
                        service.status
                      )}`}
                    >
                      {service.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Type</label>
                  <p className="mt-1 font-semibold capitalize text-gray-900">
                    {service.type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Start Time</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatTime(service.start_time)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Duration</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {service.duration_minutes} minutes
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Dishwasher Model</label>
                <p className="mt-1 font-medium text-gray-900">{service.dishwasher_model}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Zone</label>
                <p className="mt-1 font-medium text-gray-900 capitalize">{service.zone}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Address</label>
                <p className="mt-1 text-gray-900">{service.address}</p>
              </div>

              {service.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Notes</label>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap">{service.notes}</p>
                </div>
              )}

              {service.rescheduled_from && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <label className="text-sm font-medium text-orange-900">
                    Rescheduled Information
                  </label>
                  <p className="mt-1 text-sm text-orange-700">
                    Originally scheduled for {format(parseISO(service.rescheduled_from), 'MMMM d, yyyy')}
                  </p>
                  {service.rescheduled_reason && (
                    <p className="mt-1 text-sm text-orange-700">
                      Reason: {service.rescheduled_reason}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {isLunch && (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Scheduled lunch break for {service.duration_minutes} minutes
              </p>
            </div>
          )}

          {!isLunch && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              {onDelete && service.status !== 'completed' && (
                <button
                  onClick={() => onDelete(service)}
                  className="px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
              {onEdit && service.status !== 'completed' && (
                <button
                  onClick={() => onEdit(service)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
              {onComplete && service.status === 'scheduled' && (
                <button
                  onClick={() => onComplete(service)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Completed</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
