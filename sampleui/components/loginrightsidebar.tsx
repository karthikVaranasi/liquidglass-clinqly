import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaEye, FaEyeSlash, FaChevronLeft, FaChevronRight, FaClock, FaCalendarAlt, FaTimes, FaComment } from 'react-icons/fa';
import star from '../assets/Star.svg';
import doctorImage from '../assets/Doctor.svg';
import { useUserStore } from '../stores/useUserStore';
// import ChatWidgetLauncher from './Button';

const LoginForm = () => {
  const [activeTab, setActiveTab] = useState<'admin' | 'doctor'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setAuthToken, setUserRole, setUserData, setClinicData } = useUserStore();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!email.trim() || !password.trim()) {
      setLoginError('Please fill out both email and password.');
      return;
    }

    try {
      const endpoint = activeTab === 'admin' ? '/dashboard/auth/admin/login' : '/dashboard/auth/doctor/login';
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if MFA is required (only for admin login)
      if (activeTab === 'admin' && data.mfa_required === true) {
        // Pass email and password via navigation state
        // Note: Secret is NOT needed - backend should have it stored for the user
        navigate('/dashboard/mfa/verify-code', { 
          state: { 
            email: email.trim(), 
            password: password.trim()
          } 
        });
        return;
      }
      
      // Store only the access token
      if (data.access_token) {
        setAuthToken(data.access_token);
        
        // Use response data directly instead of fetching again
        if (activeTab === 'admin') {
          // Transform admin data to match AdminData interface
          const nameParts = (data.admin.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const adminData = {
            id: data.admin.id,
            first_name: firstName,
            last_name: lastName,
            email: data.admin.email,
            clinic_id: data.admin.clinic_id || 0,
          };
          
          // Update Zustand store with admin data from response
          setUserRole('admin');
          setUserData(adminData);
          
          // Set clinic data if available
          if (data.admin.clinic_name || data.admin.clinic_logo_url || data.admin.assigned_twilio_phone_number) {
            setClinicData({
              id: 0, // Admin may not have a clinic_id
              name: data.admin.clinic_name || '',
              phone_number: data.admin.assigned_twilio_phone_number || '',
              logo_url: data.admin.clinic_logo_url || null,
              address: '',
              created_at: '',
            });
          }
          
          navigate('/dashboard');
        } else if (activeTab === 'doctor') {
          // Transform doctor data to match DoctorData interface
          const nameParts = (data.doctor.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const doctorData = {
            id: data.doctor.id,
            first_name: firstName,
            last_name: lastName,
            email: data.doctor.email,
            clinic_id: data.doctor.clinic_id,
            department: data.doctor.department,
          };
          
          // Update Zustand store with doctor data from response
          setUserRole('doctor');
          setUserData(doctorData);
          
          // Set clinic data if available
          if (data.doctor.clinic_name || data.doctor.clinic_logo_url || data.doctor.assigned_twilio_phone_number) {
            setClinicData({
              id: data.doctor.clinic_id,
              name: data.doctor.clinic_name || '',
              phone_number: data.doctor.assigned_twilio_phone_number || '',
              logo_url: data.doctor.clinic_logo_url || null,
              address: '',
              created_at: '',
            });
          }
          
          navigate('/doctor-dashboard');
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Login error:', error);
        setLoginError(error.message || 'Login failed. Please try again.');
      } else {
        console.error('Unexpected error:', error);
        setLoginError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex bg-gray-100 rounded-md p-1 mb-6 text-sm font-medium">
        <button
          className={`flex-1 py-2 rounded-md transition ${
            activeTab === 'admin' ? 'bg-white shadow text-[#007C91]' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('admin')}
        >
          👤 Admin Login
        </button>
        <button
          className={`flex-1 py-2 rounded-md transition ${
            activeTab === 'doctor' ? 'bg-white shadow text-[#007C91]' : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('doctor')}
        >
          🩺 Doctor Login
        </button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full border border-gray-300 rounded-md px-4 py-3 text-sm pr-10"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" /> Remember me
          </label>
          <a href="#" className="text-[#007C91] hover:underline">
            Forgot Password?
          </a>
        </div>

        {loginError && (
          <div className="text-red-500 text-sm text-center">{loginError}</div>
        )}

        <button
          type="submit"
          className="w-full bg-[#00a9a3] hover:bg-[#008a88] text-white py-3 rounded-md font-semibold transition flex items-center justify-center"
        >
          Log In <span className="ml-2">→</span>
        </button>
      </form>
    </div>
  );
};

// Get current date in EST timezone
const getESTDate = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
};

// Get next Monday from current EST date
const getNextMonday = () => {
  const currentDateEST = getESTDate();
  const date = new Date(currentDateEST);
  const day = date.getDay();
  // Calculate days until next Monday
  let daysUntilMonday;
  if (day === 1) {
    daysUntilMonday = 7;
  } else if (day === 0) {
    daysUntilMonday = 1;
  } else {
    daysUntilMonday = (8 - day) % 7 || 7;
  }
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
};

const CalendarView = () => {
  const currentDateEST = getESTDate();
  const today = currentDateEST.getDate();
  const currentMonth = currentDateEST.getMonth();
  const currentYear = currentDateEST.getFullYear();
  
  const nextMonday = getNextMonday();
  const nextMondayDate = nextMonday.getDate();

  // Calendar generation - fixed to current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const calendarDays = [];
  // Previous month days
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({ day, isCurrentMonth: true });
  }
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({ day, isCurrentMonth: false });
  }

  const isToday = (day: number) => {
    return day === today && currentMonth === currentDateEST.getMonth() && currentYear === currentDateEST.getFullYear();
  };

  const isNextMonday = (day: number) => {
    return day === nextMondayDate && currentMonth === nextMonday.getMonth() && currentYear === nextMonday.getFullYear();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md h-full flex flex-col">
      {/* Calendar Title with Close Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sf text-base font-bold text-gray-900">Choose Appointment Date</h3>
        <button className="p-1.5 hover:bg-gray-100 rounded-full transition">
          <FaTimes className="text-gray-600 text-sm" />
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button 
          className="p-2 text-gray-400 cursor-not-allowed"
          disabled
        >
          <FaChevronLeft className="text-sm" />
        </button>
        <h4 className="font-sf text-sm font-bold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h4>
        <button 
          className="p-2 text-gray-400 cursor-not-allowed"
          disabled
        >
          <FaChevronRight className="text-sm" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-gray-500 text-xs font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 flex-grow">
        {calendarDays.slice(0, 35).map((item, index) => {
          const isTodayDate = item.isCurrentMonth && isToday(item.day);
          const isMondayDate = item.isCurrentMonth && isNextMonday(item.day);
          
          return (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                transition-all duration-200 cursor-pointer
                ${!item.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${isTodayDate 
                  ? 'bg-[#4a9ca0] text-white font-bold shadow-md' 
                  : isMondayDate
                    ? 'bg-[#4a9ca0] text-white font-semibold shadow-sm'
                    : item.isCurrentMonth
                      ? 'hover:bg-gray-100'
                      : ''
                }
              `}
            >
              {item.day}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UpcomingAppointments = () => {
  const currentDateEST = getESTDate();
  const nextMonday = getNextMonday();
  const currentHour = currentDateEST.getHours();

  // Generate appointment times (8 AM to 12 PM, only future times)
  const generateAppointmentTimes = () => {
    const times = [];
    const startHour = 8;
    const endHour = 12;
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // If it's today and the time has passed, skip it
      if (nextMonday.toDateString() === currentDateEST.toDateString() && hour <= currentHour) {
        continue;
      }
      const period = hour < 12 ? 'AM' : 'PM';
      const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
      times.push(`${displayHour}:00 ${period}`);
    }
    return times;
  };

  const appointmentTimes = generateAppointmentTimes();

  return (
    <div className="bg-[#4a9ca0] rounded-2xl shadow-xl p-5 w-full max-w-md h-full flex flex-col">
      {/* Title with Arrow */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-sf text-base font-bold text-white">Upcoming Appointments</h3>
        <button className="text-white hover:bg-white/10 rounded-full p-1.5 transition">
          <FaChevronRight className="text-sm" />
        </button>
      </div>

      {/* Date and Time Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Date Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
          <FaCalendarAlt className="text-white text-lg mb-1.5" />
          <p className="text-white font-semibold text-xs">
            Mon, {nextMonday.getDate()} {nextMonday.toLocaleDateString('en-US', { month: 'short' })},{nextMonday.getFullYear() % 100}
          </p>
          <p className="text-white/70 text-xs mt-0.5">Appointments Date</p>
        </div>

        {/* Time Card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
          <FaClock className="text-white text-lg mb-1.5" />
          <p className="text-white font-semibold text-xs">08:00 - 12:00</p>
          <p className="text-white/70 text-xs mt-0.5">Appointments Time</p>
        </div>
      </div>

      {/* Doctor Card */}
      <div className="bg-white rounded-xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
            <img 
              src={doctorImage} 
              alt="Doctor" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="font-sf font-bold text-gray-900 text-xs">Dr. David Green</h4>
            <p className="text-gray-600 text-xs">General Practitioner</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 transition">
          <FaComment className="text-lg" />
        </button>
      </div>

      {/* Appointment Times - 2 rows */}
      <div className="grid grid-cols-2 gap-2 flex-grow content-start">
        {appointmentTimes.length > 0 ? (
          appointmentTimes.map((time, idx) => (
            <div 
              key={idx} 
              className="bg-white rounded-lg px-3 py-2.5 text-gray-700 font-medium text-xs text-center hover:bg-white/90 transition-all cursor-pointer shadow-sm h-fit"
            >
              {time}
            </div>
          ))
        ) : (
          <p className="text-white text-xs italic text-center py-2 col-span-2">No available slots</p>
        )}
      </div>
    </div>
  );
};

const LeftPanel = () => {
  return (
    <>
      <img
        src={star}
        alt="Star BG"
        className="absolute w-full h-full object-top opacity-100 z-0 pointer-events-none select-none"
      />
      <div className="relative flex flex-col justify-center items-start lg:items-center text-left w-auto px-3 sm:px-6 lg:px-5 pt-8 text-white bg-cover bg-no-repeat overflow-auto">
        <div className="relative z-10">
          <h2 className="font-sf text-xl sm:text-2xl md:text-3xl font-bold mb-6 leading-snug self-center lg:self-start">
            Redefine Your Doctor Appointment<br />Experience!
          </h2>
          
          {/* Custom Dashboard Illustration UI with Calendar */}
          <div className="w-full flex flex-col lg:flex-row gap-6 items-stretch justify-center my-10 max-w-6xl">
            {/* Calendar View - LEFT SIDE */}
            <div className="flex-shrink-0 w-full lg:w-auto flex">
              <CalendarView />
            </div>

            {/* Upcoming Appointments - RIGHT SIDE (beside calendar) */}
            <div className="flex-shrink-0 w-full lg:w-auto flex">
              <UpcomingAppointments />
            </div>
          </div>
          <div className="font-sf grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm sm:text-base mt-6 w-full max-w-4xl self-start lg:self-start">
            {[
              'Comprehensive Patient Management',
              'Real-time Appointment Tracking',
              'Advanced Analytics Dashboard',
              'Secure Medical Records',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 sm:gap-4 whitespace-nowrap">
                <FaCheckCircle className="text-white-300 text-xl sm:text-xl shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

const MedicalLoginDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, userRole } = useUserStore();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      console.log('👤 User already authenticated, redirecting to dashboard...');
      if (userRole === 'admin') {
        navigate('/dashboard', { replace: true });
      } else if (userRole === 'doctor') {
        navigate('/doctor-dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, userRole, navigate]);

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row font-sans overflow-hidden scrollbar-hide">
      <div className="flex-1 h-full bg-gradient-to-br from-[#06B0BB] to-[#098289] flex items-center justify-center overflow-y-auto">
        <LeftPanel />
      </div>

      <div className="flex-1 h-full bg-gradient-to-br from-white to-[#e6f9f9] flex flex-col justify-center items-center px-4 py-12">
        <div className="absolute w-[300px] h-[200px] top-[-100px] right-[-100px] bg-[#D4FCFF] rounded-full opacity-80 blur-[120px] z-0" />
        {/* <div className="absolute w-[300px] h-[300px] bottom-[-100px] right-[-100px] bg-[#FFE188] rounded-full opacity-80 blur-[120px] z-0" /> */}

        <div className="flex items-center gap-2 mb-20 justify-center">
          <img src="/Fonts/favicon-32x32.png" alt="EZ Medtech Logo" className="h-10" />
          <h1 className="font-sf text-2xl sm:text-3xl font-semibold text-[#007C91]">Medical Dashboard</h1>
        </div>

        <div className="flex flex-col items-center text-center w-full max-w-md mb-25">
          <div className="mb-4">
            <h2 className="font-sf text-xl sm:text-2xl font-bold">Welcome Back!</h2>
            <p className="font-sf text-sm text-gray-500">Please Sign in to access your dashboard</p>
          </div>

          <LoginForm />
        </div>
      </div>

      {/* <ChatWidgetLauncher /> */}
    </div>
  );
};

export default MedicalLoginDashboard;
