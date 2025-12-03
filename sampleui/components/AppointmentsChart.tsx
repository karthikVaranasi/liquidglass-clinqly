import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { appointmentTrendsService, type AppointmentTrendsResponse } from '../services/appointmentTrendsService';
import { useUserStore } from '../stores/useUserStore';
import type { DoctorData } from '../utils/types';

interface ChartData {
  day: string;
  scheduled: number;
  cancelled: number;
  completed: number;
}

const AppointmentTrendsContainer = () => {
  const navigate = useNavigate();
  const { userData, userRole } = useUserStore();
  const [data, setData] = useState<ChartData[]>([]);

  // Fetch appointment trends function
  const fetchAppointmentTrends = useCallback(async () => {
    try {
      let clinicId: number | undefined;
      let doctorId: number | undefined;
      
      // Only pass IDs for doctor users, admin users get all data
      if (userRole === 'doctor' && userData) {
        const doctor = userData as DoctorData;
        clinicId = doctor.clinic_id;
        doctorId = doctor.id;
      }
      // For admin users, don't pass any IDs to get all clinic data

      const response: AppointmentTrendsResponse = await appointmentTrendsService.getAppointmentTrends(clinicId, doctorId);
      const chartData = appointmentTrendsService.transformDataForChart(response);
      setData(chartData);
    } catch (err) {
      console.error('Failed to fetch appointment trends:', err);
      // Fallback to empty data
      setData([]);
    }
  }, [userData, userRole]);

  useEffect(() => {
    fetchAppointmentTrends();
  }, [fetchAppointmentTrends]);

  if (data.length === 0) {
    return (
      <div 
        className="w-full p-4 bg-white rounded-[10px] h-[280px] flex items-center justify-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
        onClick={() => {
          if (userRole === 'doctor') {
            navigate('/doctor-appointments');
          } else {
            navigate('/appointment');
          }
        }}
      >
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-500 mb-2">No Data</h3>
          <p className="text-sm text-gray-400">No appointment trends available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full p-4 bg-white rounded-[10px] h-[280px] cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => {
        if (userRole === 'doctor') {
          navigate('/doctor-appointments');
        } else {
          navigate('/appointment');
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-center mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Appointment Trends (This Week)</h2>
      </div>
      {/* Chart */}
      <div className="pt-2" style={{ height: '200px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              stroke="#CBD5E1"
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              stroke="#CBD5E1"
              tick={{ fontSize: 11, fill: '#64748B' }}
              label={{
                value: 'Appointments',
                angle: -90,
                position: 'insideLeft',
                style: {
                  textAnchor: 'middle',
                  fontSize: 12,
                  fill: '#64748B',
                },
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              labelStyle={{
                fontSize: "14px",
                fontWeight: "bold",
                color: "#374151",
              }}
              itemStyle={{
                fontSize: "13px",
                color: "#111827",
                marginBottom: "4px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="rect"
              wrapperStyle={{ fontSize: '12px', marginTop: 16 }}
            />
            <Bar
              dataKey="scheduled"
              fill="#06B6D4"
              name="Scheduled"
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="cancelled"
              fill="#EF4444"
              name="Cancelled"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AppointmentTrendsContainer;
