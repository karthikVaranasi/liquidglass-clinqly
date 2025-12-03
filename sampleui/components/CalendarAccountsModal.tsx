import { useState, useEffect, useCallback, useRef } from 'react';
import { FaTimes, FaGoogle, FaMicrosoft, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaTrash, FaCalendarAlt, FaPlus } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { calendarService } from '../services/calendarService';
import type { CalendarAccountsResponse, CalendarAccount } from '../services/calendarService';

interface CalendarAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctorId: number;
  onAccountsUpdate?: () => void;
  allowClose?: boolean; // New prop to control if modal can be closed
  showToast?: boolean; // New prop to control if toast should be shown
}

export default function CalendarAccountsModal({ isOpen, onClose, doctorId, onAccountsUpdate, allowClose = true, showToast = true }: CalendarAccountsModalProps) {
  const [accounts, setAccounts] = useState<CalendarAccountsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<number | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<number | null>(null);
  const [connecting, setConnecting] = useState<'google' | 'microsoft' | null>(null);
  const toastShownRef = useRef(false);

  const fetchCalendarAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await calendarService.getCalendarAccounts(doctorId);
      setAccounts(data);
      
      // Notify parent component about accounts update
      if (onAccountsUpdate) {
        onAccountsUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calendar accounts');
    } finally {
      setLoading(false);
    }
  }, [doctorId, onAccountsUpdate]);

  useEffect(() => {
    if (isOpen && doctorId) {
      fetchCalendarAccounts();
      
      // Show helpful toast message only once when modal opens and showToast is true
      if (showToast && !toastShownRef.current) {
        toast('Please connect a calendar account to sync your appointments', {
          duration: 5000,
          style: {
            background: '#eff6ff',
            color: '#1e40af',
            border: '1px solid #bfdbfe',
          },
        });
        toastShownRef.current = true;
      }
    }
  }, [isOpen, doctorId, fetchCalendarAccounts, showToast]);

  // Reset connecting state when accounts are successfully loaded
  useEffect(() => {
    if (accounts && !loading) {
      setConnecting(null);
    }
  }, [accounts, loading]);

  // Reset connecting state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setConnecting(null);
      toastShownRef.current = false; // Reset toast state when modal closes
    }
  }, [isOpen]);

  // Reset connecting state after a timeout to prevent permanent disabling
  useEffect(() => {
    if (connecting) {
      const timeoutId = setTimeout(() => {
        setConnecting(null);
      }, 10000); // Reset after 10 seconds
      
      return () => clearTimeout(timeoutId);
    }
  }, [connecting]);

  // Handle browser back button when modal is open
  useEffect(() => {
    if (!isOpen) return;

    // Push multiple states to create a buffer for back button clicks
    const pushHistoryStates = () => {
      for (let i = 0; i < 5; i++) {
        window.history.pushState({ modalOpen: true }, '', window.location.href);
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      // Always prevent navigation
      event.preventDefault();
      
      // Show toast message
      toast.error('Please connect at least one calendar account to continue', {
        duration: 4000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      
      // Immediately push states back to maintain the buffer
      pushHistoryStates();
    };

    // Add the event listener
    window.addEventListener('popstate', handlePopState);
    
    // Create initial buffer of history states
    pushHistoryStates();

    // Cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen]);

  const handleDisconnect = async (doctorId: number, accountId: number, provider: 'google' | 'microsoft') => {
    // Check if this is the last account
    const totalAccounts = (accounts?.google_accounts?.length || 0) + (accounts?.microsoft_accounts?.length || 0);
    
    if (totalAccounts <= 1) {
      toast.error('At least one calendar account is required. Please connect another account before disconnecting this one.', {
        duration: 2500,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
      return;
    }

    if (!confirm(`Are you sure you want to disconnect this ${provider} calendar?`)) {
      return;
    }

    setDisconnecting(accountId);
    try {
      await calendarService.disconnectAccount(doctorId, accountId, provider);
      // Refresh the accounts list
      await fetchCalendarAccounts();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to disconnect account');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSetPrimary = async (doctorId: number, accountId: number, provider: 'google' | 'microsoft') => {
    setSettingPrimary(accountId);
    try {
      await calendarService.setPrimaryAccount(doctorId, accountId, provider);
      // Refresh the accounts list
      await fetchCalendarAccounts();
      toast.success('Primary calendar updated successfully!', {
        duration: 3000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set primary account', {
        duration: 4000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
    } finally {
      setSettingPrimary(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleAddCalendar = (provider: 'google' | 'microsoft') => {
    // Set connecting state immediately to disable the button
    setConnecting(provider);
    
    if (provider === 'google') {
      calendarService.connectGoogle(doctorId);
    } else {
      calendarService.connectMicrosoft(doctorId);
    }
  };

  const handleClose = () => {
    if (allowClose) {
      onClose();
    } else {
      // Show toast message when trying to close without accounts
      toast.error('Please connect at least one calendar account to continue', {
        duration: 4000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca',
        },
      });
    }
  };

  const renderAccountCard = (account: CalendarAccount, provider: 'google' | 'microsoft') => {
    const isDisconnecting = disconnecting === account.id;
    const isSettingPrimary = settingPrimary === account.id;
    const isPrimary = account.is_primary;

    return (
      <div 
        key={account.id} 
        className={`border rounded-lg p-4 transition-all ${
          isDisconnecting ? 'opacity-50' : ''
        } ${
          account.is_valid 
            ? 'border-green-200 bg-green-50' 
            : 'border-yellow-200 bg-yellow-50'
        }`}
      >
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
            <div className="mt-1">
              {provider === 'google' ? (
                <FaGoogle className="text-[#007C91] text-xl" />
              ) : (
                <FaMicrosoft className="text-[#098289] text-xl" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">
                  {provider === 'google' ? 'Google Calendar' : 'Microsoft Calendar'}
                </span>
                {account.is_valid ? (
                  <FaCheckCircle className="text-green-500 text-sm" />
                ) : (
                  <FaExclamationTriangle className="text-yellow-500 text-sm" />
                )}
              </div>
              
              <p className="text-sm text-gray-700 font-medium mb-1">{account.email}</p>
              
              <div className="text-xs text-gray-600">
                <p>Connected: {formatDate(account.created_at)}</p>
              </div>
              
              {!account.is_valid && (
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded inline-block">
                  ⚠️ Invalid token - Reconnect required
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isPrimary ? (
              <>
                <button
                  onClick={() => handleSetPrimary(doctorId, account.id, provider)}
                  disabled={isSettingPrimary}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#DAECED] text-gray-800 hover:bg-[#B8E5E7] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Set as primary calendar"
                >
                  {isSettingPrimary ? (
                    <FaSpinner className="animate-spin" />
                  ) : null}
                  <span>Set as Primary</span>
                </button>
                
                <button
                  onClick={() => handleDisconnect(doctorId, account.id, provider)}
                  disabled={isDisconnecting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Disconnect this account"
                >
                  {isDisconnecting ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaTrash />
                  )}
                  <span>Disconnect</span>
                </button>
              </>
            ) : (
              <>
              {isPrimary && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full border border-green-300 text-sm font-medium">
                  <span>Primary</span>
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-[#DAECED] to-[#B8E5E7]">
          <div className="flex items-center gap-3">
            <FaCalendarAlt className="text-[#03585D] text-2xl" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Calendar Integrations</h2>
              <p className="text-sm text-gray-600">Manage your connected calendars</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full ${
              !allowClose ? 'cursor-not-allowed opacity-50' : ''
            }`}
            title={!allowClose ? 'Connect a calendar account to close' : 'Close modal'}
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="animate-spin text-[#007C91] text-3xl mb-3" />
              <span className="text-gray-600">Loading calendar accounts...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="text-red-400 text-xl mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-red-800">Error Loading Accounts</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {accounts && !loading && (
            <div className="space-y-6">
              {/* Google Accounts Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                    <FaGoogle className="text-[#007C91]" />
                    Google Calendars ({accounts.google_accounts?.length || 0})
                  </h3>
                  <button
                    onClick={() => handleAddCalendar('google')}
                    disabled={connecting !== null}
                    className={`flex items-center gap-2 px-4 py-2 text-sm bg-[#007C91] text-white rounded-full transition-colors ${
                      connecting !== null 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-[#03585D]'
                    }`}
                  >
                    {connecting === 'google' ? (
                      <FaSpinner className="text-xs animate-spin" />
                    ) : (
                      <FaPlus className="text-xs" />
                    )}
                    <span>Add Google</span>
                  </button>
                </div>
                
                {accounts.google_accounts && accounts.google_accounts.length > 0 ? (
                  <div className="space-y-3">
                    {accounts.google_accounts.map(account => renderAccountCard(account, 'google'))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <FaGoogle className="text-gray-300 text-3xl mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No Google calendars connected</p>
                  </div>
                )}
              </div>

              {/* Microsoft Accounts Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                    <FaMicrosoft className="text-[#098289]" />
                    Microsoft Calendars ({accounts.microsoft_accounts?.length || 0})
                  </h3>
                  <button
                    onClick={() => handleAddCalendar('microsoft')}
                    disabled={connecting !== null}
                    className={`flex items-center gap-2 px-4 py-2 text-sm bg-[#098289] text-white rounded-full transition-colors ${
                      connecting !== null 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-[#03585D]'
                    }`}
                  >
                    {connecting === 'microsoft' ? (
                      <FaSpinner className="text-xs animate-spin" />
                    ) : (
                      <FaPlus className="text-xs" />
                    )}
                    <span>Add Microsoft</span>
                  </button>
                </div>
                
                {accounts.microsoft_accounts && accounts.microsoft_accounts.length > 0 ? (
                  <div className="space-y-3">
                    {accounts.microsoft_accounts.map(account => renderAccountCard(account, 'microsoft'))}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                    <FaMicrosoft className="text-gray-300 text-3xl mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No Microsoft calendars connected</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500">
            {!allowClose 
              ? "Please connect at least one calendar to continue" 
              : "Disconnecting will stop syncing appointments with that calendar"
            }
          </p>
          {allowClose && (
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-[#007C91] hover:bg-[#03585D] text-white rounded-full transition-colors font-medium"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

