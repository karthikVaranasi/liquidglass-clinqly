import { useState } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';
import CalendarAccountsModal from './CalendarAccountsModal';

interface CheckCalendarIntegrationsButtonProps {
  doctorId: number;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CheckCalendarIntegrationsButton({ 
  doctorId, 
  variant = 'primary',
  size = 'md',
  className = '' 
}: CheckCalendarIntegrationsButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const variantClasses = {
    primary: 'bg-[#007C91] hover:bg-[#03585D] text-white shadow-md hover:shadow-lg',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg',
    outline: 'border-2 border-[#007C91] text-[#007C91] hover:bg-[#DAECED]'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`
          flex items-center gap-2 rounded-full font-medium transition-all duration-200
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <FaCalendarCheck className="text-lg" />
        <span>Check Calendar Integrations</span>
      </button>

      <CalendarAccountsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        doctorId={doctorId}
        showToast={false}
      />
    </>
  );
}

