import React, { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import axiosInstance from "../../../utils/axiosInstance";
import dayjs from "dayjs";
import { Clock } from "lucide-react";

interface DoctorAppointmentsPageProps {
  doctorName: string;
  onClose?: () => void;
}

interface Doctor {
  id: number;
  name: string;
}

interface Appointment {
  id: number;
  appointment_time: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  department: string;
  status: string;
  duration: number;
  calendar_event_id?: string;
}

const AppointmentHeader: React.FC<{
  view: string;
  setView: (view: string) => void;
}> = ({ view, setView }) => (
  <div className="font-geist flex items-center justify-between w-[407px] h-[40px] bg-white px-0 mx-auto">
    <h1 className="font-geist font-semibold text-[18px] text-black">Appointments</h1>
    <div className="flex">
      {["month", "week"].map((val) => (
        <button
          key={val}
          onClick={() => setView(val)}
          className={`w-[79px] h-[40px] border border-gray-300 transition-all duration-200 flex items-center justify-center 
          ${view === val ? "bg-teal-600 text-white" : "bg-white text-teal-600"}`}
          style={{
            borderTopLeftRadius: val === "month" ? "8px" : undefined,
            borderBottomLeftRadius: val === "month" ? "8px" : undefined,
            borderTopRightRadius: val === "week" ? "8px" : undefined,
            borderBottomRightRadius: val === "week" ? "8px" : undefined,
            borderRight: val === "month" ? "none" : undefined,
          }}
        >
          <span className="font-[500] text-[15px]">{val === "month" ? "Month" : "Week"}</span>
        </button>
      ))}
    </div>
  </div>
);

const AppointmentCards: React.FC<{
  appointments: Appointment[];
  selectedDate: dayjs.Dayjs;
}> = ({ appointments, selectedDate }) => {
  const formattedDate = selectedDate.format("YYYY-MM-DD");
  const filtered = appointments.filter(
    (appt) => dayjs(appt.appointment_time).format("YYYY-MM-DD") === formattedDate
  );

  const getStatusStyle = (status: string, time: string) => {
    const isPast = dayjs(time).isBefore(dayjs());
    const isUpcoming = dayjs(time).isAfter(dayjs());
    if (isPast) return { statusText: "Finished", colorClass: "bg-green-500 text-white" };
    if (isUpcoming) return { statusText: "Up-Coming", colorClass: "bg-orange-500 text-white" };

    switch (status.toLowerCase()) {
      case "finished":
        return { statusText: "Finished", colorClass: "bg-green-500 text-white" };
      case "re-scheduled":
        return { statusText: "Re-Scheduled", colorClass: "bg-gray-800 text-white" };
      default:
        return { statusText: "Scheduled", colorClass: "bg-gray-500 text-white" };
    }
  };

  return (
    <div className="w-[408px] flex flex-col gap-3 mx-auto" style={{ height: "calc(100vh - 70px - 40px - 374px - 60px)" }}>
      <div className="overflow-y-auto flex flex-col gap-3 pr-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No appointments on {selectedDate.format("dddd, MMM D")}.
          </p>
        ) : (
          filtered.map((appt) => {
            const { statusText, colorClass } = getStatusStyle(appt.status, appt.appointment_time);
            return (
              <div key={appt.id} className="w-[408px] h-[68px] flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center gap-3 px-4 py-3 flex-1">
                 
                  <div className="flex-1">
                    <p className="text-[16px] text-black mb-1">{appt.patient_name?.trim() || "Unknown Patient"}</p>
                    <div className="flex items-center gap-1 text-gray-600">
                      <div className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full">
                        <Clock className="w-3.5 h-3.5" stroke="black" fill="white" />
                      </div>
                      <span className="text-[14px]">
                        {dayjs(appt.appointment_time).format("HH:mm")} -{" "}
                        {dayjs(appt.appointment_time).add(appt.duration || 60, "minute").format("HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className={`px-4 py-2 rounded-md text-[14px] font-medium ${colorClass} min-w-[100px] text-center`}>
                    {statusText}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const CustomCalendar: React.FC<{
  selectedDate: dayjs.Dayjs;
  onDateChange: (date: dayjs.Dayjs) => void;
}> = ({ selectedDate, onDateChange }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.startOf("month"));
  const startOfWeek = currentMonth.startOf("month").startOf("week");
  const days = Array.from({ length: 42 }).map((_, i) => startOfWeek.add(i, "day"));
  const weeks = Array.from({ length: 6 }, (_, i) => days.slice(i * 7, i * 7 + 7));

  return (
    <div className="w-[407px] h-[374px] bg-white rounded-lg border border-gray-200 mx-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <button onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}>
          <FaArrowLeft className="text-gray-600" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{currentMonth.format("MMMM YYYY")}</h2>
        <button onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}>
          <FaArrowRight className="text-gray-600" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center border-b text-sm text-gray-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="p-2">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const isCurrent = d.month() === currentMonth.month();
              const isToday = d.isSame(dayjs(), "day");
              const selected = d.isSame(selectedDate, "day");
              return (
                <button
                  key={d.toString()}
                  onClick={() => onDateChange(d)}
                  className={`h-10 w-10 mx-auto rounded-full flex items-center justify-center text-sm
                    ${selected ? "bg-teal-600 text-white font-bold" :
                    isToday ? "bg-blue-50 text-blue-600 font-semibold" :
                    isCurrent ? "text-gray-900 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-50"}`}
                >
                  {d.date()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const WeekView: React.FC<{
  selectedDate: dayjs.Dayjs;
  onDateChange: (date: dayjs.Dayjs) => void;
  weekStart: dayjs.Dayjs;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
}> = ({ selectedDate, onDateChange, weekStart, goToPrevWeek, goToNextWeek }) => {
  const days = Array.from({ length: 7 }).map((_, i) => weekStart.add(i, "day"));

  return (
    <div className="w-[408px] h-[60px] flex items-center justify-between gap-2 px-2">
      <button onClick={goToPrevWeek} className="bg-[#F4F4F4] rounded-full p-2 hover:bg-gray-200">
        <FaArrowLeft />
      </button>
      <div className="flex flex-grow justify-around">
        {days.map((d) => {
          const selected = d.isSame(selectedDate, "day");
          const today = d.isSame(dayjs(), "day");
          return (
            <div key={d.toString()} onClick={() => onDateChange(d)} className={`flex flex-col items-center px-2 py-1 w-[48px] h-[50px] cursor-pointer rounded-md
              ${selected ? "bg-teal-700 text-white" : today ? "bg-blue-100 text-blue-700" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
              <span className="font-semibold text-[18px]">{d.date()}</span>
              <span className="text-[12px]">{d.format("dd")}</span>
            </div>
          );
        })}
      </div>
      <button onClick={goToNextWeek} className="bg-[#F4F4F4] rounded-full p-2 hover:bg-gray-200">
        <FaArrowRight />
      </button>
    </div>
  );
};

const DoctorAppointmentsPage: React.FC<DoctorAppointmentsPageProps> = ({ doctorName }) => {
  const location = useLocation();
  const isFromSearch = location.state?.fromSearch || false;
  const passedDate = location.state?.selectedDate || null;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => passedDate ? dayjs(passedDate) : dayjs());
  const [weekStart, setWeekStart] = useState(() => passedDate ? dayjs(passedDate).startOf("week").add(1, "day") : dayjs().startOf("week").add(1, "day"));
  const [view, setView] = useState("week");
  const [autoScrollToAppointments, setAutoScrollToAppointments] = useState(isFromSearch);
  const [loading, setLoading] = useState(true);

  const appointmentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        // Fetch all doctors and find the one by name
        const doctorRes = await axiosInstance.get(`/dashboard/doctors`);
        const doctor = doctorRes.data.doctors.find((d: Doctor) => d.name === doctorName);
        const doctorId = doctor?.id;
        if (!doctorId) {
          console.error("Doctor not found:", doctorName);
          setLoading(false);
          return;
        }

        // Fetch appointments for this doctor (no date parameter in API)
        const apptRes = await axiosInstance.get<{ appointments: Appointment[] }>(
          `/dashboard/appointments?doctor_id=${doctorId}`
        );
        setAppointments(apptRes.data.appointments || []);
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [doctorName]);

  useEffect(() => {
    if (autoScrollToAppointments && appointmentRef.current) {
      appointmentRef.current.scrollIntoView({ behavior: "smooth" });
      appointmentRef.current.classList.add("animate-pulse");
      setTimeout(() => {
        appointmentRef.current?.classList.remove("animate-pulse");
      }, 1500);
      setAutoScrollToAppointments(false);
    }
  }, [appointments, autoScrollToAppointments]);

  return (
    <div className="w-[455px] h-screen mx-auto bg-white flex flex-col">
      <div className="flex flex-col gap-[20px] px-6 py-5 flex-1">
        <AppointmentHeader view={view} setView={setView} />
                 {loading ? (
           <div className="flex flex-col justify-center items-center h-full">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mb-4"></div>
             <p className="text-gray-600 text-lg">Loading appointments...</p>
           </div>
        ) : (
          <>
            {view === "week" ? (
              <WeekView
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                weekStart={weekStart}
                goToNextWeek={() => setWeekStart(weekStart.add(7, "day"))}
                goToPrevWeek={() => setWeekStart(weekStart.subtract(7, "day"))}
              />
            ) : (
              <CustomCalendar selectedDate={selectedDate} onDateChange={setSelectedDate} />
            )}
            <div ref={appointmentRef}>
              <AppointmentCards appointments={appointments} selectedDate={selectedDate} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorAppointmentsPage;
