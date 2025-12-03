import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { FaClock, FaArrowLeft, FaArrowRight } from "react-icons/fa";
import axiosInstance from "../utils/axiosInstance";
import dayjs from "dayjs";
import { useUserStore } from "../stores/useUserStore";
import type { DoctorData } from "../utils/types";

interface Appointment {
  appointment_id: number;
  appointment_time: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  status: string;
  duration: number;
  calendar_event_id: string;
}

const AppointmentsCard = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [weekStart, setWeekStart] = useState(dayjs().startOf("week").add(1, "day")); // Monday
  const [showModal, setShowModal] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const { userData, userRole } = useUserStore();

  const appointmentsUrl = useMemo(() => {
    if (userRole === 'doctor' && userData) {
      const doctorData = userData as DoctorData;
      return `/dashboard/appointments?clinic_id=${doctorData.clinic_id}&doctor_id=${doctorData.id}`;
    }
    return `/dashboard/appointments`;
  }, [userRole, userData]);

  const viewAllPath = useMemo(() => {
    return userRole === 'doctor' ? '/doctor-appointments' : '/appointment';
  }, [userRole]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await axiosInstance.get<{ appointments: Appointment[] }>(appointmentsUrl);
        console.log(response.data);
        setAppointments(response.data.appointments);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }
    };

    fetchAppointments();
  }, [appointmentsUrl]);

  const weekDates = Array.from({ length: 7 }).map((_, i) => weekStart.add(i, "day"));

  const filteredAppointments = appointments.filter(
    (appt) =>
      dayjs(appt.appointment_time).format("YYYY-MM-DD") ===
      selectedDate.format("YYYY-MM-DD")
  );

  const goToNextWeek = () => setWeekStart(weekStart.add(7, "day"));
  const goToPrevWeek = () => setWeekStart(weekStart.subtract(7, "day"));

  const isWeekend = (date: dayjs.Dayjs) => {
    const day = date.day();
    return day === 0 || day === 6;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showModal]);

  return (
    <>
      <div className="bg-white rounded-[10px] p-4 flex flex-col w-full h-full lg:h-[472px]">
        <div className="flex justify-between items-center w-full mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-[#0D1A12]">Appointments</h2>
          <Link
            to={viewAllPath}
            state={{ initialFilter: 'all' }}
            className="text-teal-700 text-xs sm:text-sm border border-teal-700 hover:bg-teal-50 transition rounded px-3 py-1 sm:px-4 sm:py-2"
          >
            View all
          </Link>
        </div>

        <div className="flex items-center gap-[2px] w-full mb-3">
          <button onClick={goToPrevWeek} className="bg-[#F4F4F4] rounded-full p-2">
            <FaArrowLeft />
          </button>

          <div className="flex items-center flex-grow text-slate-800 overflow-x-auto justify-around">
            {weekDates.map((dateObj) => {
              const isSelected = dateObj.isSame(selectedDate, "day");
              const isDisabled = isWeekend(dateObj);

              return (
                <div
                  key={dateObj.format("YYYY-MM-DD")}
                  className={`flex flex-col items-center px-2 py-1 rounded-md w-[40px] sm:w-[48px] h-[50px] text-center flex-shrink-0 ${ // Added flex-shrink-0
                    isSelected ? "bg-[#F4F4F4] border border-teal-700" : ""
                  } ${
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    if (!isDisabled) setSelectedDate(dateObj);
                  }}
                >
                  <span className="text-xs sm:text-sm font-semibold">{dateObj.date()}</span>
                  <span className="text-xs font-semibold">{dateObj.format("dd")}</span>
                </div>
              );
            })}
          </div>

          <button onClick={goToNextWeek} className="bg-[#F4F4F4] rounded-full p-2">
            <FaArrowRight />
          </button>
        </div>

        {/* Appointments List */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1 w-full flex-1">
          {filteredAppointments.length === 0 ? (
            <p className="text-sm text-gray-500">
              No appointments on {selectedDate.format("dddd, MMM D")}.
            </p>
          ) : (
            filteredAppointments.map((appt, index) => (
              <div
                key={`filtered-appt-${appt.appointment_id}-${index}`}
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center border rounded-md overflow-hidden min-h-[56px]"
              >
                {/* Let this div grow to take available space, min-width to ensure content isn't too squished */}
                <div className="flex items-center gap-3 px-3 py-1.5 flex-grow min-w-0 w-full sm:w-auto">
                  <div>
                    <p className="font-semibold text-sm">
                      {appt.patient_name?.trim() || "Unnamed Patient"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <FaClock className="text-sm" />
                      <span>{dayjs(appt.appointment_time).format("hh:mm A")}</span>
                    </div>
                  </div>
                </div>
                {/* Use explicit width for the right section or make it responsive */}
                {/* Adjusted width to allow for flex-shrink if needed, but keeping fixed for now */}
                <div className="bg-teal-700 text-white px-4 py-1.5 flex flex-col items-start justify-center w-full sm:w-[150px] flex-shrink-0 h-full">
                  <p className="text-sm font-semibold">{appt.doctor_name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div
            ref={modalRef}
            className="bg-white p-4 sm:p-6 rounded-lg max-h-[80vh] w-full max-w-[480px] overflow-y-auto scrollbar-hide relative shadow-lg"
          >
            <button
              className="absolute top-2 right-3 text-gray-600 hover:text-red-500 text-xl"
              onClick={() => setShowModal(false)}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4 text-left">All Appointments</h3>
            {[...appointments]
              .sort((a, b) => {
                const isAEmpty = !a.patient_name?.trim();
                const isBEmpty = !b.patient_name?.trim();
                return isAEmpty === isBEmpty ? 0 : isAEmpty ? 1 : -1;
              })
              .map((appt, index) => (
                <div
                  key={`appt-${appt.appointment_id}-${index}`}
                  className="flex justify-between items-center border rounded-md mb-3 overflow-hidden"
                >
                  {/* Left section: allows text to wrap, ensures image doesn't shrink */}
                  <div className="flex items-center gap-3 px-2 py-2 flex-grow min-w-0">
                      
                    <div className="text-left">
                      <p className="font-semibold text-sm">
                        {appt.patient_name?.trim() || "Unnamed Patient"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <FaClock className="text-sm" />
                        <span>
                          {dayjs(appt.appointment_time).format(
                            "dddd, MMM D - hh:mm A"
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Right section: fixed width, flex-shrink-0 */}
                  <div className="bg-teal-700 text-white px-4 py-3 flex flex-col items-start justify-center w-[210px] flex-shrink-0">
                    <p className="text-sm font-semibold">{appt.doctor_name}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
};

export default AppointmentsCard;
