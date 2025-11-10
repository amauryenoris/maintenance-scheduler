import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Menu, Plus, AlertTriangle } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { DailyView } from './components/DailyView';
import { ServiceForm } from './components/ServiceForm';
import { EnhancedServiceDetailModal } from './components/EnhancedServiceDetailModal';
import { EmergencyRescheduleModal } from './components/EmergencyRescheduleModal';
import { CSVImportModal } from './components/CSVImportModal';
import { ClearMonthModal } from './components/ClearMonthModal';
import { EndOfDayAlert } from './components/EndOfDayAlert';
import { RescheduleModal } from './components/RescheduleModal';
import { useServicesStore } from './store/servicesStore';
import { useRecurringClientsStore } from './store/recurringClientsStore';
import { useSettingsStore } from './store/settingsStore';
import { formatDate } from './lib/utils';
import { checkEndOfDayPendingServices, hasSeenAlertToday, markAlertSeenToday, clearAlertSeenToday } from './lib/endOfDayUtils';
import { addDays, startOfDay } from 'date-fns';
import type { Service, ServiceInsert } from './lib/database.types';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [emergencyData, setEmergencyData] = useState<ServiceInsert | null>(null);
  const [conflictingServices, setConflictingServices] = useState<Service[]>([]);
  const [showDailyView, setShowDailyView] = useState(false);
  const [dailyViewDate, setDailyViewDate] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showClearMonth, setShowClearMonth] = useState(false);
  const [showEndOfDayAlert, setShowEndOfDayAlert] = useState(false);
  const [pendingServices, setPendingServices] = useState<Service[]>([]);
  const [serviceToReschedule, setServiceToReschedule] = useState<Service | null>(null);

  const { services, fetchServices, addService, updateService, deleteService, getConflictingServices } = useServicesStore();
  const { fetchRecurringClients } = useRecurringClientsStore();
  const { settings, fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchServices();
    fetchRecurringClients();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!settings || !services.length) return;

    if (!settings.end_of_day_alert_enabled) return;

    const checkPendingServices = () => {
      const pending = checkEndOfDayPendingServices(services, settings.end_of_day_alert_hour);

      if (pending.length > 0 && !hasSeenAlertToday()) {
        setPendingServices(pending);
        if (settings.auto_show_alert_on_open) {
          setShowEndOfDayAlert(true);
        }
      }
    };

    checkPendingServices();

    const interval = setInterval(() => {
      checkPendingServices();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [services, settings]);

  useEffect(() => {
    const now = new Date();
    const tomorrow = addDays(startOfDay(now), 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      clearAlertSeenToday();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const handleNewService = () => {
    setIsEmergencyMode(false);
    setShowServiceForm(true);
  };

  const handleNewEmergency = () => {
    setIsEmergencyMode(true);
    setShowServiceForm(true);
  };

  const handleServiceSubmit = async (serviceData: ServiceInsert) => {
    if (isEmergencyMode) {
      const conflicts = getConflictingServices(
        serviceData.service_date,
        serviceData.start_time,
        serviceData.duration_minutes
      );

      if (conflicts.length > 0) {
        setEmergencyData(serviceData);
        setConflictingServices(conflicts);
        setShowServiceForm(false);
        return;
      }
    }

    const newService = await addService(serviceData);

    if (newService) {
      if (serviceData.is_lunch_block) {
        toast.success('Lunch block added successfully');
      } else {
        toast.success(`Service scheduled for ${serviceData.client_name}`);
      }

      const serviceDate = new Date(serviceData.service_date);
      const dayServices = services.filter(
        (s) => s.service_date === serviceData.service_date && !s.is_lunch_block
      );

      if (dayServices.length === 0 && !serviceData.is_lunch_block) {
        const lunchService: ServiceInsert = {
          type: 'scheduled_maintenance',
          client_name: 'Lunch Break',
          dishwasher_model: 'N/A',
          service_date: serviceData.service_date,
          start_time: '12:00',
          duration_minutes: 60,
          zone: 'other',
          address: 'N/A',
          notes: 'Automatic lunch block',
          status: 'scheduled',
          priority: 'normal',
          is_lunch_block: true,
        };

        await addService(lunchService);
      }
    }

    setShowServiceForm(false);
  };

  const handleEmergencyConfirm = async (
    emergency: ServiceInsert,
    rescheduled: Array<{ service: Service; newDate: string; newTime: string }>
  ) => {
    const emergencyService = await addService(emergency);

    if (emergencyService) {
      for (const { service, newDate, newTime } of rescheduled) {
        await updateService(service.id, {
          service_date: newDate,
          start_time: newTime,
          status: 'rescheduled',
          rescheduled_from: service.service_date,
          rescheduled_reason: `Rescheduled due to emergency - ${emergency.client_name}`,
        });
      }

      toast.success(
        `Emergency scheduled and ${rescheduled.length} service${
          rescheduled.length !== 1 ? 's' : ''
        } rescheduled`
      );
    }

    setEmergencyData(null);
    setConflictingServices([]);
  };

  const handleEmergencyCancel = () => {
    setEmergencyData(null);
    setConflictingServices([]);
    setShowServiceForm(true);
  };

  const handleServiceClick = (service: Service) => {
    setSelectedService(service);
  };

  const handleServiceComplete = async (service: Service) => {
    await updateService(service.id, { status: 'completed' });
    toast.success(`${service.client_name} marked as completed`);
    setSelectedService(null);
  };

  const handleServiceDelete = async (service: Service) => {
    if (confirm(`Are you sure you want to delete the service for ${service.client_name}?`)) {
      await deleteService(service.id);
      toast.success('Service deleted');
      setSelectedService(null);
    }
  };

  const handleDayClick = (date: Date) => {
    setDailyViewDate(date);
    setShowDailyView(true);
  };

  const handleShowToday = () => {
    const today = new Date();
    setDailyViewDate(today);
    setShowDailyView(true);
  };

  const handleEndOfDayRemindLater = () => {
    setShowEndOfDayAlert(false);
    toast.info('Will remind you in 30 minutes');

    setTimeout(() => {
      if (settings && settings.end_of_day_alert_enabled) {
        const pending = checkEndOfDayPendingServices(services, settings.end_of_day_alert_hour);
        if (pending.length > 0) {
          setPendingServices(pending);
          setShowEndOfDayAlert(true);
          toast.warning('Reminder: You still have pending services');
        }
      }
    }, 30 * 60 * 1000);
  };

  const handleEndOfDayDismiss = () => {
    setShowEndOfDayAlert(false);
    markAlertSeenToday();
    toast.info('You can review pending services from the dashboard');
  };

  const handleEndOfDayReschedule = (service: Service) => {
    setShowEndOfDayAlert(false);
    setServiceToReschedule(service);
  };

  const handleEndOfDayViewDetails = (service: Service) => {
    setShowEndOfDayAlert(false);
    setSelectedService(service);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile: Hamburger Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-3 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile: Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - Responsive */}
      <div
        className={`
          fixed lg:relative top-0 left-0 h-full z-50 lg:z-auto
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          onNewService={handleNewService}
          onNewEmergency={handleNewEmergency}
          currentDate={currentDate}
          onClose={() => setIsSidebarOpen(false)}
          isMobileOpen={isSidebarOpen}
          onImportCSV={() => {
            setShowCSVImport(true);
            setIsSidebarOpen(false);
          }}
          onClearMonth={() => {
            setShowClearMonth(true);
            setIsSidebarOpen(false);
          }}
          onShowPendingServices={() => {
            const pending = checkEndOfDayPendingServices(services, settings?.end_of_day_alert_hour || 17);
            if (pending.length > 0) {
              setPendingServices(pending);
              setShowEndOfDayAlert(true);
            }
            setIsSidebarOpen(false);
          }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <Calendar
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onServiceClick={handleServiceClick}
          onDayClick={handleDayClick}
          onShowToday={handleShowToday}
        />
      </div>

      {/* Mobile: Floating Action Buttons */}
      <div className="lg:hidden fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        <button
          onClick={handleNewEmergency}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-xl transition-all active:scale-95"
          aria-label="New emergency"
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
        <button
          onClick={handleNewService}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-xl transition-all active:scale-95"
          aria-label="New service"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {showServiceForm && (
        <ServiceForm
          onClose={() => setShowServiceForm(false)}
          onSubmit={handleServiceSubmit}
          isEmergency={isEmergencyMode}
          defaultDate={currentDate}
        />
      )}

      {emergencyData && conflictingServices.length > 0 && (
        <EmergencyRescheduleModal
          emergencyData={emergencyData}
          conflictingServices={conflictingServices}
          onConfirm={handleEmergencyConfirm}
          onCancel={handleEmergencyCancel}
        />
      )}

      {selectedService && (
        <EnhancedServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onComplete={handleServiceComplete}
          onDelete={handleServiceDelete}
        />
      )}

      {showCSVImport && (
        <CSVImportModal
          onClose={() => setShowCSVImport(false)}
        />
      )}

      {showClearMonth && (
        <ClearMonthModal
          onClose={() => setShowClearMonth(false)}
          currentDate={currentDate}
        />
      )}

      {showDailyView && (
        <DailyView
          date={dailyViewDate}
          onClose={() => setShowDailyView(false)}
          onServiceClick={handleServiceClick}
          onAddService={() => {
            setShowDailyView(false);
            handleNewService();
          }}
        />
      )}

      {showEndOfDayAlert && pendingServices.length > 0 && (
        <EndOfDayAlert
          pendingServices={pendingServices}
          onClose={() => setShowEndOfDayAlert(false)}
          onRemindLater={handleEndOfDayRemindLater}
          onDismiss={handleEndOfDayDismiss}
          onReschedule={handleEndOfDayReschedule}
          onViewDetails={handleEndOfDayViewDetails}
        />
      )}

      {serviceToReschedule && (
        <RescheduleModal
          service={serviceToReschedule}
          onClose={() => setServiceToReschedule(null)}
          onRescheduled={() => {
            setServiceToReschedule(null);
            fetchServices();
          }}
        />
      )}

      <Toaster position="top-right" />
    </div>
  );
}

export default App;
