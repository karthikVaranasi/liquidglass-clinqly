import { IconCalendar, IconMedicalCross, IconUsers, IconBone, IconBrain, IconFlask, IconUser, IconHeart, IconHeartbeat, IconArrowRight } from "@tabler/icons-react"
import { PieChart, Pie, Cell, Bar, BarChart, XAxis, Tooltip } from "recharts"
import { useState, useEffect } from "react"
import { getErrorMessage } from "@/lib/errors"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart"
import type {
  ChartConfig,
} from "@/components/ui/chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AdminAnalyticsAPI } from "@/api/admin"
import { AdminDoctorsAPI } from "@/api/admin"
import type { DashboardStats, AgeDistributionItem, AppointmentTrendItem } from "@/api/doctor/analytics"

// Helper function to get icon by department
const getIconByDepartment = (department: string) => {
  switch (department.toLowerCase()) {
    case 'cardiology':
    case 'cardiologist':
      return <IconHeart className="text-2xl text-emerald-800" />
    case 'general physician':
      return <IconHeartbeat className="text-2xl text-emerald-800" />
    case 'neurology':
      return <IconBrain className="text-2xl text-emerald-800" />
    case 'orthopedic':
      return <IconBone className="text-2xl text-emerald-800" />
    case 'endocrinology':
      return <IconFlask className="text-2xl text-emerald-800" />
    default:
      return <IconUser className="text-2xl text-emerald-800" />
  }
}

const patientChartConfig = {
  value: {
    label: "Patients",
  },
} satisfies ChartConfig

const appointmentChartConfig = {
  scheduled: {
    label: "Scheduled",
    color: "var(--color-chart-1)",
  },
  cancelled: {
    label: "Cancelled",
    color: "var(--destructive)",
  },
} satisfies ChartConfig

// Light gradient accents for each stat card (keeps visuals consistent with login/admin)
const statGradients: Record<string, string> = {
  patients: "from-emerald-500/25 via-emerald-500/10 to-transparent",
  doctors: "from-blue-500/25 via-blue-500/10 to-transparent",
  appointments: "from-amber-500/25 via-amber-500/10 to-transparent",
  upcoming: "from-fuchsia-500/25 via-fuchsia-500/10 to-transparent",
}

interface AnalyticsPageProps {
  onPageChange?: (pageOrObject: string | { page: string; params?: any }) => void
}

export function AnalyticsPage({ onPageChange }: AnalyticsPageProps) {
  const [selectedPieSlice, setSelectedPieSlice] = useState<string | null>(null)
  const [selectedBar, setSelectedBar] = useState<string | null>(null)
  const [chartSize, setChartSize] = useState({ innerRadius: 20, outerRadius: 45 })

  // API state
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [patientAgeData, setPatientAgeData] = useState<AgeDistributionItem[]>([])
  const [appointmentData, setAppointmentData] = useState<AppointmentTrendItem[]>([])
  const [doctorStats, setDoctorStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch analytics data from API
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      // Add a delay to allow authentication validation to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      try {
        setLoading(true)
        setError(null)

        // Fetch all data in parallel
        const [statsData, ageDistributionData, trendsData, doctorsData] = await Promise.all([
          AdminAnalyticsAPI.getAllStats(),
          AdminAnalyticsAPI.getAgeDistribution(),
          AdminAnalyticsAPI.getAppointmentTrends(),
          AdminDoctorsAPI.getAllDoctors(),
        ])

        setStats(statsData)
        setPatientAgeData(ageDistributionData)
        setAppointmentData(trendsData)

        // Process doctors data for specializations
        const stats: Record<string, number> = {}
        doctorsData.forEach((doc) => {
          const dept = doc.department?.trim()
          if (dept && dept.toLowerCase() !== 'temp') {
            stats[dept] = (stats[dept] || 0) + 1
          }
        })
        setDoctorStats(stats)

      } catch (err) {
        console.error('Failed to fetch analytics data:', err)
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])

  // Responsive chart size based on screen size
  useEffect(() => {
    const updateChartSize = () => {
      const width = window.innerWidth
      if (width < 640) {
        // Mobile: small screens
        setChartSize({ innerRadius: 15, outerRadius: 35 })
      } else if (width < 768) {
        // Small tablets
        setChartSize({ innerRadius: 18, outerRadius: 40 })
      } else if (width < 1024) {
        // Tablets
        setChartSize({ innerRadius: 20, outerRadius: 45 })
      } else {
        // Desktop: large screens
        setChartSize({ innerRadius: 25, outerRadius: 55 })
      }
    }

    updateChartSize()
    window.addEventListener('resize', updateChartSize)

    return () => window.removeEventListener('resize', updateChartSize)
  }, [])

  const handlePieClick = (data: any) => {
    if (data && data.name) {
      setSelectedPieSlice(selectedPieSlice === data.name ? null : data.name)
    }
  }

  const handlePatientsClick = () => {
    if (onPageChange) {
      onPageChange("patients")
    }
  }

  const handleAppointmentsClick = () => {
    if (onPageChange) {
      onPageChange("appointments")
    }
  }

  const handleDoctorsClick = () => {
    if (onPageChange) {
      onPageChange("doctors")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error loading analytics</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="px-4 lg:px-6">
        <span className="text-base sm:text-lg font-bold text-foreground">
          Welcome,{" "}
          <span className="text-foreground font-bold">Admin</span>
        </span>
      </div>

      {/* Statistics Cards Section */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div
            className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group
              bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-transparent
              backdrop-blur-xl border-2 border-sky-500/50 dark:border-sky-400/50
              shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
              hover:scale-[1.02] glass-shine cursor-pointer"
            onClick={handlePatientsClick}
          >
            {/* Dynamic Sliding Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            <div className="relative space-y-2 z-10">
              <div className="flex items-center gap-2 text-sm font-semibold !text-foreground drop-shadow-sm">
                <IconUsers className="size-5" />
                Total Patients
              </div>
              <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl !text-foreground drop-shadow-md">
                {stats?.total_patients?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group
             bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent
             backdrop-blur-xl border-2 border-emerald-500/50 dark:border-emerald-400/50
             shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
             hover:scale-[1.02] glass-shine cursor-pointer"
            onClick={handleDoctorsClick}
          >
            {/* Dynamic Sliding Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            <div className="relative space-y-2 z-10">
              <div className="flex items-center gap-2 text-sm font-semibold !text-foreground drop-shadow-sm">
                <IconMedicalCross className="size-5" />
                Total Logs
              </div>
              <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl !text-foreground drop-shadow-md">
                {stats?.total_doctors?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div
            className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group
            bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-transparent
            backdrop-blur-xl border-2 border-indigo-500/50 dark:border-indigo-400/50
            shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
            hover:scale-[1.02] glass-shine cursor-pointer"
            onClick={handleAppointmentsClick}
          >
            {/* Dynamic Sliding Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            <div className="relative space-y-2 z-10">
              <div className="flex items-center gap-2 text-sm font-semibold !text-foreground drop-shadow-sm">
                <IconCalendar className="size-5" />
                Total Appointments
              </div>
              <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl !text-foreground drop-shadow-md">
                {stats?.total_appointments?.toLocaleString() || 0}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl p-4 transition-all duration-300 group
            bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-transparent
            backdrop-blur-xl border-2 border-purple-500/50 dark:border-purple-400/50
            shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]
            hover:scale-[1.02] glass-shine"
          >
            {/* Dynamic Sliding Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />

            <div className="relative space-y-2 z-10">
              <div className="flex items-center gap-2 text-sm font-semibold !text-foreground drop-shadow-sm">
                <IconCalendar className="size-5" />
                Today's Appointments
              </div>
              <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl !text-foreground drop-shadow-md">
                {stats?.upcoming_appointments?.toLocaleString() || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 px-4 lg:px-6 xl:grid-cols-2">
        {/* Appointment Trends */}
        <Card className="neumorphic-inset border-0">
          <CardHeader>
            <CardTitle>Appointment Trends (This Week)</CardTitle>
            <CardDescription>
              {selectedBar ? (
                <div>
                  {selectedBar} - Scheduled: {appointmentData.find(d => d.day === selectedBar)?.scheduled || 0}, Cancelled: {appointmentData.find(d => d.day === selectedBar)?.cancelled || 0}
                </div>
              ) : (
                <span>Weekly appointment statistics</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={appointmentChartConfig} className="h-[250px] w-full sm:h-[280px] lg:h-[320px]">
              <BarChart
                accessibilityLayer
                data={appointmentData}
                onMouseLeave={() => setSelectedBar(null)}
              >
                <rect
                  x="0"
                  y="0"
                  width="100%"
                  height="85%"
                  fill="url(#default-multiple-pattern-dots)"
                />
                <defs>
                  <DottedBackgroundPattern />
                </defs>
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" className="neumorphic-card border-0 shadow-none" />}
                />
                <Bar dataKey="scheduled" fill="var(--color-chart-1)" radius={4}>
                  {appointmentData.map((_, index) => (
                    <Cell
                      key={`cell-scheduled-${index}`}
                      fillOpacity={
                        selectedBar === null ? 1 : selectedBar === appointmentData[index].day ? 1 : 0.3
                      }
                      stroke={selectedBar === appointmentData[index].day ? "var(--color-chart-1)" : ""}
                      onMouseEnter={() => setSelectedBar(appointmentData[index].day)}
                      className="duration-200"
                    />
                  ))}
                </Bar>
                <Bar dataKey="cancelled" fill="var(--destructive)" radius={4}>
                  {appointmentData.map((_, index) => (
                    <Cell
                      key={`cell-cancelled-${index}`}
                      fillOpacity={
                        selectedBar === null ? 1 : selectedBar === appointmentData[index].day ? 1 : 0.3
                      }
                      stroke={selectedBar === appointmentData[index].day ? "var(--destructive)" : ""}
                      onMouseEnter={() => setSelectedBar(appointmentData[index].day)}
                      className="duration-200"
                    />
                  ))}
                </Bar>
                <ChartLegend />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Patients Overview */}
        <div className="neumorphic-inset rounded-lg p-4 border-0">
          <div className="pb-4">
            <h3 className="text-lg font-semibold">Patients Overview</h3>
            <div className="flex items-center justify-between mt-1">
              <span className="flex items-center gap-2 text-sm">
                <IconUsers className="size-4" />
                Total Patients {stats?.total_patients?.toLocaleString() || 0}
              </span>
            </div>
          </div>
          <div className="px-4 sm:px-6">
            <div className="flex flex-row gap-6 items-center">
              <div className="flex-shrink-0 flex justify-center">
                <ChartContainer
                  config={patientChartConfig}
                  className="h-[120px] w-[120px] sm:h-[140px] sm:w-[140px] md:h-[160px] md:w-[160px] lg:h-[180px] lg:w-[180px]"
                >
                  <PieChart>
                    <Pie
                      data={patientAgeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={chartSize.innerRadius}
                      outerRadius={chartSize.outerRadius}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={handlePieClick}
                      style={{ cursor: 'pointer' }}
                    >
                      {patientAgeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={selectedPieSlice === entry.name ? entry.color : entry.color}
                          opacity={selectedPieSlice === null || selectedPieSlice === entry.name ? 1 : 0.6}
                          stroke={selectedPieSlice === entry.name ? '#000' : 'none'}
                          strokeWidth={selectedPieSlice === entry.name ? 2 : 0}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="neumorphic-card rounded-lg p-3">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">{data.value} patients</p>
                              <p className="text-xs mt-1">Click to {selectedPieSlice === data.name ? 'deselect' : 'focus'}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ChartContainer>
              </div>
              <div className="flex-1 space-y-3">
                {patientAgeData.filter(entry => entry.name !== 'Unknown').map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between text-sm cursor-pointer p-2 rounded-md transition-all duration-200 ${selectedPieSlice === entry.name ? 'neumorphic-pressed' : 'neumorphic-soft neumorphic-hover neumorphic-active'
                      }`}
                    onClick={() => handlePieClick({ name: entry.name })}
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></div>
                      {entry.name}
                    </span>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specializations */}
      {/* <div className="px-4 lg:px-6">
        <div className="w-full h-[180px] p-4 rounded-[10px] bg-white flex flex-col">
          <div className="flex flex-row justify-between items-center w-full mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Specializations
            </h2>
            {Object.entries(doctorStats).length > 5 && (
              <Button
                className="text-emerald-800 border border-emerald-800 w-[82px] h-[32px] rounded-[4px] text-sm hover:bg-emerald-50 transition"
                onClick={() => onPageChange && onPageChange('doctors')}
              >
                View all
              </Button>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto overflow-y-hidden flex-1">
            {Object.entries(doctorStats).map(([title, count], index) => (
              <div
                key={index}
                className="flex flex-col w-[145px] min-w-[145px] h-[110px] rounded-lg bg-white hover:shadow-md transition cursor-pointer relative"
                onClick={() => onPageChange && onPageChange({ page: 'doctors', params: { department: title } })}
              >
                <div className="flex flex-col justify-between border-t border-l border-r border-b border-gray-200 rounded-lg p-3 h-[90px]">
                  <div className="flex justify-between items-start">
                    <div>{getIconByDepartment(title)}</div>
                    <IconArrowRight className="text-sm text-emerald-600" />
                  </div>
                  <div className="font-semibold text-black-900 text-sm capitalize text-left">{title}</div>
                  <div className="text-xs text-gray-600 text-left">{count} Doctors</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  )
}

const DottedBackgroundPattern = () => {
  return (
    <pattern
      id="default-multiple-pattern-dots"
      x="0"
      y="0"
      width="10"
      height="10"
      patternUnits="userSpaceOnUse"
    >
      <circle
        className="dark:text-muted/40 text-muted"
        cx="2"
        cy="2"
        r="1"
        fill="currentColor"
      />
    </pattern>
  );
};
