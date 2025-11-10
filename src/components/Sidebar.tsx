import { Calendar, Plus, AlertTriangle, Clock, TrendingUp, X, Upload, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useServicesStore } from '../store/servicesStore';
import { useSettingsStore } from '../store/settingsStore';
import { useFiltersStore } from '../store/filtersStore';
import { calculateWeeklyHours, countWeeklyServices, countMonthlyServices, getWeekRange } from '../lib/utils';
import { getFilteredServices } from '../lib/filterUtils';
import { getTodayPendingCount } from '../lib/endOfDayUtils';
import { format, startOfWeek } from 'date-fns';
import { FilterPanel } from './FilterPanel';

interface SidebarProps {
  onNewService: () => void;
  onNewEmergency: () => void;
  currentDate: Date;
  onClose?: () => void;
  isMobileOpen?: boolean;
  onImportCSV?: () => void;
  onClearMonth?: () => void;
  onShowPendingServices?: () => void;
}

export function Sidebar({ onNewService, onNewEmergency, currentDate, onClose, isMobileOpen, onImportCSV, onClearMonth, onShowPendingServices }: SidebarProps) {
  const { services } = useServicesStore();
  const { settings } = useSettingsStore();
  const filters = useFiltersStore();

  const filteredServices = getFilteredServices(services, filters);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const { start, end } = getWeekRange(currentDate);

  const weeklyHours = calculateWeeklyHours(filteredServices, weekStart);
  const weeklyServices = countWeeklyServices(filteredServices, weekStart);
  const { completed: completedMonth, total: totalMonth } = countMonthlyServices(filteredServices, currentDate);

  const maxHours = settings?.max_weekly_hours || 50;
  const hoursPercentage = (weeklyHours / maxHours) * 100;
  const isFiltered = filters.getActiveFilterCount() > 0;

  const getHoursColor = () => {
    if (weeklyHours > maxHours) return 'text-red-600';
    if (weeklyHours > 48) return 'text-red-500';
    if (weeklyHours > 40) return 'text-yellow-500';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (weeklyHours > maxHours) return 'bg-red-600';
    if (weeklyHours > 48) return 'bg-red-500';
    if (weeklyHours > 40) return 'bg-yellow-500';
    return 'bg-green-600';
  };

  const monthPercentage = totalMonth > 0 ? (completedMonth / totalMonth) * 100 : 0;

  const emergencies = filteredServices.filter(
    (s) => s.type === 'emergency' || s.priority === 'emergency'
  );
  const rescheduled = filteredServices.filter((s) => s.status === 'rescheduled' && s.service_date >= format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="w-80 max-w-[90vw] sm:w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col">
      {/* Mobile: Close button */}
      {isMobileOpen && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          aria-label="Close sidebar"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>
      )}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            AS
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Andres Solis</h2>
            <p className="text-sm text-gray-500">Technician</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        <button
          onClick={onNewEmergency}
          className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <AlertTriangle className="w-5 h-5" />
          <span>🚨 New Emergency</span>
        </button>

        <button
          onClick={onNewService}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Service</span>
        </button>

        {onImportCSV && (
          <button
            onClick={onImportCSV}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Import CSV</span>
          </button>
        )}
      </div>

      <FilterPanel />

      <div className="px-6 pb-6 space-y-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Current Week</h3>
            </div>
            {isFiltered && (
              <span className="text-xs text-blue-600 font-medium">Filtered</span>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-2">
            {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
          </div>

          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className={`text-3xl font-bold ${getHoursColor()}`}>
                {weeklyHours.toFixed(1)}h
              </span>
              <span className="text-sm text-gray-600">/ {maxHours}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(hoursPercentage, 100)}%` }}
              />
            </div>
          </div>

          {weeklyHours > 48 && (
            <div className="flex items-start space-x-2 bg-red-50 border border-red-200 rounded p-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-800">
                {weeklyHours > maxHours
                  ? '⚠️ Exceeded weekly limit!'
                  : '⚠️ Approaching weekly limit'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-gray-600">Services</div>
              <div className="font-semibold text-gray-900">{weeklyServices} visits</div>
            </div>
            <div>
              <div className="text-gray-600">Avg/Day</div>
              <div className="font-semibold text-gray-900">
                {weeklyServices > 0 ? (weeklyServices / 5).toFixed(1) : '0.0'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center space-x-2 mb-3">
            <Calendar className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Current Month</h3>
          </div>

          <div className="text-sm text-gray-600 mb-3">
            {format(currentDate, 'MMMM yyyy')}
          </div>

          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-3xl font-bold text-green-600">{completedMonth}</span>
              <span className="text-sm text-gray-600">/ {totalMonth} visits</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${monthPercentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-700">{completedMonth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending</span>
              <span className="font-semibold text-blue-700">
                {services.filter(
                  (s) =>
                    s.service_date.startsWith(format(currentDate, 'yyyy-MM')) &&
                    s.status === 'scheduled' &&
                    !s.is_lunch_block
                ).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emergencies</span>
              <span className="font-semibold text-red-700">{emergencies.length}</span>
            </div>
          </div>
        </div>

        {onShowPendingServices && (() => {
          const todayPendingCount = getTodayPendingCount(services);
          return todayPendingCount > 0 ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Today's Services</h3>
                </div>
              </div>
              <div className="mb-3">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {todayPendingCount}
                </div>
                <p className="text-sm text-gray-700">
                  service{todayPendingCount !== 1 ? 's' : ''} pending completion
                </p>
              </div>
              <button
                onClick={onShowPendingServices}
                className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Review Pending Services
              </button>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex flex-col items-center justify-center py-2">
                <CheckCircle className="w-10 h-10 text-green-600 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">All Done!</h3>
                <p className="text-sm text-green-700 text-center">
                  All today's services completed
                </p>
              </div>
            </div>
          );
        })()}

        {rescheduled.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">Rescheduled</h3>
            </div>
            <p className="text-sm text-gray-700">
              {rescheduled.length} service{rescheduled.length !== 1 ? 's' : ''} pending
            </p>
          </div>
        )}

        {onClearMonth && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Manage</h3>
            <button
              onClick={onClearMonth}
              className="w-full bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Month Events</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Remove all events for {format(currentDate, 'MMMM yyyy')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
