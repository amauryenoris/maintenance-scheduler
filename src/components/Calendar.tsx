import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { useServicesStore } from '../store/servicesStore';
import { useFiltersStore } from '../store/filtersStore';
import { getServiceColor, getServiceIcon, countDailyServices, formatTime } from '../lib/utils';
import { getFilteredServices } from '../lib/filterUtils';
import type { Service } from '../lib/database.types';

interface CalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onServiceClick: (service: Service) => void;
  onDayClick: (date: Date) => void;
  onShowToday: () => void;
}

export function Calendar({ currentDate, onDateChange, onServiceClick, onDayClick, onShowToday }: CalendarProps) {
  const { services } = useServicesStore();
  const filters = useFiltersStore();
  const filteredServices = getFilteredServices(services, filters);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const previousMonth = () => {
    onDateChange(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    onDateChange(addMonths(currentDate, 1));
  };

  const goToToday = () => {
    onShowToday();
  };

  const getServicesForDay = (date: Date): Service[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredServices
      .filter((s) => s.service_date === dateStr)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getDayBackgroundColor = (serviceCount: number): string => {
    if (serviceCount === 0) return '';
    if (serviceCount <= 2) return 'bg-green-50';
    if (serviceCount <= 4) return 'bg-blue-50';
    return 'bg-yellow-50';
  };

  return (
    <div className="flex-1 bg-white p-3 sm:p-4 lg:p-6 overflow-auto">
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="pl-12 sm:pl-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {filteredServices.filter((s) => !s.is_lunch_block && s.status !== 'canceled').length} services scheduled
            {filters.getActiveFilterCount() > 0 && (
              <span className="ml-1 text-blue-600 font-medium">(Filtered)</span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={goToToday}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100"
          >
            Today
          </button>
          <div className="flex items-center space-x-1">
            <button
              onClick={previousMonth}
              className="p-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 text-gray-700 hover:bg-gray-100 active:bg-gray-200 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div key={day} className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-700">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayServices = getServicesForDay(day);
            const serviceCount = countDailyServices(dayServices, day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={idx}
                className={`min-h-20 sm:min-h-28 lg:min-h-32 border-b border-r border-gray-200 p-1 sm:p-2 ${getDayBackgroundColor(
                  serviceCount
                )} ${!isCurrentMonth ? 'bg-gray-50' : ''} cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors`}
                onClick={() => onDayClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      isToday
                        ? 'bg-blue-600 text-white w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full'
                        : !isCurrentMonth
                        ? 'text-gray-400'
                        : 'text-gray-900'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {serviceCount > 0 && (
                    <span
                      className={`text-[10px] sm:text-xs font-semibold px-1 sm:px-2 py-0.5 rounded-full ${
                        serviceCount > 4
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-blue-200 text-blue-800'
                      }`}
                    >
                      <span className="hidden sm:inline">{serviceCount}/4</span>
                      <span className="sm:hidden">{serviceCount}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-0.5 sm:space-y-1">
                  {dayServices.slice(0, 2).map((service) => (
                    <div
                      key={service.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onServiceClick(service);
                      }}
                      className="text-[10px] sm:text-xs p-0.5 sm:p-1 rounded cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity truncate"
                      style={{
                        backgroundColor: getServiceColor(service),
                        color: service.is_lunch_block ? '#6B7280' : 'white',
                      }}
                      title={`${service.client_name} - ${formatTime(service.start_time)}`}
                    >
                      <span className="mr-0.5 sm:mr-1">{getServiceIcon(service)}</span>
                      <span className="font-medium hidden sm:inline">{formatTime(service.start_time)}</span>
                      {!service.is_lunch_block && (
                        <span className="ml-1">{service.client_name}</span>
                      )}
                    </div>
                  ))}
                  {dayServices.length > 2 && (
                    <div className="text-[10px] sm:text-xs text-gray-600 font-medium pl-0.5 sm:pl-1">
                      +{dayServices.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
          <span className="text-gray-700">Scheduled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EF4444' }} />
          <span className="text-gray-700">Emergency</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }} />
          <span className="text-gray-700">Rescheduled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }} />
          <span className="text-gray-700">Recurring</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#E5E7EB' }} />
          <span className="text-gray-700">Lunch</span>
        </div>
      </div>
    </div>
  );
}
