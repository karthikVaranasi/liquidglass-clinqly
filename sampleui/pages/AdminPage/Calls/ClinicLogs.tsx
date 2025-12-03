import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Building2 } from 'lucide-react';
import axiosInstance from '../../../utils/axiosInstance';

interface Clinic {
  id: number;
  name: string;
  phone_number: string;
  logo_url: string | null;
  address: string | null;
}

interface Log {
  id: number;
  from_phone: string | null;
  to_phone: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
}

interface ClinicWithCount extends Clinic {
  callCount: number;
}

export default function ClinicLogs() {
  const [clinics, setClinics] = useState<ClinicWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always fetch both endpoints every time
      const [clinicsResponse, logsResponse] = await Promise.all([
        axiosInstance.get('/dashboard/clinics'),
        axiosInstance.get('/dashboard/logs')
      ]);

      const clinicsData = clinicsResponse.data;
      const logs: Log[] = logsResponse.data;

      const clinicsList: Clinic[] = clinicsData.clinics || [];

      // Always calculate call count for each clinic based on phone number
      const clinicsWithCounts: ClinicWithCount[] = clinicsList.map(clinic => {
        const phoneNumber = clinic.phone_number;
        const callCount = logs.filter(log => 
          log.from_phone === phoneNumber || log.to_phone === phoneNumber
        ).length;

        return {
          ...clinic,
          callCount
        };
      });

      setClinics(clinicsWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Set clinics with 0 counts if there's an error fetching logs
      try {
        const clinicsResponse = await axiosInstance.get('/dashboard/clinics');
        const clinicsData = clinicsResponse.data;
        const clinicsList: Clinic[] = clinicsData.clinics || [];
        const clinicsWithCounts: ClinicWithCount[] = clinicsList.map(clinic => ({
          ...clinic,
          callCount: 0
        }));
        setClinics(clinicsWithCounts);
      } catch {
        // If clinics also fail, leave clinics empty
      }
    } finally {
      setLoading(false);
    }
  };

  const getClinicInitials = (name: string): string => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleClinicClick = (clinic: Clinic) => {
    navigate(`/dashboard/logs/clinic/${clinic.id}?phone=${encodeURIComponent(clinic.phone_number)}`);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007C91] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clinics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchClinics}
            className="px-4 py-2 bg-[#007C91] text-white rounded-md hover:bg-[#005a6b] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen pt-[64px] bg-[#F4F8FB] overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Clinic Logs</h1>
          <p className="text-gray-600">View call logs by clinic</p>
        </div>

        {/* Clinic Cards */}
        {clinics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No clinics found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                onClick={() => handleClinicClick(clinic)}
                className="bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all hover:shadow-md hover:scale-105"
              >
                <div className="flex items-start gap-4">
                  {/* Clinic Logo or Initials */}
                  <div className="flex-shrink-0">
                    {clinic.logo_url ? (
                      <img
                        src={clinic.logo_url}
                        alt={clinic.name}
                        className="w-16 h-16 rounded-lg object-cover"
                        onError={(e) => {
                          // If image fails to load, show initials instead
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const initialsDiv = document.createElement('div');
                            initialsDiv.className = 'w-16 h-16 rounded-lg bg-[#007C91] text-white flex items-center justify-center font-bold text-xl';
                            initialsDiv.textContent = getClinicInitials(clinic.name);
                            parent.appendChild(initialsDiv);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#007C91] text-white flex items-center justify-center font-bold text-xl">
                        {getClinicInitials(clinic.name)}
                      </div>
                    )}
                  </div>

                  {/* Clinic Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
                      {clinic.name}
                    </h3>
                    {clinic.address && (
                      <p className="text-sm text-gray-600 mb-2 truncate">
                        {clinic.address}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="truncate">{clinic.phone_number}</span>
                    </div>
                  </div>
                </div>

                {/* Call Count */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">Total Calls</span>
                    <span className="text-2xl font-bold text-[#007C91]">
                      {clinic.callCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

