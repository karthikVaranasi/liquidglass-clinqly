import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// import profileImg from '../assets/profile.svg';
// import notifyIcon from '../assets/notify.svg';
import { Users, Calendar, Menu, X, Settings, Mail, LogOut, Stethoscope, User, Phone, Pill, MessageSquare } from 'lucide-react';
import homeicon from '../assets/Homeicon.svg';
import CheckCalendarIntegrationsButton from './CheckCalendarIntegrationsButton';
import AdminLoggedAsBanner from './AdminLoggedAsBanner';
import { clearAuth } from '../utils/auth';
import { useUserStore } from '../stores/useUserStore';
import { decodeJWT } from '../utils/jwtUtils';
import type { DoctorData } from '../utils/types';

const DoctorTopbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get user data from Zustand store
  const { userData, userName, userEmail, clinicData, isLoading, authToken } = useUserStore();
  const doctorId = (userData as DoctorData)?.id;

  // Check if admin is impersonating this doctor by checking token
  const isImpersonated = useMemo(() => {
    if (!authToken) return false;
    const decoded = decodeJWT(authToken);
    // Check for impersonated_by in token (indicates admin is logged as doctor)
    return !!decoded?.impersonated_by;
  }, [authToken]);

  const toggleDropdown = () => setIsDropdownVisible(!isDropdownVisible);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    clearAuth();

    navigate('/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  // Close dropdowns if click is outside of them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute user initials from userName
  const userInitials = userName
    ? (() => {
        const cleanName = userName.replace(/^Dr\.\s*/i, '').trim();
        if (!cleanName) return null;
        
        const nameParts = cleanName.split(' ').filter(part => part && part.length > 0);
        if (nameParts.length >= 2) {
          const first = nameParts[0]?.[0] || '';
          const last = nameParts[nameParts.length - 1]?.[0] || '';
          return first && last ? `${first}${last}`.toUpperCase() : null;
        } else if (nameParts.length === 1 && nameParts[0]?.length >= 2) {
          return cleanName.substring(0, 2).toUpperCase();
        }
        return null;
      })()
    : null;

  return (
    <header 
      className="w-full bg-white fixed flex flex-col z-50 justify-center transition-all duration-200 shadow-sm" 
      style={{ 
        top: '0px'
      }}
    >
      {isImpersonated && <AdminLoggedAsBanner />}
      <div className="w-full h-[64px] font-sf max-w-[1440px] mx-auto px-4 sm:px-6 flex items-center gap-4">
        {/* Left: Logo + Clinic Name + Navigation */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
           {isLoading ? (
             <>
               <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
               <div className="h-5 w-32 sm:w-40 bg-gray-200 rounded animate-pulse" />
             </>
           ) : (
             <>
               <img 
                 src={clinicData?.logo_url || '/Fonts/favicon-32x32.png'} 
                 alt={`${clinicData?.name || 'Clinic'} Logo`} 
                 className="h-8 sm:h-10 flex-shrink-0" 
                 onError={(e) => {
                   // Fallback to default logo if clinic logo fails to load
                   e.currentTarget.src = '/Fonts/favicon-32x32.png';
                 }}
               />
               <span className="text-sm sm:text-base lg:text-lg font-semibold text-[#03585D] truncate min-w-0">
                 {clinicData?.name || 'EzMedTech Clinic'}
               </span>
             </>
           )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 text-sm flex-shrink-0">
            <button
              onClick={() => navigate('/doctor-dashboard')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/doctor-dashboard') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <img src={homeicon} className="w-4 h-4"/>
              <span>Dashboard</span> 
            </button>
            <button
              onClick={() => navigate('/patientData')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/patientData') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <Users className="w-4 h-4" />
              <span>Patients</span>
            </button>
            <button
              onClick={() => navigate('/doctor-appointments')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/doctor-appointments') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <Calendar className="w-4 h-4 text-[#098289]" />
              <span>Appointments</span>
            </button>
            <button
              onClick={() => navigate('/frontdesk-requests')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/frontdesk-requests') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Front Desk</span>
            </button>
            <button
              onClick={() => navigate('/doctor-refills')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/doctor-refills') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <Pill className="w-4 h-4 text-[#098289]" />
              <span>Refill Requests</span>
            </button>
            <button
              onClick={() => navigate('/doctor-logs')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/doctor-logs') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <Phone className="w-4 h-4" />
              <span>Logs</span>
            </button>
            <button
              onClick={() => navigate('/DoctorSettings')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/DoctorSettings') ? 'bg-[#DAECED]' : 'bg-white hover:bg-[#b8dede]'}`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Right: Calendar Status & Profile */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-auto">
          {/* Calendar Integrations Button - Hidden on mobile, visible on tablet and up */}
          {doctorId && (
            <div className="hidden lg:flex">
              <CheckCalendarIntegrationsButton 
                doctorId={doctorId} 
                variant="outline"
                size="sm"
              />
            </div>
          )}

          {/* <div className="relative w-[40px] h-[40px] flex items-center justify-center">
            <img src={notifyIcon} alt="Notifications" />
          </div> */}

          <div className="relative">
            <div className="flex items-center cursor-pointer" onClick={toggleDropdown}>
              {isLoading ? (
                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-md" />
              ) : userInitials ? (
                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-full bg-[#0891B2] border-2 border-white shadow-md flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {userInitials}
                </div>
              ) : (
                <div className="w-[32px] h-[32px] sm:w-[40px] sm:h-[40px] rounded-full bg-[#0891B2] border-2 border-white shadow-md flex items-center justify-center text-white">
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              )}
            </div>

            {isDropdownVisible && (
              <div className="absolute top-[40px] right-0 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-10" ref={dropdownRef}>
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-200">
                  {isLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-full" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-sf">{userName || 'Doctor'}</span>
                          </div>
                        </div>
                      </div>
                      {userEmail && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3 h-3 text-green-600" />
                          <span className="truncate font-sf">{userEmail}</span>
                        </div>
                      )}
                      {(userData as DoctorData)?.department && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                          <Stethoscope className="w-3 h-3 text-purple-600" />
                          <span className="truncate font-sf">{(userData as DoctorData).department}</span>
                        </div>
                      )}
                      {clinicData?.phone_number && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3 h-3 text-blue-600" />
                          <span className="truncate font-sf">{clinicData.phone_number}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                {/* Logout Section */}
                <div onClick={handleLogout} className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 text-red-600">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span className="font-sf">Logout</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden flex items-center justify-center w-[40px] h-[40px]"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden absolute top-[64px] left-0 w-full bg-white border-t border-gray-200 shadow-lg z-40">
          <div className="px-4 py-2 space-y-1">
            <button
              onClick={() => handleNavigation('/doctor-dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/doctor-dashboard') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <img src={homeicon} className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigation('/patientData')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/patientData') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Patients</span>
            </button>
            <button
              onClick={() => handleNavigation('/doctor-appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/doctor-appointments') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span>Appointments</span>
            </button>
            <button
              onClick={() => handleNavigation('/frontdesk-requests')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/frontdesk-requests') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Front Desk</span>
            </button>
            <button
              onClick={() => handleNavigation('/doctor-refills')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${isActive('/doctor-refills') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Pill className="w-5 h-5 text-[#098289]" />
              <span>Refill Requests</span>
            </button>
            <button
              onClick={() => handleNavigation('/doctor-logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/doctor-logs') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Phone className="w-5 h-5" />
              <span>Logs</span>
            </button>
            <button
              onClick={() => handleNavigation('/DoctorSettings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/DoctorSettings') ? 'bg-[#DAECED] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
            
            {/* Calendar Integrations Button for Mobile */}
            {doctorId && (
              <div className="px-4 py-2 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Calendar Integrations</div>
                <CheckCalendarIntegrationsButton 
                  doctorId={doctorId}
                  variant="primary"
                  size="sm"
                  className="w-full"
                />
              </div>
            )}
          </div>
        </div>
      )}

    </header>
  );
};

export default DoctorTopbar;
