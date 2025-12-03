import './App.css';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from './stores/useUserStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import MedicalLoginDashboard from './components/loginrightsidebar';
import Topbar from './components/Topbar';
import DoctorsGrid from './pages/AdminPage/Doctors/DocView';
import AppointmentsPage from './pages/AdminPage/Appointments/Appointments';
import PatientsPage from './pages/AdminPage/Patients/patients';
import DepartmentAppointments from './pages/AdminPage/Appointments/AppointmetDepa';
// import ChatWidgetLauncher from './components/Button';
import DoctorAppointmentsPage from './pages/AdminPage/Appointments/DoctorAppointmentsPage';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorTopbar from './components/DoctorTopbar'; // Import DoctorTopbar
import TodaysAppointment from './components/TodaysAppointments';
import PatientData from './pages/DoctorPage/Patients/PatientsData';
import DoctorSettings from './pages/DoctorPage/Settings/settings';
import DoctorAppointments from './pages/DoctorPage/Appointments/DoctorAppointments';
import Logs from './pages/AdminPage/Calls/Calls';
import ClinicLogs from './pages/AdminPage/Calls/ClinicLogs';
import ClinicLogsDetail from './pages/AdminPage/Calls/ClinicLogsDetail';
import DoctorLogs from './pages/DoctorPage/Logs/DoctorLogs';
import Transcript from './pages/AdminPage/Calls/Transcript';
import DoctorTranscript from './pages/DoctorPage/Logs/Transcript';
import FrontDeskRequestsPage from './pages/AdminPage/FrontDesk/FrontDeskRequests';
import InsuranceDetailsPage from './pages/AdminPage/Insurance/InsuranceDetails';
import { IMSAuthHandler } from './components/IMSAuthHandler';
import DoctorRefillRequests from './pages/DoctorPage/RefillRequests';
import MFAVerify from './pages/AdminPage/MFA/MFAVerify';
import MFASettings from './pages/AdminPage/MFA/MFASettings';
function AppLayout() {
  const location = useLocation();
  const { userRole, logout, initializeFromToken } = useUserStore();

  useEffect(() => {
    const initialize = async () => {
      const success = await initializeFromToken();
      if (!success) {
        console.log('⚠️ Failed to initialize from token');
      }
    };
    initialize();
  }, [initializeFromToken]);

  useEffect(() => {
    const loginRoutes = ['/sso-login'];
    if (loginRoutes.includes(location.pathname)) {
      logout();
      console.log('Auth data cleared for route:', location.pathname);
    }
  }, [location.pathname, logout]);
  const hideTopbar = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/sso-login' || location.pathname === '/upload-documents';

  const renderTopbar = () => {
    if (userRole === 'admin') {
      return <Topbar />;
    } else if (userRole === 'doctor') {
      return <DoctorTopbar />;
    }
    return null;
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F8FB] overflow-x-hidden">
      {!hideTopbar && renderTopbar()}
      <Routes>
        
        <Route path="/" element={<MedicalLoginDashboard />} />
        <Route path="/login" element={<MedicalLoginDashboard />} />
        <Route path="/sso-login" element={<IMSAuthHandler />} />
        
        {/* MFA Routes */}
        <Route path="/dashboard/mfa/verify-code" element={<MFAVerify />} />
        <Route 
          path="/dashboard/mfa/settings" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MFASettings />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DoctorsGrid />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/appointment" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppointmentsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patients" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PatientsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/logs" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Logs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/logs/clinics" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ClinicLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/logs/clinic/:clinicId" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ClinicLogsDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard/logs/transcript" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Transcript />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/appointments/department/:deptName" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DepartmentAppointments />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/appointments/:doctorName" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DoctorAppointmentsRoute />
            </ProtectedRoute>
          } 
        />
        
        {/* Doctor Routes */}
        <Route 
          path="/doctor-dashboard" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor-appointments" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorAppointments />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor-logs" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorLogs />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor-logs/transcript" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorTranscript />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/todaysAppointments" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <TodaysAppointment />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/patientData" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <PatientData />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/DoctorSettings" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorSettings />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/doctor-refills" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorRefillRequests />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/frontdesk-requests" 
          element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <FrontDeskRequestsPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/upload-documents" 
          element={<InsuranceDetailsPage />}
        />
      </Routes>
    </div>
  );
}



function DoctorAppointmentsRoute() {
  const { doctorName } = useParams<{ doctorName: string }>();
  const navigate = useNavigate();

  const handleCloseSidebar = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <DoctorAppointmentsPage doctorName={doctorName || ""} onClose={handleCloseSidebar} />
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </Router>
  );
}

export default App;
