import React, { useEffect, useState } from 'react';
import axiosInstance from '../../utils/axiosInstance';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { useUserStore } from '../../stores/useUserStore';
import type { DoctorData } from '../../utils/types';

interface RefillRequest {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  caller_name: string;
  relationship: string;
  details: string;
  pharmacy_name: string;
  pharmacy_location: string;
  created_at: string;
}

// Raw shape from API can vary; support both legacy and new keys
interface RawRefillRequest {
  id?: number;
  request_id?: number;
  patient_id: number;
  patient_name?: string;
  patient_phone?: string;
  phone_number?: string;
  caller_name: string;
  relationship?: string;
  relationship_to_patient?: string;
  details?: string;
  request?: string;
  pharmacy_name?: string;
  pharmacy_location?: string;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    phone_number: string;
    dob?: string;
    clinic_id?: number;
    status?: string;
    id?: number;
  };
}

dayjs.extend(utc);
dayjs.extend(timezone);
const EST_TIMEZONE = 'America/New_York';

const DoctorRefillRequests: React.FC = () => {
  const [requests, setRequests] = useState<RefillRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Get user data from Zustand store
  const { userData } = useUserStore();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        
        // Get clinic_id from Zustand store
        const clinicId = (userData as DoctorData)?.clinic_id;

        if (!clinicId) {
          setError('Clinic ID not found. Please log in again.');
          setLoading(false);
          return;
        }

        const res = await axiosInstance.get(`/dashboard/patients/refill-requests`, {
          params: { clinic_id: clinicId }
        });
        const data = res.data || {};
        const rawList = data.requests || data.refill_requests || [];

        const normalized: RefillRequest[] = (rawList as RawRefillRequest[]).map((item) => {
          // Handle both nested patient object and flat structure
          const patientName = item.patient 
            ? `${item.patient.first_name} ${item.patient.last_name}`
            : item.patient_name || '';
          
          const patientPhone = item.patient?.phone_number 
            ?? item.patient_phone 
            ?? item.phone_number 
            ?? '';

          return {
            id: (item.id ?? item.request_id ?? 0) as number,
            patient_id: item.patient_id,
            patient_name: patientName,
            patient_phone: patientPhone,
            caller_name: item.caller_name,
            relationship: (item.relationship ?? item.relationship_to_patient ?? '') as string,
            details: (item.details ?? item.request ?? '') as string,
            pharmacy_name: item.pharmacy_name ?? '',
            pharmacy_location: item.pharmacy_location ?? '',
            created_at: item.created_at,
          };
        });

        setRequests(normalized);
      } catch (error) {
        console.error('Error fetching refill requests:', error as Error);
        setError('Failed to load refill requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [userData]);

  return (
    <div className="w-full h-fit pt-[70px] bg-[#F4F8FB] flex justify-center page-content-with-topbar">
      <div className="w-full max-w-[1400px] py-6 mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0D1A12] font-sf">Medical Refill Requests</h1>
          <span className="text-base text-gray-500">({requests.length})</span>
        </div>
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">{error}</div>}
        <div className="bg-white rounded-[12px] border border-[#D1E5D9] shadow-sm">
          <table className="w-full table-auto text-sm">
            <thead className="bg-[#F4F8FB] h-[46px] rounded-[10px]">
              <tr className="text-left text-gray-600">
                <th className="py-3 px-3">Patient ID</th>
                <th className="py-3 px-3">Patient Name</th>
                <th className="py-3 px-3">Patient Phone</th>
                <th className="py-3 px-3">Caller Name</th>
                <th className="py-3 px-3">Relationship</th>
                <th className="py-3 px-3">Details</th>
                <th className="py-3 px-3">Pharmacy Name</th>
                <th className="py-3 px-3">Pharmacy Location</th>
                <th className="py-3 px-3">Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8">Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No refill requests found.</td></tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="border-t border-[#E5E7EB]">
                    <td className="py-2 px-3">{r.patient_id}</td>
                    <td className="py-2 px-3">{r.patient_name}</td>
                    <td className="py-2 px-3">{r.patient_phone}</td>
                    <td className="py-2 px-3">{r.caller_name}</td>
                    <td className="py-2 px-3">{r.relationship}</td>
                    <td className="py-2 px-3">{r.details}</td>
                    <td className="py-2 px-3">{r.pharmacy_name || '-'}</td>
                    <td className="py-2 px-3">{r.pharmacy_location || '-'}</td>
                    <td className="py-2 px-3">{dayjs.utc(r.created_at).tz(EST_TIMEZONE).format('MMM D YYYY')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DoctorRefillRequests;
