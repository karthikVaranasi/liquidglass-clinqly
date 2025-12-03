import React, { useEffect, useState, useCallback } from 'react';
import WelcomeBanner from '../components/WelcomeBanner';  // Import the WelcomeBanner component
import StatCards from '../components/StatCards';  // Import the StatCards component
import PatientsOverview from '../components/patientsoverviewchart';
import AppointmentTrendsContainer from '../components/AppointmentsChart';
import AppointmentsCard from '../components/AppointmentList';
import TodaysAppointment from '../components/TodaysAppointments';
import CalendarAccountsModal from '../components/CalendarAccountsModal';
import { calendarService } from '../services/calendarService';
import { useUserStore } from '../stores/useUserStore';
import type { DoctorData } from '../utils/types';


const DoctorDashboard: React.FC = () => {
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [doctorId, setDoctorId] = useState<number | null>(null);
  const [isCheckingCalendar, setIsCheckingCalendar] = useState(true);
  const [hasCalendarAccounts, setHasCalendarAccounts] = useState(false);
  const { userData, userRole } = useUserStore();

  // Check for calendar connections
  const checkCalendarConnections = useCallback(async () => {
    if (!userData || userRole !== 'doctor') {
      setIsCheckingCalendar(false);
      return;
    }

    try {
      const doctor = userData as DoctorData;
      const docId = doctor.id;
      
      if (!docId) {
        console.error('No doctor ID found in doctor data');
        setIsCheckingCalendar(false);
        return;
      }
      
      setDoctorId(docId);

      // Fetch calendar accounts
      const accounts = await calendarService.getCalendarAccounts(docId);
      
      // Check if there are any connected accounts (Google or Microsoft)
      const hasGoogleAccounts = accounts.google_accounts && accounts.google_accounts.length > 0;
      const hasMicrosoftAccounts = accounts.microsoft_accounts && accounts.microsoft_accounts.length > 0;
      const hasAnyAccounts = hasGoogleAccounts || hasMicrosoftAccounts;
      
      setHasCalendarAccounts(hasAnyAccounts);
      
      if (!hasAnyAccounts) {
        // No calendar accounts found, show the modal
        setShowCalendarModal(true);
      }
    } catch (error) {
      console.error('Error checking calendar connections:', error);
    } finally {
      setIsCheckingCalendar(false);
    }
  }, [userData, userRole]);

  useEffect(() => {
    checkCalendarConnections();
  }, [checkCalendarConnections]);

  const handleCloseCalendarModal = () => {
    // Only allow closing if there are calendar accounts connected
    if (hasCalendarAccounts) {
      setShowCalendarModal(false);
    }
  };

  const handleCalendarAccountsUpdate = async () => {
    // Re-check calendar accounts when modal is updated
    if (doctorId) {
      try {
        const accounts = await calendarService.getCalendarAccounts(doctorId);
        const hasGoogleAccounts = accounts.google_accounts && accounts.google_accounts.length > 0;
        const hasMicrosoftAccounts = accounts.microsoft_accounts && accounts.microsoft_accounts.length > 0;
        const hasAnyAccounts = hasGoogleAccounts || hasMicrosoftAccounts;
        
        setHasCalendarAccounts(hasAnyAccounts);
        
        // If accounts are now connected, close the modal
        if (hasAnyAccounts) {
          setShowCalendarModal(false);
        }
      } catch (error) {
        console.error('Error re-checking calendar accounts:', error);
      }
    }
  };

  if (isCheckingCalendar) {
    // Show a brief loading state while checking calendar connections
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#007C91] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen pt-[64px] bg-[#F4F8FB] page-content-with-topbar">
        <div className="w-full max-w-[1400px] py-3 px-4 sm:px-6 mx-auto flex flex-col">
          {/* Welcome Banner */}
          <div className="w-full mb-2">
            <WelcomeBanner />
          </div>

          {/* Stat Cards */}
          <div className="w-full mb-2">
            <StatCards />
          </div>

          {/* Charts + Side Panel */}
          <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch w-full">
            {/* Left Column */}
            <div className="w-full lg:flex-1 flex flex-col gap-3">
              {/* Charts Row */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-1/2">
                  <PatientsOverview />
                </div>
                <div className="w-full md:w-1/2">
                  <AppointmentTrendsContainer />
                </div>
              </div>
              {/* Today's Appointments */}
              <div className="w-full">
                <TodaysAppointment />
              </div>
            </div>

            {/* Right Column */}
            <div className="w-full lg:w-[380px] lg:flex-shrink-0">
              <AppointmentsCard />
            </div>
          </div>

          {/* Support Contact */}
          <div className="w-full mt-3 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Need help? Contact our support team</p>
              <a
                href="tel:+17793249797"
                className="text-sm font-medium text-[#007C91] hover:text-[#005f6b] transition-colors"
              >
                +1 (779) 324‑9797
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Accounts Modal - shown automatically if no calendars connected */}
      {showCalendarModal && doctorId && (
        <CalendarAccountsModal
          isOpen={showCalendarModal}
          onClose={handleCloseCalendarModal}
          doctorId={doctorId}
          onAccountsUpdate={handleCalendarAccountsUpdate}
          allowClose={hasCalendarAccounts}
          showToast={true}
        />
      )}
    </>
  );
};

export default DoctorDashboard;
