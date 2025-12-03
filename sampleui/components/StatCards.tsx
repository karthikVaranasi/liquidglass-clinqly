import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import Person from '../assets/Person.svg';
import Doctor from '../assets/Doctor.svg';
import calender from '../assets/calender.svg';
import appointments from '../assets/appointment.svg';
import { useUserStore } from '../stores/useUserStore';
import type { DoctorData } from '../utils/types';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  onClick?: () => void;
  drillDownInfo?: string;
}

const StatCard = ({ title, value, icon, onClick, drillDownInfo }: StatCardProps) => {
  const [showDrillDown, setShowDrillDown] = useState(false);

  return (
    <div 
      className="w-full sm:w-[280px] lg:w-[332px] h-[140px] relative bg-white rounded-[10px] p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={onClick}
      onMouseEnter={() => setShowDrillDown(true)}
      onMouseLeave={() => setShowDrillDown(false)}
    >
      <h3 className="text-xs sm:text-sm font-sf font-regular text-black-400 absolute top-4 left-4">
        {title}
      </h3>

      {/* Main icon */}
      <div className="absolute top-[40px] right-4 flex text-[rgb(9,130,137)]">
        {typeof icon === 'string' ? (
          <img src={icon} alt="icon" className="w-full h-full" />
        ) : (
          <div className="w-12 h-12">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-7 absolute left-4">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 text-left">{value}</h2>
      </div>

      {/* Drill-down tooltip */}
      {showDrillDown && drillDownInfo && (
        <div className="absolute bottom-2 right-2 bg-[#098289] text-white px-3 py-1.5 rounded-md shadow-lg text-xs font-medium flex items-center gap-1 z-10 animate-fadeIn">
          {drillDownInfo}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
};

const StatCards = () => {
  const navigate = useNavigate();
  const { userData, userRole, clinicData } = useUserStore();
  const [stats, setStats] = useState({
    total_patients: 0,
    total_doctors: 0,
    total_appointments: 0,
    todays_appointments: 0,
    upcoming_appointments: 0,
  });
  const [totalLogs, setTotalLogs] = useState(0);

  // Compute dashboard URL based on user role
  const dashboardUrl = useMemo(() => {
    if (userRole === 'doctor' && userData) {
      const doctor = userData as DoctorData;
      return `/dashboard/stats/all?clinic_id=${doctor.clinic_id}`;
    }
    return '/dashboard/stats/all';
  }, [userData, userRole]);

  // Fetch stats function
  const fetchStats = useCallback(async () => {
    try {
      const response = await axiosInstance.get(dashboardUrl);
      if (response.data.stats) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  }, [dashboardUrl]);

  // Fetch logs count for doctors
  const fetchLogsCount = useCallback(async () => {
    if (userRole !== 'doctor') return;
    
    try {
      const response = await axiosInstance.get('/dashboard/logs');
      const logs = Array.isArray(response.data) ? response.data : [];
      
      // Filter logs by doctor's clinic phone number
      const doctorPhoneNumber = clinicData?.phone_number;
      if (doctorPhoneNumber) {
        const normalizePhone = (phone: string | null) => (phone ? phone.replace(/\D/g, '') : '');
        const doctorDigits = normalizePhone(doctorPhoneNumber);
        const filteredLogs = logs.filter((log: any) => {
          const normalizedFrom = normalizePhone(log.from_phone);
          const normalizedTo = normalizePhone(log.to_phone);
          return normalizedFrom === doctorDigits || normalizedTo === doctorDigits;
        });
        setTotalLogs(filteredLogs.length);
      } else {
        setTotalLogs(logs.length);
      }
    } catch (error) {
      console.error('Failed to fetch logs count:', error);
      setTotalLogs(0);
    }
  }, [userRole, clinicData]);

  useEffect(() => {
    fetchStats();
    if (userRole === 'doctor') {
      fetchLogsCount();
    }
  }, [fetchStats, fetchLogsCount, userRole]);

  const handlePatientsClick = () => {
    if (userRole === 'doctor') {
      navigate('/patientData');
    } else {
      navigate('/patients');
    }
  };

  const handleAppointmentsClick = (filter: 'all' | 'today') => {
    if (userRole === 'doctor') {
      navigate('/doctor-appointments', { state: { initialFilter: filter } });
    } else {
      navigate('/appointment', { state: { initialFilter: filter } });
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 w-full">
      <StatCard
        title="Total Patients"
        value={stats.total_patients.toLocaleString()}
        icon={Person}
        onClick={handlePatientsClick}
        drillDownInfo="View all patients"
      />
      {userRole === 'doctor' ? (
        <StatCard
          title="Total Logs"
          value={totalLogs.toLocaleString()}
          icon={<Phone className="w-12 h-12 text-[rgb(9,130,137)]" />}
          onClick={() => navigate('/doctor-logs')}
          drillDownInfo="View all call logs"
        />
      ) : (
        <StatCard
          title="Total Doctors"
          value={stats.total_doctors.toLocaleString()}
          icon={Doctor}
          onClick={() => navigate('/doctor')}
          drillDownInfo="View all doctors"
        />
      )}
      <StatCard
        title="Total Appointments"
        value={stats.total_appointments.toLocaleString()}
        icon={calender}
        onClick={() => handleAppointmentsClick('all')}
        drillDownInfo="View all appointments"
      />
      <StatCard
        title="Upcoming Appointments"
        value={stats.upcoming_appointments.toLocaleString()} 
        icon={appointments}
        onClick={() => handleAppointmentsClick('today')}
        drillDownInfo="View today's schedule"
      />
    </div>
  );
};

export default StatCards;