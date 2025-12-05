import { IconCalendar, IconMedicalCross, IconUsers } from "@tabler/icons-react"

// Helper function to get icon component by name
const getIcon = (iconName: string) => {
  const icons = {
    IconUsers,
    IconMedicalCross,
    IconCalendar,
  }
  return icons[iconName as keyof typeof icons] || IconUsers
}
import { PieChart, Pie, Cell, Bar, BarChart, XAxis, Tooltip } from "recharts"
import { useState, useEffect } from "react"

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

import data from "@/data.json"

// Destructure data from imported JSON
const { patientAgeData, appointmentData } = data

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

interface AnalyticsPageProps {
  onPageChange?: (page: string) => void
}

export function AnalyticsPage({ onPageChange }: AnalyticsPageProps) {
  const { dashboard } = data
  const [selectedPieSlice, setSelectedPieSlice] = useState<string | null>(null)
  const [selectedBar, setSelectedBar] = useState<string | null>(null)
  const [chartSize, setChartSize] = useState({ innerRadius: 20, outerRadius: 45 })

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



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Cards Section */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {dashboard.stats.map((stat) => {
            const IconComponent = getIcon(stat.icon)
            const handleCardClick = () => {
              if (stat.id === "totalPatients" && onPageChange) {
                onPageChange("patients")
              } else if (stat.id === "totalAppointments" && onPageChange) {
                onPageChange("appointments")
              }
            }

            const isClickable = stat.id === "totalPatients" || stat.id === "totalAppointments"

            return (
              <div
                key={stat.id}
                className={`neumorphic-inset p-4 neumorphic-hover transition-all duration-200 ${
                  isClickable ? "cursor-pointer" : ""
                }`}
                onClick={isClickable ? handleCardClick : undefined}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <IconComponent className="size-4" />
                    {stat.label}
                  </div>
                  <div className="text-3xl font-bold tabular-nums sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
                    {stat.value}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* Appointment Trends and Patients Overview*/}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 px-4 lg:px-6 xl:grid-cols-[2fr_1fr]">
        {/* Appointment Trends */}
        <Card className="neumorphic-inset border-0">
          <CardHeader>
            <CardTitle>
              {dashboard.sections.appointmentTrends.title}
            </CardTitle>
            <CardDescription>
              {selectedBar ? (
                <div>
                  {selectedBar} - Scheduled: {appointmentData.find(d => d.day === selectedBar)?.scheduled || 0}, Cancelled: {appointmentData.find(d => d.day === selectedBar)?.cancelled || 0}
                </div>
              ) : (
                <span>{dashboard.sections.appointmentTrends.description}</span>
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
            <h3 className="text-lg font-semibold">{dashboard.sections.patientsOverview.title}</h3>
            <div className="flex items-center justify-between mt-1">
              <span className="flex items-center gap-2 text-sm">
                <IconUsers className="size-4" />
                {dashboard.sections.patientsOverview.description}
              </span>
            </div>
          </div>
          <div className="px-4 sm:px-6">
            <div className="flex flex-col gap-2">
              <div className="flex-shrink-0 mx-auto sm:mx-0 flex justify-center">
                <ChartContainer
                  config={patientChartConfig}
                  className="h-[100px] w-[100px] sm:h-[120px] sm:w-[120px] md:h-[140px] md:w-[140px] lg:h-[160px] lg:w-[160px]"
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
                {dashboard.sections.patientsOverview.legend.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between text-sm cursor-pointer p-2 rounded-md transition-all duration-200 ${
                      selectedPieSlice === item.label ? 'neumorphic-pressed' : 'neumorphic-soft neumorphic-hover neumorphic-active'
                    }`}
                    onClick={() => handlePieClick({ name: item.label })}
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      {item.label}
                    </span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

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
