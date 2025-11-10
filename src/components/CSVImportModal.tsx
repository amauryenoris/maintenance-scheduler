import { useState } from 'react';
import { X, Upload, Check, AlertTriangle, Info, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { toast } from 'react-hot-toast';
import { useServicesStore } from '../store/servicesStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  parseCSV,
  detectCheesecakeFactory,
  autoDetectZone,
  distributeVisits,
  type ImportClient,
  type CSVRow,
  type DistributionResult,
} from '../lib/csvImportUtils';

interface CSVImportModalProps {
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'settings' | 'review' | 'importing';

export function CSVImportModal({ onClose }: CSVImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [csvFile, setCSVFile] = useState<File | null>(null);
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [clients, setClients] = useState<ImportClient[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);

  const getDefaultMonth = () => {
    const today = new Date();
    if (today.getDate() > 15) {
      return addMonths(today, 1);
    }
    return today;
  };

  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth().getMonth());
  const [selectedYear, setSelectedYear] = useState(getDefaultMonth().getFullYear());

  const { addService } = useServicesStore();
  const { settings } = useSettingsStore();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCSVFile(file);
    const text = await file.text();
    const parsed = parseCSV(text);
    setCSVData(parsed);

    const importClients: ImportClient[] = parsed.map(row => {
      const isCheesecake = detectCheesecakeFactory(row['Account Name']);
      const zone = autoDetectZone(row['Address']);

      return {
        clientName: row['Account Name'],
        accountNumber: row['Account Number'],
        address: row['Address'],
        siteName: row['Customer Site'],
        selected: true,
        visitsPerMonth: isCheesecake ? 4 : 1,
        duration: 120,
        zone,
        isRecurring: isCheesecake,
        fixedDayOfWeek: isCheesecake ? 3 : undefined,
        fixedTime: isCheesecake ? '10:00' : undefined,
        dishwasherModel: 'Hobart CXL',
      };
    });

    setClients(importClients);
    setStep('preview');
  };

  const handleDistribute = () => {
    const monthDate = new Date(selectedYear, selectedMonth, 1);
    const result = distributeVisits(
      clients,
      monthDate,
      { max_daily_services: settings?.max_daily_services || 4, max_weekly_hours: settings?.max_weekly_hours || 50 }
    );
    setDistributionResult(result);
    setStep('review');
  };

  const getWorkDaysCount = () => {
    const start = startOfMonth(new Date(selectedYear, selectedMonth));
    const end = endOfMonth(new Date(selectedYear, selectedMonth));
    const allDays = eachDayOfInterval({ start, end });
    return allDays.filter(day => !isWeekend(day)).length;
  };

  const getMonthName = (month: number) => {
    return format(new Date(2000, month, 1), 'MMMM');
  };

  const setToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  const setToNextMonth = () => {
    const next = addMonths(new Date(), 1);
    setSelectedMonth(next.getMonth());
    setSelectedYear(next.getFullYear());
  };

  const handleImport = async () => {
    if (!distributionResult) return;

    setStep('importing');

    try {
      for (const service of distributionResult.services) {
        await addService(service);
      }

      toast.success(`Successfully imported ${distributionResult.summary.clientsImported} clients and scheduled ${distributionResult.summary.totalVisits} visits`);
      onClose();
    } catch (error) {
      toast.error('Failed to import services');
      setStep('review');
    }
  };

  const toggleClientSelection = (index: number) => {
    const updated = [...clients];
    updated[index].selected = !updated[index].selected;
    setClients(updated);
  };

  const updateClientSettings = (index: number, field: keyof ImportClient, value: any) => {
    const updated = [...clients];
    updated[index] = { ...updated[index], [field]: value };
    setClients(updated);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Import Clients from CSV
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload CSV File
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Expected columns: Account Name, Account Number, Address, Customer Site
                </p>
                <label className="inline-block">
                  <span className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 active:bg-blue-800">
                    Select CSV File
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>{clients.length} clients</strong> found in file
                </p>
                {clients.some(c => c.isRecurring) && (
                  <p className="text-sm text-green-700 mt-2 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Cheesecake Factory detected - Set to weekly Wednesdays at 10:00 AM
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-4 sm:p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-gray-900">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                  Select Month to Schedule Services
                </h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <button
                    onClick={setToCurrentMonth}
                    className="px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 active:bg-blue-100 text-sm font-medium"
                  >
                    This Month
                  </button>
                  <button
                    onClick={setToNextMonth}
                    className="px-4 py-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 active:bg-blue-100 text-sm font-medium"
                  >
                    Next Month
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i}>
                          {getMonthName(i)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                      <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                      <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                      <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-blue-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Services will be scheduled for:</span>
                    <span className="font-bold text-lg text-gray-900">
                      {getMonthName(selectedMonth)} {selectedYear}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Work days in this month: <span className="font-semibold">{getWorkDaysCount()}</span> days
                  </div>
                </div>

                <div className="mt-3 bg-blue-100 border border-blue-300 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-sm">
                    <Info className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-900">
                      The <strong>{clients.filter(c => c.selected).length} clients</strong> will be distributed across{' '}
                      <strong>{getMonthName(selectedMonth)} {selectedYear}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={clients.every(c => c.selected)}
                          onChange={(e) => {
                            const updated = clients.map(c => ({ ...c, selected: e.target.checked }));
                            setClients(updated);
                          }}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-3 py-2 text-left">Client</th>
                      <th className="px-3 py-2 text-left">Address</th>
                      <th className="px-3 py-2 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client, idx) => (
                      <tr key={idx} className="border-t border-gray-200">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={client.selected}
                            onChange={() => toggleClientSelection(idx)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2">{client.clientName}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{client.address}</td>
                        <td className="px-3 py-2">
                          {client.isRecurring ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                              Weekly
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                              {client.visitsPerMonth}x/month
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
                >
                  Back
                </button>
                <button
                  onClick={handleDistribute}
                  disabled={!clients.some(c => c.selected)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[44px]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 'review' && distributionResult && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">Scheduling for:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700">Total Visits</div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {distributionResult.summary.totalVisits}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700">Clients</div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {distributionResult.summary.clientsImported}
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-700">Recurring</div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {distributionResult.summary.recurringClients}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-700">Avg/Day</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {distributionResult.summary.averageServicesPerDay}
                  </div>
                </div>
              </div>

              {!distributionResult.summary.maxDayExceeded && !distributionResult.summary.maxWeekExceeded ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-900">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">All validations passed!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    No days exceed 4 services and all weeks are under 50 hours
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900">Warnings</p>
                      <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                        {distributionResult.summary.maxDayExceeded && (
                          <li>• Some days exceed the maximum of 4 services</li>
                        )}
                        {distributionResult.summary.maxWeekExceeded && (
                          <li>• Month may exceed recommended weekly hours</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {distributionResult.summary.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-yellow-900 text-sm mb-2">Scheduling Warnings:</p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    {distributionResult.summary.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <button
                  onClick={() => setStep('preview')}
                  className="w-full sm:w-auto px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold min-h-[44px]"
                >
                  Confirm Import
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-900">Importing services...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we schedule all visits</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
