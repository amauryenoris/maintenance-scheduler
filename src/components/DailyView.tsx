import { X, Plus, CheckCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useServicesStore } from '../store/servicesStore';
import { useFiltersStore } from '../store/filtersStore';
import { getServiceColor, getServiceIcon, formatTime, getStatusBadgeColor, getZoneColor } from '../lib/utils';
import { getFilteredServices } from '../lib/filterUtils';
import type { Service } from '../lib/database.types';

interface DailyViewProps {
  date: Date;
  onClose: () => void;
  onServiceClick: (service: Service) => void;
  onAddService: () => void;
}

export function DailyView({ date, onClose, onServiceClick, onAddService }: DailyViewProps) {
  const { services } = useServicesStore();
  const filters = useFiltersStore();
  const filteredServices = getFilteredServices(services, filters);

  const dateStr = format(date, 'yyyy-MM-dd');
  const dayServices = filteredServices
    .filter((s) => s.service_date === dateStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const nonLunchServices = dayServices.filter((s) => !s.is_lunch_block);
  const totalHours = dayServices.reduce((sum, s) => sum + s.duration_minutes / 60, 0);
  const workHours = nonLunchServices.reduce((sum, s) => sum + s.duration_minutes / 60, 0);

  const hours = Array.from({ length: 12 }, (_, i) => i + 7);

  const getServiceAtHour = (hour: number): Service[] => {
    return dayServices.filter((s) => {
      const startHour = parseInt(s.start_time.split(':')[0]);
      const startMinute = parseInt(s.start_time.split(':')[1]);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = startTotalMinutes + s.duration_minutes;
      const hourMinutes = hour * 60;

      return startTotalMinutes <= hourMinutes && endTotalMinutes > hourMinutes;
    });
  };

  const zones = Array.from(new Set(nonLunchServices.map((s) => s.zone)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
            <p className="text-blue-100 mt-1 text-xs sm:text-sm">
              {nonLunchServices.length} service{nonLunchServices.length !== 1 ? 's' : ''} | {totalHours.toFixed(1)} hours total
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 active:text-gray-300 transition-colors ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-700">Services Today</div>
                <div className="text-3xl font-bold text-blue-900 mt-1">
                  {nonLunchServices.length}/4
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm font-medium text-green-700">Work Hours</div>
                <div className="text-3xl font-bold text-green-900 mt-1">
                  {workHours.toFixed(1)}h
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-700">Zones</div>
                <div className="flex items-center space-x-2 mt-2">
                  {zones.map((zone) => (
                    <div
                      key={zone}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getZoneColor(zone) }}
                    >
                      {zone.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {zones.length === 0 && (
                    <span className="text-sm text-gray-500">No zones</span>
                  )}
                </div>
              </div>
            </div>

            {dayServices.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No services scheduled</h3>
                <p className="text-gray-500 mb-4">Start by adding a service for this day</p>
                <button
                  onClick={onAddService}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg inline-flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Service</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => onServiceClick(service)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer bg-white"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: getServiceColor(service),
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl mt-1">{getServiceIcon(service)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">
                              {service.is_lunch_block ? 'Lunch Break' : service.client_name}
                            </h3>
                            <span
                              className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadgeColor(
                                service.status
                              )}`}
                            >
                              {service.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>

                          {!service.is_lunch_block && (
                            <>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center space-x-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{service.address}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getZoneColor(service.zone) }}
                                  />
                                  <span className="capitalize">{service.zone}</span>
                                </div>
                              </div>

                              <div className="text-sm text-gray-700">
                                <span className="font-medium">Model:</span> {service.dishwasher_model}
                              </div>

                              {service.notes && (
                                <div className="text-sm text-gray-600 mt-2 italic">
                                  {service.notes}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatTime(service.start_time)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {service.duration_minutes} min
                        </div>
                        {service.status === 'completed' && (
                          <div className="mt-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {nonLunchServices.filter((s) => s.status === 'completed').length} of {nonLunchServices.length} completed
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddService}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
