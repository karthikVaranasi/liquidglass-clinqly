import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import {
  CalendarDays,
  User,
  Users,
  Phone,
  Menu,
  X,
  Mail,
  LogOut,
  Shield,
} from 'lucide-react';
import homeicon from '../assets/Homeicon.svg';
import { clearAuth } from '../utils/auth';
import { useUserStore } from '../stores/useUserStore';


export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get user data from Zustand store
  const { userName, userEmail, clinicData, isLoading } = useUserStore();

  const isActive = (path: string) => location.pathname === path;

  // Compute user initials from userName
  const userInitials = userName
    ? (() => {
        const cleanName = userName.replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim();
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



  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const toggleDropdown = () => setIsDropdownVisible(!isDropdownVisible);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  // Ref for the dropdown to detect clicks outside
  const dropdownRef = useRef<HTMLDivElement | null>(null); // Explicitly typing the ref

  // Close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownVisible(false); // Close the dropdown if the click is outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="w-full h-[64px] bg-white fixed shadow-sm flex z-50 justify-center">
      <div className="w-full font-sf max-w-[1440px] px-4 sm:px-6 flex items-center gap-4">
        {/* Left: Logo + Clinic Name + Navigation */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
            {isLoading ? (
              <>
                <div className="h-8 sm:h-10 w-8 sm:w-10 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="h-5 w-40 sm:w-48 bg-gray-200 rounded animate-pulse" />
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
                <h1 className="font-sf text-base sm:text-lg lg:text-xl font-semibold text-[#007C91] whitespace-nowrap">
                  {clinicData?.name || 'EzMedTech Clinic'} Dashboard
                </h1>
              </>
            )}
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1 text-sm flex-shrink-0">
            <button
              onClick={() => navigate('/dashboard')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/dashboard') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:text-[#007C91]'}`}
            >
              <img src={homeicon} className="w-4 h-4 transition-all hover:fill-[#007C91]" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => navigate('/appointment')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/appointment') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:text-[#007C91]'}`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>Appointments</span>
            </button>
            <button
              onClick={() => navigate('/doctor')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/doctor') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:text-[#007C91]'}`}
            >
              <User className="w-4 h-4" />
              <span>Doctors</span>
            </button>
            <button
              onClick={() => navigate('/patients')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/patients') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:text-[#007C91]'}`}
            >
              <Users className="w-4 h-4" />
              <span>Patients</span>
            </button>
            <button
              onClick={() => navigate('/dashboard/logs')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all whitespace-nowrap ${isActive('/dashboard/logs') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:text-[#007C91]'}`}
            >
              <Phone className="w-4 h-4" />
              <span>Logs</span>
            </button>
          </div>
        </div>

        {/* Right Profile */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-auto">
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
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-sf">{userName || 'Admin'}</span>
                          </div>
                        </div>
                      </div>
                      {userEmail && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3 h-3 text-green-600" />
                          <span className="truncate font-sf">{userEmail}</span>
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
                
                {/* MFA Settings Section */}
                <div 
                  onClick={() => {
                    navigate('/dashboard/mfa/settings');
                    setIsDropdownVisible(false);
                  }} 
                  className="px-4 py-3 text-sm cursor-pointer hover:bg-gray-100 flex items-center gap-2 text-gray-700 border-t border-gray-200"
                >
                  <Shield className="w-4 h-4 text-[#098289]" />
                  <span className="font-sf">MFA Settings</span>
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
              onClick={() => handleNavigation('/dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/dashboard') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <img src={homeicon} className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => handleNavigation('/appointment')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/appointment') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span>Appointments</span>
            </button>
            <button
              onClick={() => handleNavigation('/doctor')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/doctor') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Doctors</span>
            </button>
            <button
              onClick={() => handleNavigation('/patients')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/patients') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Patients</span>
            </button>
            <button
              onClick={() => handleNavigation('/dashboard/logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                isActive('/dashboard/logs') ? 'bg-[#E0F7FA] text-[#007C91]' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Phone className="w-5 h-5" />
              <span>Logs</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
