import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useUserStore } from '../stores/useUserStore';
import { decodeJWT } from '../utils/jwtUtils';
import { clearAuth } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const AdminLoggedAsBanner: React.FC = () => {
  const { authToken, userData } = useUserStore();
  const navigate = useNavigate();

  // Check if admin is logged as doctor (check for impersonated_by in token)
  const isAdminLoggedAsDoctor = React.useMemo(() => {
    if (!authToken) return false;
    const decoded = decodeJWT(authToken);
    // Check for impersonated_by
    return !!(decoded?.impersonated_by);
  }, [authToken]);


  const handleExit = () => {
    // Clear all authentication data
    clearAuth();
    
    // Navigate to login page
    navigate('/');
  };

  // Add/remove class to body to adjust page padding
  useEffect(() => {
    if (isAdminLoggedAsDoctor && userData) {
      document.body.classList.add('admin-banner-visible');
      // Add CSS variable for banner height (py-2.5 = 10px top + 10px bottom + ~20px text = ~40px)
      document.documentElement.style.setProperty('--banner-height', '40px');
    } else {
      document.body.classList.remove('admin-banner-visible');
      document.documentElement.style.removeProperty('--banner-height');
    }
    
    return () => {
      document.body.classList.remove('admin-banner-visible');
      document.documentElement.style.removeProperty('--banner-height');
    };
  }, [isAdminLoggedAsDoctor, userData]);

  if (!isAdminLoggedAsDoctor || !userData) {
    return null;
  }

  const doctorName = `${userData.first_name} ${userData.last_name}`.trim() || 'Doctor';

  return (
    <div className="w-full bg-[#098289] hover:bg-[#076d77] text-white  py-1 px-4 sm:px-6">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-sf">
          <span className="italic">Admin logged in as {doctorName}</span>
        </div>
        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-3 py-1 text-white rounded-md transition-colors text-sm font-sf font-medium"
        >
          <X className="w-4 h-4" />
          Exit
        </button>
      </div>
    </div>
  );
};

export default AdminLoggedAsBanner;

