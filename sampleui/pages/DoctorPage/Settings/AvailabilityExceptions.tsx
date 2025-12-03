import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useUserStore } from '../../../stores/useUserStore';
import type { DoctorData, AvailabilityException, CreateAvailabilityExceptionRequest, UpdateAvailabilityExceptionRequest } from '../../../utils/types';
import { getAvailabilityExceptions, createAvailabilityException, updateAvailabilityException, deleteAvailabilityException } from '../../../services/availabilityExceptionsService';
import TimePicker from '../../../components/TimePicker';

const AvailabilityExceptions = () => {
  const { userData } = useUserStore();
  const doctorId = (userData as DoctorData)?.id;

  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingException, setEditingException] = useState<AvailabilityException | null>(null);
  
  // Delete confirmation modal state
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    exception: AvailabilityException | null;
  }>({
    isOpen: false,
    exception: null,
  });
  
  // Form state
  const [formData, setFormData] = useState({
    exception_date: '',
    end_date: '',
    is_all_day: true,
    start_time: '08:00 AM',
    end_time: '06:00 PM',
    reason: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load exceptions on mount
  useEffect(() => {
    if (doctorId) {
      loadExceptions();
    }
  }, [doctorId]);

  const loadExceptions = async () => {
    if (!doctorId) return;

    try {
      setIsLoading(true);
      setError('');
      const data = await getAvailabilityExceptions(doctorId);
      setExceptions(data);
    } catch (err: any) {
      console.error('Error loading exceptions:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to load off days. Please try again.';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert 24-hour time to 12-hour format
  const convertTo12Hour = (time24Hour: string | null | undefined): string => {
    if (!time24Hour) return '08:00 AM';
    const [hours, minutes] = time24Hour.split(':');
    const hour24 = parseInt(hours);
    let hour12 = hour24;
    let period = 'AM';
    
    if (hour24 === 0) {
      hour12 = 12;
    } else if (hour24 === 12) {
      period = 'PM';
    } else if (hour24 > 12) {
      hour12 = hour24 - 12;
      period = 'PM';
    }
    
    return `${hour12}:${minutes} ${period}`;
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12Hour: string): string => {
    const [time, period] = time12Hour.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes}:00Z`;
  };

  const openCreateModal = () => {
    setEditingException(null);
    setFormData({
      exception_date: '',
      end_date: '',
      is_all_day: true,
      start_time: '08:00 AM',
      end_time: '06:00 PM',
      reason: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (exception: AvailabilityException) => {
    setEditingException(exception);
    setFormData({
      exception_date: exception.exception_date,
      end_date: exception.end_date || '',
      is_all_day: exception.is_all_day,
      start_time: exception.start_time ? convertTo12Hour(exception.start_time) : '08:00 AM',
      end_time: exception.end_time ? convertTo12Hour(exception.end_time) : '06:00 PM',
      reason: exception.reason || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingException(null);
    setFormData({
      exception_date: '',
      end_date: '',
      is_all_day: true,
      start_time: '08:00 AM',
      end_time: '06:00 PM',
      reason: '',
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const today = getTodayDate();

    if (!formData.exception_date) {
      errors.exception_date = 'Date is required';
    } else if (formData.exception_date < today) {
      errors.exception_date = 'Cannot select past dates';
    }

    const minEndDate = formData.exception_date || today;
    
    if (formData.end_date && formData.end_date < minEndDate) {
      errors.end_date = 'End date must be on or after the start date';
    } else if (formData.end_date && formData.end_date < today) {
      errors.end_date = 'Cannot select past dates';
    }

    if (!formData.is_all_day) {
      if (!formData.start_time) {
        errors.start_time = 'Start time is required when not all-day';
      }
      if (!formData.end_time) {
        errors.end_time = 'End time is required when not all-day';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !doctorId) {
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      if (editingException) {
        // Update existing exception
        const updateData: UpdateAvailabilityExceptionRequest = {
          exception_date: formData.exception_date,
          end_date: formData.end_date || null,
          is_all_day: formData.is_all_day,
          start_time: formData.is_all_day ? null : convertTo24Hour(formData.start_time),
          end_time: formData.is_all_day ? null : convertTo24Hour(formData.end_time),
          reason: formData.reason || null,
        };

        await updateAvailabilityException(editingException.id, updateData);
      } else {
        // Create new exception
        const createData: CreateAvailabilityExceptionRequest = {
          doctor_id: doctorId,
          exception_date: formData.exception_date,
          end_date: formData.end_date || null,
          is_all_day: formData.is_all_day,
          start_time: formData.is_all_day ? null : convertTo24Hour(formData.start_time),
          end_time: formData.is_all_day ? null : convertTo24Hour(formData.end_time),
          reason: formData.reason || null,
        };

        await createAvailabilityException(createData);
      }

      closeModal();
      await loadExceptions();
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    } catch (err: any) {
      console.error('Error saving exception:', err);
      let errorMsg = 'Failed to save off day. Please try again.';
      
      // Check for specific error messages from API
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (detail.includes('already exists') || detail === 'Exception already exists') {
          errorMsg = 'This off day already exists for the selected date(s).';
        } else {
          errorMsg = detail;
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      }
      
      setFormErrors({ general: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (exception: AvailabilityException) => {
    setDeleteConfirmModal({
      isOpen: true,
      exception,
    });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmModal({
      isOpen: false,
      exception: null,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmModal.exception) return;

    try {
      await deleteAvailabilityException(deleteConfirmModal.exception.id);
      await loadExceptions();
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
      closeDeleteConfirm();
    } catch (err: any) {
      console.error('Error deleting exception:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to delete off day. Please try again.';
      setError(errorMsg);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string | null | undefined): string => {
    if (!timeString) return '';
    return convertTo12Hour(timeString);
  };

  const getDateRangeDisplay = (exception: AvailabilityException): string => {
    if (exception.end_date && exception.end_date !== exception.exception_date) {
      return `${formatDate(exception.exception_date)} - ${formatDate(exception.end_date)}`;
    }
    return formatDate(exception.exception_date);
  };

  const getTimeRangeDisplay = (exception: AvailabilityException): string => {
    if (exception.is_all_day) {
      return 'All Day';
    }
    if (exception.start_time && exception.end_time) {
      return `${formatTime(exception.start_time)} - ${formatTime(exception.end_time)}`;
    }
    return 'Time not specified';
  };

  if (!doctorId) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="text-center text-gray-500">
          <p>Doctor ID not found. Please log in again.</p>
        </div>
      </div>
    );
  }

  // Separate US holidays and personal off days
  const usHolidays = exceptions
    .filter(exception => exception.is_us_holiday === true)
    .sort((a, b) => {
      // Sort by exception_date (ascending - earliest first)
      const dateA = new Date(a.exception_date).getTime();
      const dateB = new Date(b.exception_date).getTime();
      return dateA - dateB;
    });
  const personalOffDays = exceptions.filter(exception => !exception.is_us_holiday);

  const renderExceptionsTable = (exceptionsList: AvailabilityException[], emptyMessage: string) => {
    if (exceptionsList.length === 0) {
      return (
        <div className="p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F4F8FB]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">Date(s)</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">Time Range</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 tracking-wider">Reason</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exceptionsList.map((exception) => (
              <tr key={exception.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getDateRangeDisplay(exception)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {getTimeRangeDisplay(exception)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {exception.reason || <span className="text-gray-400 italic">No reason provided</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(exception)}
                      className="text-[#098289] hover:text-[#07666d] transition-colors"
                      title="Edit off day"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(exception)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Delete off day"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Off Days</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your off days and time off</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#098289] text-white rounded-lg hover:bg-[#07666d] transition-colors font-semibold text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Off Day
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 font-medium">Off day saved successfully!</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-700 font-medium">{error}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#098289]"></div>
              <span className="text-gray-600">Loading off days...</span>
            </div>
          </div>
        </div>
      )}

      {/* US Holidays and Personal Off Days - Side by Side */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* US Holidays Container */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-[#F4F8FB]">
              <h3 className="text-base font-semibold text-gray-800">US Holidays</h3>
              <p className="text-xs text-gray-600 mt-1">Federal holidays observed</p>
            </div>
            {renderExceptionsTable(usHolidays, "No US holidays found")}
          </div>

          {/* Personal Off Days Container */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-[#F4F8FB]">
              <h3 className="text-base font-semibold text-gray-800">Personal Off Days</h3>
              <p className="text-xs text-gray-600 mt-1">Your personal time off and exceptions</p>
            </div>
            {renderExceptionsTable(personalOffDays, "No personal off days found. Click 'Add Off Day' to create one.")}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeModal}
          />
          
          <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-[#098289] text-xl" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingException ? 'Edit Off Day' : 'Add Off Day'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Error */}
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">{formErrors.general}</span>
                </div>
              )}

              {/* Exception Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.exception_date}
                  onChange={(e) => setFormData({ ...formData, exception_date: e.target.value })}
                  min={getTodayDate()}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                    formErrors.exception_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.exception_date && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.exception_date}</p>
                )}
              </div>

              {/* End Date (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional - for date ranges)
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.exception_date || getTodayDate()}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289] ${
                    formErrors.end_date ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {formErrors.end_date && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.end_date}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Leave empty for single day off</p>
              </div>

              {/* All Day Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_all_day"
                  checked={formData.is_all_day}
                  onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                  className="w-4 h-4 text-[#098289] border-gray-300 rounded focus:ring-[#098289]"
                />
                <label htmlFor="is_all_day" className="text-sm font-medium text-gray-700">
                  All Day
                </label>
              </div>

              {/* Time Range (shown when not all-day) */}
              {!formData.is_all_day && (
                <div className="space-y-3 pl-7 border-l-2 border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-red-500">*</span>
                    </label>
                    <TimePicker
                      value={formData.start_time}
                      onChange={(time) => setFormData({ ...formData, start_time: time })}
                      className="w-full"
                    />
                    {formErrors.start_time && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.start_time}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-red-500">*</span>
                    </label>
                    <TimePicker
                      value={formData.end_time}
                      onChange={(time) => setFormData({ ...formData, end_time: time })}
                      className="w-full"
                    />
                    {formErrors.end_time && (
                      <p className="mt-1 text-xs text-red-600">{formErrors.end_time}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (Optional)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#098289]"
                  placeholder="e.g., Vacation, Conference, Personal time off"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-[#098289] border border-[#098289] rounded-md hover:bg-[#076d73] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {editingException ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingException ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.exception && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black opacity-50"
            onClick={closeDeleteConfirm}
          />
          
          <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#098289] rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Delete Off Day
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to delete this off day?
              </p>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Date(s):</span> {getDateRangeDisplay(deleteConfirmModal.exception)}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Time:</span> {getTimeRangeDisplay(deleteConfirmModal.exception)}
                </p>
                {deleteConfirmModal.exception.reason && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Reason:</span> {deleteConfirmModal.exception.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-[#098289] border-2 border-[#098289] rounded-md hover:bg-[#098289] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityExceptions;
