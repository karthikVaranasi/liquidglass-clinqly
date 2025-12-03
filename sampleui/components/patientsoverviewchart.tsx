import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Label } from "recharts";
import axiosInstance from "../utils/axiosInstance";
import { useUserStore } from "../stores/useUserStore";
import type { DoctorData } from "../utils/types";

const COLORS = ["#00C4CC", "#04707D", "#00A8A3", "#004848"];

// Helper function to format age group labels
const formatLabel = (ageGroup: string): string => {
  switch (ageGroup) {
    case "18-25":
      return "Young Adults (18-25)";
    case "26-35":
      return "Adults (26-35)";
    case "36-45":
      return "Middle Age (36-45)";
    case "46-55":
      return "Mature (46-55)";
    case "56-65":
      return "Senior (56-65)";
    case "65+":
      return "Elderly (65+)";
    case "Unknown":
      return "Unknown Age";
    default:
      return ageGroup;
  }
};

const PatientsOverview = () => {
  const navigate = useNavigate();
  const { userData, userRole } = useUserStore();
  const [chartData, setChartData] = useState<{ name: string; value: number; color: string; isUnknown?: boolean }[]>([]);
  const [totalPatients, setTotalPatients] = useState<number>(0);

  // Compute URLs based on user role
  const statsUrl = useMemo(() => {
    if (userRole === 'doctor' && userData) {
      const doctor = userData as DoctorData;
      return `/dashboard/stats/all?clinic_id=${doctor.clinic_id}`;
    }
    return '/dashboard/stats/all';
  }, [userData, userRole]);

  const ageUrl = useMemo(() => {
    if (userRole === 'doctor' && userData) {
      const doctor = userData as DoctorData;
      return `/dashboard/stats/age-distribution?clinic_id=${doctor.clinic_id}`;
    }
    return '/dashboard/stats/age-distribution';
  }, [userData, userRole]);

  // Fetch data function
  const fetchData = useCallback(async () => {
    try {
      // Fetch total patients from stats API
      const statsResponse = await axiosInstance.get<{ stats: { total_patients: number } }>(statsUrl);
      setTotalPatients(statsResponse.data.stats.total_patients);

      // Fetch age distribution
      const response = await axiosInstance.get<{ data: { age_group: string; count: number }[] }>(ageUrl);
      const apiData = response.data.data;
      
      // Include all age groups including "Unknown" and map to chart data
      const coloredData = apiData
        .filter(item => item.count > 0)
        .map((item, index) => ({
          name: formatLabel(item.age_group),
          value: item.count,
          color: COLORS[index % COLORS.length],
          isUnknown: item.age_group === "Unknown"
        }));
      
      setChartData(coloredData);
    } catch (err: unknown) {
      console.error('Failed to fetch patient data:', err);
    }
  }, [statsUrl, ageUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = totalPatients;

  return (
    <div 
      className="w-full h-[280px] bg-white rounded-[10px] p-4 cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={() => {
        if (userRole === 'doctor') {
          navigate('/patientData');
        } else {
          navigate('/patients');
        }
      }}
    >
     <div className="flex justify-center items-center mb-3 w-full">
  <h2 className="text-lg font-semibold text-gray-900">Patients Overview</h2>
</div>

      {total === 0 || chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-500 mb-2">No Patients</h3>
            <p className="text-sm text-gray-400">No patient data available</p>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between w-full"
          style={{
             gap: "40px",
            paddingTop: "8px",
            paddingBottom: "8px",
          }}
        >
          {/* Pie Chart */}
          <div className="flex justify-center">
            <PieChart width={180} height={180}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                <Label
                  content={((props: { viewBox?: { cx?: number; cy?: number } }) => {
                    const { cx, cy } = props.viewBox || {};
                    return (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fill: "#1f2937", fontSize: 14 }}
                      >
                        <tspan x={cx} dy="-0.5em" fill="#6B7280" fontWeight="bold">
                          Total Patients
                        </tspan>
                        <tspan x={cx} dy="1.3em" fontSize="18" fontWeight="bold">
                          {total}
                        </tspan>
                      </text>
                    );
                  }) as never}
                />
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>

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
            </PieChart>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 text-sm text-gray-700 mt-4 md:mt-0">
            {chartData.filter(entry => !entry.isUnknown).map((entry, index) => (
              <div className="flex items-center gap-2" key={index}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsOverview;
