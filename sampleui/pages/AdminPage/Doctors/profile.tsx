import { useEffect, useRef, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { FiHeart } from 'react-icons/fi';
import axiosInstance from '../../../utils/axiosInstance';
import Docprofile from "../../../assets/DocProfile.svg";
import leftarrow from '../../../assets/LeftArrow.svg';
interface Doctor {
  id: number;
  name: string;
  department: string;
  rating?: number;
}

function formatTime(time24: string): string {
  const [hourStr, minuteStr] = time24.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr.padStart(2, '0');
  hour = hour % 12 || 12;
  const ampm = parseInt(hourStr, 10) >= 12 ? '' : '';
  return `${hour}:${minute} ${ampm}`;
}

export default function DoctorProfileModal({
  doctor,
  onClose,
}: {
  doctor: Doctor | null;
  onClose: () => void;
}) {
  const [availability, setAvailability] = useState<{ [day: string]: string[] }>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!doctor) return;
    
    const fetchAvailability = async () => {
      try {
        const response = await axiosInstance.get(
          `/dashboard/doctors/${doctor.id}/availability`
        );
        setAvailability(response.data.availability || {});
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      }
    };
    fetchAvailability();
  }, [doctor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!doctor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50">
      <div
        ref={modalRef}
        className="bg-white w-full max-w-[500px] h-full overflow-y-auto rounded-l-xl shadow-xl transform transition-transform duration-300 translate-x-0"
      >
        {/* Header */}
        <div className="flex items-center mb-4 p-6 font-sf">
         <img src={leftarrow} className="cursor-pointer" onClick={onClose} />
          <h2 className="mx-auto text-lg font-semibold font-Geist">Doctor Profile</h2>
        </div>

        {/* Profile */}
        <div className="flex flex-col items-center px-6">
          <img src={Docprofile} className="w-[120px] h-[120px] rounded-full" alt="Doctor Profile" />
          <h2 className="text-xl font-bold mt-4 text-center font-sf">
            {doctor.name}
          </h2>
          <p className="text-teal-700 font-medium text-sm flex items-center gap-1 mt-2">
            <FiHeart /> {doctor.department}
          </p>
          <div className="flex gap-3 mt-3 text-sm flex-wrap justify-center">
            <span className="text-green-600 font-medium">Active</span>
            {doctor.rating && (
              <span className="flex items-center gap-1 text-gray-700">
                <FaStar className="text-yellow-400" /> {doctor.rating} / 5
              </span>
            )}
          </div>
        </div>

        {/* Availability Section */}
        <div className="w-full max-w-[420px] mx-auto text-left px-6 mt-8">
          <div className="mt-6">
            <h3 className="text-teal-700 font-semibold text-sm mb-2">Available Timings</h3>
            {Object.keys(availability).length === 0 ? (
              <p className="text-gray-500 italic">No availability data</p>
            ) : (
              <div className="text-gray-700 text-sm space-y-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => {
                  const matchedKey = Object.keys(availability).find(
                    (key) => key.trim().toLowerCase() === day.toLowerCase()
                  );
                  const slots = matchedKey ? availability[matchedKey] : [];

                  if (!slots || slots.length === 0) {
                    return (
                      <p key={day}>
                        <strong>{day}:</strong> No slots
                      </p>
                    );
                  }

                  const sortedSlots = [...slots].sort();
                  const start = sortedSlots[0];
                  const end = sortedSlots[sortedSlots.length - 1];

                  return (
                    <p key={day}>
                      <strong>{day}:</strong> {formatTime(start)} - {formatTime(end)}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
