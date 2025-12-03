import React, { useEffect, useState } from 'react';
import { FaEnvelope, FaBuilding, FaSpinner } from 'react-icons/fa';
import { useUserStore } from '../../../stores/useUserStore';
import axiosInstance from '../../../utils/axiosInstance';
import dayjs from 'dayjs';
import type { AdminData, DoctorData } from '../../../utils/types';

interface FrontDeskRequest {
  clinic_id: number;
  name: string;
  phone_number: string;
  message: string;
  id: number;
  created_at: string;
}

const FrontDeskRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<FrontDeskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Get user data from Zustand store
  const { userData, isLoading: storeLoading } = useUserStore();
  
  // Get clinic_id from Zustand store (doctor or admin)
  // Note: adminData.clinic_id might be 0, so we need to check explicitly
  const clinicId = (userData as DoctorData)?.clinic_id ?? ((userData as AdminData)?.clinic_id !== undefined ? (userData as AdminData).clinic_id : null);

  useEffect(() => {
    // Wait for store to finish loading
    if (storeLoading) {
      return;
    }

    // Check if we have clinic data
    if (!clinicId) {
      setError('Clinic ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    // Fetch front desk requests from API
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axiosInstance.get<FrontDeskRequest[]>(
          `/dashboard/patients/requests/frontdesk/${clinicId}`
        );
        
        setRequests(response.data || []);
      } catch (err: any) {
        console.error('Error fetching front desk requests:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load front desk requests.';
        setError(errorMessage);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [clinicId, storeLoading]);

  const handleRefresh = () => {
    if (!clinicId) {
      return;
    }

    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await axiosInstance.get<FrontDeskRequest[]>(
          `/dashboard/patients/requests/frontdesk/${clinicId}`
        );
        
        setRequests(response.data || []);
      } catch (err: any) {
        console.error('Error fetching front desk requests:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Failed to load front desk requests.';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  };

  return (
    <div className="w-full min-h-screen mx-auto bg-[#F4F8FB] pt-20 px-4 page-content-with-topbar">
      <div className="max-w-[1400px] mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <FaBuilding className="text-[#098289] text-lg" />
            <h2 className="text-2xl font-bold font-sf">
              Front Desk Requests - <span className="text-[#098289]">{requests.length}</span>
            </h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || !clinicId}
            className="px-4 py-2 bg-[#098289] hover:bg-[#076d77] text-white rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-sf text-sm"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <FaSpinner className="animate-spin" />
                Loading...
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm overflow-hidden">
          {error ? (
            <div className="text-center py-12">
              <FaEnvelope className="mx-auto text-red-400 mb-4" size={48} />
              <p className="text-red-600 text-lg font-sf">{error}</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col justify-center items-center h-64 w-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#098289] mb-4"></div>
              <p className="text-gray-600 text-lg font-sf">Loading front desk requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FaEnvelope className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-lg font-sf">
                No front desk requests available.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#F4F8FB] h-[46px]">
                  <tr className="text-left text-gray-600">
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[20%]">
                      Name
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[20%]">
                      Phone Number
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[35%]">
                      Notes
                    </th>
                    <th className="py-3 px-6 font-bold tracking-wider text-xs w-[25%]">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {requests.map((request) => (
                    <tr 
                      key={request.id} 
                      className="border-t border-[#E5E7EB] hover:bg-[#F4F8FB] transition-colors"
                    >
                      <td className="py-3 px-6">
                        <div className="font-medium text-gray-900 font-sf">
                          {request.name}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2 text-gray-700">
                          <a
                            href={`tel:${request.phone_number}`}
                            className="hover:text-[#098289] hover:underline transition-colors font-sf"
                          >
                            {request.phone_number}
                          </a>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-gray-700 font-sf break-words">
                          {request.message}
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <div className="text-gray-600 text-xs font-sf">
                          {request.created_at 
                            ? dayjs(request.created_at).format('MMM DD, YYYY HH:mm')
                            : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FrontDeskRequestsPage;

