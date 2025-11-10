import { CheckCircle, Clock, AlertTriangle, Calendar, RotateCcw, X, Filter } from 'lucide-react';
import { useFiltersStore } from '../store/filtersStore';
import { useServicesStore } from '../store/servicesStore';
import { getStatusCount } from '../lib/filterUtils';

export function FilterPanel() {
  const {
    showCompleted,
    showPending,
    showEmergencies,
    showRescheduled,
    showRecurring,
    showCanceled,
    showLunchBlocks,
    toggleFilter,
    selectAll,
    clearAll,
    reset,
    getActiveFilterCount,
  } = useFiltersStore();

  const { services } = useServicesStore();

  const activeFiltersCount = getActiveFilterCount();
  const allFiltersActive = activeFiltersCount === 0;

  const filters = [
    {
      key: 'showCompleted' as const,
      label: 'Completed',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
      count: getStatusCount(services, 'completed'),
      checked: showCompleted,
    },
    {
      key: 'showPending' as const,
      label: 'Pending',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-300',
      count: getStatusCount(services, 'pending'),
      checked: showPending,
    },
    {
      key: 'showEmergencies' as const,
      label: 'Emergencies',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      count: getStatusCount(services, 'emergency'),
      checked: showEmergencies,
    },
    {
      key: 'showRescheduled' as const,
      label: 'Rescheduled',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      count: getStatusCount(services, 'rescheduled'),
      checked: showRescheduled,
    },
    {
      key: 'showRecurring' as const,
      label: 'Recurring',
      icon: RotateCcw,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-300',
      count: getStatusCount(services, 'recurring'),
      checked: showRecurring,
    },
    {
      key: 'showCanceled' as const,
      label: 'Canceled',
      icon: X,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-300',
      count: getStatusCount(services, 'canceled'),
      checked: showCanceled,
    },
  ];

  const totalServices = services.filter((s) => !s.is_lunch_block).length;
  const visibleCount = filters.reduce((sum, filter) => (filter.checked ? sum + filter.count : sum), 0);

  return (
    <div className="border-t border-b border-gray-200 bg-white">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
            <h3 className="font-semibold text-gray-900 text-xs sm:text-sm">Filter Services</h3>
            {!allFiltersActive && (
              <span className="px-1.5 sm:px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] sm:text-xs font-medium rounded-full">
                {activeFiltersCount} hidden
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2 text-[10px] sm:text-xs">
            <button
              onClick={selectAll}
              className="text-blue-600 hover:text-blue-700 active:text-blue-800 font-medium"
              aria-label="Select all filters"
            >
              All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAll}
              className="text-gray-600 hover:text-gray-700 active:text-gray-800 font-medium"
              aria-label="Clear all filters"
            >
              None
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={reset}
              className="text-gray-600 hover:text-gray-700 active:text-gray-800 font-medium"
              aria-label="Reset filters"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            return (
              <label
                key={filter.key}
                className={`flex items-center justify-between p-1.5 sm:p-2 rounded-lg border transition-all cursor-pointer min-h-[44px] ${
                  filter.checked
                    ? `${filter.bgColor} ${filter.borderColor} hover:shadow-sm active:shadow-md`
                    : 'bg-gray-50 border-gray-200 opacity-60 hover:opacity-80 active:opacity-70'
                }`}
              >
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                  <input
                    type="checkbox"
                    checked={filter.checked}
                    onChange={() => toggleFilter(filter.key)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    aria-label={`Filter ${filter.label.toLowerCase()} services`}
                  />
                  <Icon className={`w-3 h-3 sm:w-4 sm:h-4 ${filter.checked ? filter.color : 'text-gray-400'}`} />
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      filter.checked ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {filter.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                    filter.checked ? filter.color : 'text-gray-400'
                  } ${filter.checked ? filter.bgColor : 'bg-gray-100'}`}
                >
                  {filter.count}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{visibleCount}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalServices}</span> services
            </span>
            {!allFiltersActive && (
              <span className="flex items-center space-x-1 text-blue-600">
                <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="font-medium hidden sm:inline">Filters active</span>
                <span className="font-medium sm:hidden">Active</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
