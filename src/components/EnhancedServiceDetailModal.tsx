import { useState, useEffect } from 'react';
import { X, Edit, CheckCircle, Calendar, Trash2, StickyNote } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';
import { getServiceColor, getServiceIcon, getStatusBadgeColor, formatTime, canRescheduleService, getAvailableActions } from '../lib/utils';
import type { Service, ServiceNote, RescheduleHistory } from '../lib/database.types';
import { supabase } from '../lib/supabase';
import { RescheduleModal } from './RescheduleModal';
import { LunchBreakModal } from './LunchBreakModal';
import { isLunchBreak } from '../lib/lunchBreakUtils';

interface EnhancedServiceDetailModalProps {
  service: Service;
  onClose: () => void;
  onComplete?: (service: Service) => void;
  onDelete?: (service: Service) => void;
}

export function EnhancedServiceDetailModal({
  service,
  onClose,
  onComplete,
  onDelete,
}: EnhancedServiceDetailModalProps) {
  const [notes, setNotes] = useState<ServiceNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [rescheduleHistory, setRescheduleHistory] = useState<RescheduleHistory[]>([]);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showLunchEdit, setShowLunchEdit] = useState(false);
  const [loading, setLoading] = useState(false);

  const isLunch = isLunchBreak(service);
  const actions = getAvailableActions(service);

  useEffect(() => {
    loadNotes();
    loadRescheduleHistory();
  }, [service.id]);

  const loadNotes = async () => {
    const { data } = await supabase
      .from('service_notes')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false });

    if (data) setNotes(data);
  };

  const loadRescheduleHistory = async () => {
    const { data } = await supabase
      .from('reschedule_history')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false });

    if (data) setRescheduleHistory(data);
  };

  const addNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('service_notes').insert({
      service_id: service.id,
      note_text: newNote.trim(),
    });

    if (!error) {
      toast.success('Note added');
      setNewNote('');
      await loadNotes();
    } else {
      toast.error('Failed to add note');
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
          <div
            className="p-4 sm:p-6 rounded-t-lg text-white"
            style={{ backgroundColor: getServiceColor(service) }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl sm:text-3xl">{getServiceIcon(service)}</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {isLunch ? 'Lunch Break' : service.client_name}
                  </h2>
                  <p className="text-xs sm:text-sm opacity-90">
                    {format(parseISO(service.service_date), 'EEEE, MMM d, yyyy')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {!isLunch && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Status</label>
                    <div className="mt-1">
                      <span
                        className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusBadgeColor(
                          service.status
                        )}`}
                      >
                        {service.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Type</label>
                    <p className="mt-1 text-sm sm:text-base font-semibold capitalize text-gray-900">
                      {service.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Start Time</label>
                    <p className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
                      {formatTime(service.start_time)}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-600">Duration</label>
                    <p className="mt-1 text-base sm:text-lg font-semibold text-gray-900">
                      {service.duration_minutes} min
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium text-gray-600">Address</label>
                  <p className="mt-1 text-sm sm:text-base text-gray-900">{service.address}</p>
                </div>

                {rescheduleHistory.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Reschedule History ({rescheduleHistory.length})
                    </h3>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {rescheduleHistory.map((history) => (
                        <div key={history.id} className="bg-orange-50 border border-orange-200 rounded p-2 text-xs sm:text-sm">
                          <p className="text-orange-900">
                            <span className="font-medium">From:</span> {format(new Date(history.original_date), 'MMM d')} at {history.original_time}
                          </p>
                          <p className="text-orange-900">
                            <span className="font-medium">To:</span> {format(new Date(history.new_date), 'MMM d')} at {history.new_time}
                          </p>
                          {history.reason && (
                            <p className="text-orange-700 mt-1">{history.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Notes
                  </h3>

                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {notes.length === 0 && (
                      <p className="text-sm text-gray-400 italic">No notes yet</p>
                    )}
                    {notes.map((note) => (
                      <div key={note.id} className="bg-gray-50 border border-gray-200 rounded p-3">
                        <p className="text-sm text-gray-800">{note.note_text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      rows={2}
                      className="flex-1 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addNote}
                      disabled={!newNote.trim() || loading}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            )}

            {isLunch && (
              <div className="flex justify-center pt-4 border-t border-dashed border-gray-300">
                <button
                  onClick={() => setShowLunchEdit(true)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white rounded-lg flex items-center justify-center gap-2 font-semibold min-h-[44px]"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Change Time</span>
                </button>
              </div>
            )}

            {service.status === 'completed' && !isLunch && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Service Completed</p>
                    <p className="text-xs text-green-700 mt-1">
                      This service has been completed. You can edit details or add notes, but cannot reschedule.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLunch && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                {onDelete && actions.canDelete && (
                  <button
                    onClick={() => onDelete(service)}
                    className="px-4 py-2.5 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 active:bg-red-100 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}

                {actions.canReschedule && (
                  <button
                    onClick={() => setShowReschedule(true)}
                    className="px-4 py-2.5 text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 active:bg-blue-100 flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Reschedule</span>
                  </button>
                )}

                {onComplete && actions.canMarkCompleted && (
                  <button
                    onClick={() => onComplete(service)}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg flex items-center justify-center gap-2 font-semibold min-h-[44px]"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReschedule && !isLunch && (
        <RescheduleModal
          service={service}
          onClose={() => setShowReschedule(false)}
          onRescheduled={() => {
            loadRescheduleHistory();
            onClose();
          }}
        />
      )}

      {showLunchEdit && isLunch && (
        <LunchBreakModal
          lunchBreak={service}
          onClose={() => setShowLunchEdit(false)}
          onUpdate={() => {
            onClose();
          }}
        />
      )}
    </>
  );
}
