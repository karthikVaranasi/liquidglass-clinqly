import { useState, useEffect } from "react"
import { IconPlus, IconTrash, IconPencil, IconRefresh, IconLoader2 } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { TimePicker } from "@/components/ui/time-picker"
import { DatePicker } from "@/components/ui/date-picker"
import toast from "react-hot-toast"
import { getToastErrorMessage } from "@/lib/errors"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { AuthStorage } from "@/api/auth"
import { useAuth } from "@/hooks/use-auth"
import {
  AvailabilityAPI,
  workingHoursToApiFormat,
  workingHoursFromApiFormat,
  dateToDisplayFormat,
  dateToApiFormat,
  timeToApiFormat,
  timeFromApiFormat,
} from "@/api/doctor"
import type { AvailabilityException } from "@/api/shared/types"

// Default working hours structure (used as fallback)
const defaultWorkingHours = [
  { day: "Monday", open: "9:00 AM", close: "5:00 PM", isClosed: false },
  { day: "Tuesday", open: "9:00 AM", close: "5:00 PM", isClosed: false },
  { day: "Wednesday", open: "9:00 AM", close: "5:00 PM", isClosed: false },
  { day: "Thursday", open: "9:00 AM", close: "5:00 PM", isClosed: false },
  { day: "Friday", open: "9:00 AM", close: "5:00 PM", isClosed: false },
  { day: "Saturday", open: "9:00 AM", close: "5:00 PM", isClosed: true },
  { day: "Sunday", open: "9:00 AM", close: "5:00 PM", isClosed: true },
]

// Helpers to convert between stored "MM-DD-YYYY" (US format) and DatePicker "YYYY-MM-DD"
const toDatePickerValue = (value: string): string => {
  if (!value) return ""
  const parts = value.split("-")
  if (parts.length !== 3) return ""
  const [mm, dd, yyyy] = parts
  if (!dd || !mm || !yyyy) return ""
  return `${yyyy}-${mm}-${dd}`
}

const fromDatePickerValue = (value: string): string => {
  if (!value) return ""
  const parts = value.split("-")
  if (parts.length !== 3) return ""
  const [yyyy, mm, dd] = parts
  if (!dd || !mm || !yyyy) return ""
  return `${mm}-${dd}-${yyyy}`
}

type OffDay = {
  id: number
  startDate: string // MM-DD-YYYY (US format)
  endDate?: string // MM-DD-YYYY (US format)
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
  isHoliday?: boolean
}

// Convert API AvailabilityException to local OffDay format
const exceptionToOffDay = (exception: AvailabilityException): OffDay => ({
  id: exception.id,
  startDate: dateToDisplayFormat(exception.exception_date),
  endDate: exception.end_date ? dateToDisplayFormat(exception.end_date) : undefined,
  allDay: exception.is_all_day,
  startTime: exception.start_time ? timeFromApiFormat(exception.start_time) : "08:00 AM",
  endTime: exception.end_time ? timeFromApiFormat(exception.end_time) : "06:00 PM",
  reason: exception.reason || "",
  isHoliday: exception.is_us_holiday || false,
})

export function SettingsPage() {
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours)
  const [activeSettingsTab, setActiveSettingsTab] = useState<"working-hours" | "off-days" | "public-holidays">("working-hours")

  // Loading states
  const [isLoadingWorkingHours, setIsLoadingWorkingHours] = useState(true)
  const [isLoadingOffDays, setIsLoadingOffDays] = useState(true)
  const [isSavingWorkingHours, setIsSavingWorkingHours] = useState(false)
  const [isSavingOffDay, setIsSavingOffDay] = useState(false)
  const [isDeletingOffDay, setIsDeletingOffDay] = useState(false)
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false)

  // Get clinic and doctor IDs from auth context
  const { clinic, doctor } = useAuth()
  const clinicData = clinic
  const userData = doctor
  const clinicId = clinicData?.id
  const doctorId = userData?.id

  const [offDays, setOffDays] = useState<OffDay[]>([])
  const [publicHolidays, setPublicHolidays] = useState<OffDay[]>([])

  const [isOffDayDialogOpen, setIsOffDayDialogOpen] = useState(false)
  const [editingOffDay, setEditingOffDay] = useState<OffDay | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<OffDay | null>(null)

  const [offDayForm, setOffDayForm] = useState<{
    startDate: string
    endDate: string
    allDay: boolean
    startTime: string
    endTime: string
    reason: string
  }>({
    startDate: "",
    endDate: "",
    allDay: true,
    startTime: "08:00 AM",
    endTime: "06:00 PM",
    reason: "",
  })

  // Fetch clinic working hours on mount
  useEffect(() => {
    const fetchWorkingHours = async () => {
      if (!clinicId) {
        setIsLoadingWorkingHours(false)
        return
      }

      try {
        const response = await AvailabilityAPI.getClinicWorkingHours(clinicId)
        if (response.working_hours && response.working_hours.length > 0) {
          setWorkingHours(workingHoursFromApiFormat(response.working_hours))
        }
      } catch (error) {
        console.error("Failed to fetch working hours:", error)
        toast.error(getToastErrorMessage(error, 'data', 'Failed to load working hours'))
      } finally {
        setIsLoadingWorkingHours(false)
      }
    }

    fetchWorkingHours()
  }, [clinicId])

  // Fetch availability exceptions on mount
  useEffect(() => {
    const fetchExceptions = async () => {
      if (!doctorId) {
        setIsLoadingOffDays(false)
        return
      }

      try {
        const exceptions = await AvailabilityAPI.getAvailabilityExceptions(doctorId)

        // Separate into off days and public holidays
        const offDaysList: OffDay[] = []
        const holidaysList: OffDay[] = []

        exceptions.forEach((ex) => {
          const offDay = exceptionToOffDay(ex)
          if (ex.is_us_holiday) {
            holidaysList.push(offDay)
          } else {
            offDaysList.push(offDay)
          }
        })

        setOffDays(offDaysList)
        setPublicHolidays(holidaysList)
      } catch (error) {
        console.error("Failed to fetch availability exceptions:", error)
        toast.error(getToastErrorMessage(error, 'data', 'Failed to load off days'))
      } finally {
        setIsLoadingOffDays(false)
      }
    }

    fetchExceptions()
  }, [doctorId])

  const resetOffDayForm = () => {
    setOffDayForm({
      startDate: "",
      endDate: "",
      allDay: true,
      startTime: "08:00 AM",
      endTime: "06:00 PM",
      reason: "",
    })
    setEditingOffDay(null)
  }

  const openCreateOffDayDialog = () => {
    resetOffDayForm()
    setIsOffDayDialogOpen(true)
  }

  const openEditOffDayDialog = (entry: OffDay) => {
    setEditingOffDay(entry)
    setOffDayForm({
      startDate: entry.startDate,
      endDate: entry.endDate ?? "",
      allDay: entry.allDay,
      startTime: entry.startTime ?? "08:00 AM",
      endTime: entry.endTime ?? "06:00 PM",
      reason: entry.reason ?? "",
    })
    setIsOffDayDialogOpen(true)
  }

  const handleOffDayFormChange = (
    field: "startDate" | "endDate" | "reason" | "startTime" | "endTime",
    value: string
  ) => {
    setOffDayForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatOffDayDateRange = (entry: OffDay) => {
    if (entry.endDate && entry.endDate !== entry.startDate) {
      return `${entry.startDate} - ${entry.endDate}`
    }
    return entry.startDate
  }

  const getOffDayTimeRangeLabel = (entry: OffDay) => {
    if (entry.allDay) return "All Day"
    const start = entry.startTime ?? "08:00 AM"
    const end = entry.endTime ?? "06:00 PM"
    return `${start} - ${end}`
  }

  const handleDeleteOffDay = async (id: number) => {
    setIsDeletingOffDay(true)
    try {
      await AvailabilityAPI.deleteAvailabilityException(id)

      if (activeSettingsTab === "off-days") {
        setOffDays((prev) => prev.filter((d) => d.id !== id))
      } else {
        setPublicHolidays((prev) => prev.filter((d) => d.id !== id))
      }

      toast.success("Off day deleted successfully")
    } catch (error) {
      console.error("Failed to delete off day:", error)
      toast.error(getToastErrorMessage(error, 'data', 'Failed to delete off day'))
    } finally {
      setIsDeletingOffDay(false)
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
    }
  }

  const openDeleteDialog = (entry: OffDay) => {
    setDeleteTarget(entry)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOffDay = () => {
    if (!deleteTarget) return
    handleDeleteOffDay(deleteTarget.id)
  }

  const handleSubmitOffDay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offDayForm.startDate.trim() || !doctorId) {
      return
    }

    setIsSavingOffDay(true)

    try {
      const isHoliday = activeSettingsTab === "public-holidays"

      if (editingOffDay) {
        // Update existing exception
        const updateData = {
          exception_date: dateToApiFormat(offDayForm.startDate),
          end_date: offDayForm.endDate ? dateToApiFormat(offDayForm.endDate) : null,
          is_all_day: offDayForm.allDay,
          start_time: offDayForm.allDay ? null : timeToApiFormat(offDayForm.startTime),
          end_time: offDayForm.allDay ? null : timeToApiFormat(offDayForm.endTime),
          reason: offDayForm.reason.trim() || null,
        }

        const updated = await AvailabilityAPI.updateAvailabilityException(editingOffDay.id, updateData)
        const updatedOffDay = exceptionToOffDay(updated)

        const targetSetter = isHoliday ? setPublicHolidays : setOffDays
        targetSetter((prev) =>
          prev.map((entry) => entry.id === editingOffDay.id ? updatedOffDay : entry)
        )

        toast.success("Off day updated successfully")
      } else {
        // Create new exception
        const createData = {
          doctor_id: doctorId,
          exception_date: dateToApiFormat(offDayForm.startDate),
          end_date: offDayForm.endDate ? dateToApiFormat(offDayForm.endDate) : null,
          is_all_day: offDayForm.allDay,
          start_time: offDayForm.allDay ? null : timeToApiFormat(offDayForm.startTime),
          end_time: offDayForm.allDay ? null : timeToApiFormat(offDayForm.endTime),
          reason: offDayForm.reason.trim() || null,
          is_us_holiday: isHoliday,
        }

        const created = await AvailabilityAPI.createAvailabilityException(createData)
        const newOffDay = exceptionToOffDay(created)

        const targetSetter = isHoliday ? setPublicHolidays : setOffDays
        targetSetter((prev) => [...prev, newOffDay])

        toast.success("Off day created successfully")
      }

      setIsOffDayDialogOpen(false)
      resetOffDayForm()
    } catch (error) {
      console.error("Failed to save off day:", error)
      toast.error(getToastErrorMessage(error, 'data', 'Failed to save off day'))
    } finally {
      setIsSavingOffDay(false)
    }
  }

  const handleTimeChange = (dayIndex: number, timeType: 'open' | 'close', value: string) => {
    const updatedHours = [...workingHours]
    updatedHours[dayIndex][timeType] = value
    setWorkingHours(updatedHours)
  }

  const handleToggleClosed = (dayIndex: number) => {
    const updatedHours = [...workingHours]
    updatedHours[dayIndex].isClosed = !updatedHours[dayIndex].isClosed
    setWorkingHours(updatedHours)
  }

  const handleSaveWorkingHours = async () => {
    if (!clinicId) {
      toast.error("Clinic ID not found")
      return
    }

    setIsSavingWorkingHours(true)

    try {
      const apiHours = workingHoursToApiFormat(workingHours)
      await AvailabilityAPI.updateClinicWorkingHours({
        clinic_id: clinicId,
        working_hours: apiHours,
      })

      toast.success("Working hours saved successfully")
    } catch (error) {
      console.error("Failed to save working hours:", error)
      toast.error(getToastErrorMessage(error, 'data', 'Failed to save working hours'))
    } finally {
      setIsSavingWorkingHours(false)
    }
  }

  const handleSyncPublicHolidays = async () => {
    if (!doctorId) {
      toast.error("Doctor ID not found")
      return
    }

    setIsSyncingHolidays(true)

    try {
      const currentYear = new Date().getFullYear()
      await AvailabilityAPI.syncHolidays(doctorId, currentYear)

      // Refresh the exceptions list to get the synced holidays
      const exceptions = await AvailabilityAPI.getAvailabilityExceptions(doctorId)
      const holidaysList: OffDay[] = []
      const offDaysList: OffDay[] = []

      exceptions.forEach((ex) => {
        const offDay = exceptionToOffDay(ex)
        if (ex.is_us_holiday) {
          holidaysList.push(offDay)
        } else {
          offDaysList.push(offDay)
        }
      })

      setPublicHolidays(holidaysList)
      setOffDays(offDaysList)

      toast.success("Holidays synced successfully")
    } catch (error) {
      console.error("Failed to sync holidays:", error)
      toast.error(getToastErrorMessage(error, 'data', 'Failed to sync holidays'))
    } finally {
      setIsSyncingHolidays(false)
    }
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-5">

        <Tabs
          value={activeSettingsTab}
          onValueChange={(value) =>
            setActiveSettingsTab(value as "working-hours" | "off-days" | "public-holidays")
          }
        >
          <TabsList className="p-1.5 gap-2">
            <TabsTrigger value="working-hours" className="">Working Hours</TabsTrigger>
            <TabsTrigger value="off-days" className="">Off Days</TabsTrigger>
            <TabsTrigger value="public-holidays" className="">Public Holidays</TabsTrigger>
          </TabsList>

          {/* Working Hours Tab */}
          <TabsContent value="working-hours" className="mt-3 max-w-md">
            {isLoadingWorkingHours ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-sm">Loading working hours...</div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {workingHours.map((day, index) => (
                    <div
                      key={day.day}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:bg-white/30 transition-all duration-200"
                    >
                      <div className="w-full sm:w-20 font-medium text-sm">{day.day}</div>
                      {day.isClosed ? (
                        <div className="flex-1 text-center text-sm">Closed</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <TimePicker
                            value={day.open}
                            onChange={(value) => handleTimeChange(index, "open", value)}
                            className="flex-1 w-fit"
                          />

                          <span className="text-sm flex-shrink-0">to</span>

                          <TimePicker
                            value={day.close}
                            onChange={(value) => handleTimeChange(index, "close", value)}
                            className="flex-1 w-fit"
                          />
                        </div>
                      )}

                      <Button
                        onClick={() => handleToggleClosed(index)}
                        className={day.isClosed ? "neumorphic-button-primary ml-auto" : "neumorphic-button-destructive ml-auto"}
                      >
                        {day.isClosed ? "Open" : "Close"}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
                  <Button
                    onClick={handleSaveWorkingHours}
                    disabled={isSavingWorkingHours}
                    className="neumorphic-button-primary"
                  >
                    {isSavingWorkingHours ? (
                      <>
                        <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Working Hours"
                    )}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* Off Days Tab */}
          <TabsContent value="off-days" className="mt-1 max-w-2xl">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2 pl-1">
                <span className="text-sm sm:text-base">
                  These days will block all appointments.
                </span>
                <Button
                  onClick={openCreateOffDayDialog}
                  className="neumorphic-button-primary"
                >
                  <IconPlus className="w-3 h-3" />
                  Add Off Day
                </Button>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {isLoadingOffDays ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-sm">Loading off days...</div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg">
                    {/* Fixed Header - Outside scroll container */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Date(s)</TableHead>
                          <TableHead className="w-[120px]">Time Range</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                    {/* Scrollable Body */}
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableBody>
                          {offDays.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-6 text-center text-sm"
                              >
                                No off days added yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            offDays.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="text-sm font-medium w-[200px]">
                                  {formatOffDayDateRange(entry)}
                                </TableCell>
                                <TableCell className="text-sm w-[120px]">
                                  {getOffDayTimeRangeLabel(entry)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.reason && entry.reason.trim().length > 0
                                    ? entry.reason
                                    : "No reason provided"}
                                </TableCell>
                                <TableCell className="text-right w-[120px]">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      onClick={() => {
                                        setActiveSettingsTab("off-days")
                                        openEditOffDayDialog(entry)
                                      }}
                                      className="neumorphic-button-primary p-2"
                                    >
                                      <IconPencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setActiveSettingsTab("off-days")
                                        openDeleteDialog(entry)
                                      }}
                                      className="neumorphic-button-destructive p-2"
                                    >
                                      <IconTrash className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Public Holidays Tab */}
          <TabsContent value="public-holidays" className="mt-1 max-w-2xl">
            <div>

              <div className="flex items-center justify-between gap-3 mb-2 pl-1">
                <span className="text-sm sm:text-base">
                  Federal holidays that will block all appointments.
                </span>
                <Button
                  onClick={handleSyncPublicHolidays}
                  disabled={isSyncingHolidays}
                  className="neumorphic-button-primary"
                >
                  {isSyncingHolidays ? (
                    <>
                      <IconLoader2 className="w-3 h-3 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <IconRefresh className="w-3 h-3" />
                      Sync Holidays
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {isLoadingOffDays ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-sm">Loading holidays...</div>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg">
                    {/* Fixed Header - Outside scroll container */}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Date(s)</TableHead>
                          <TableHead className="w-[120px]">Time Range</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="w-[120px] text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    </Table>
                    {/* Scrollable Body */}
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Table>
                        <TableBody>
                          {publicHolidays.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-6 text-center text-sm"
                              >
                                No public holidays synced yet. Click "Sync Holidays" to load them.
                              </TableCell>
                            </TableRow>
                          ) : (
                            publicHolidays.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="text-sm font-medium w-[200px]">
                                  {formatOffDayDateRange(entry)}
                                </TableCell>
                                <TableCell className="text-sm w-[120px]">
                                  {getOffDayTimeRangeLabel(entry)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {entry.reason && entry.reason.trim().length > 0
                                    ? entry.reason
                                    : "No reason provided"}
                                </TableCell>
                                <TableCell className="text-right w-[120px]">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      onClick={() => {
                                        setActiveSettingsTab("public-holidays")
                                        openEditOffDayDialog(entry)
                                      }}
                                      className="neumorphic-button-primary p-2"
                                    >
                                      <IconPencil className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setActiveSettingsTab("public-holidays")
                                        openDeleteDialog(entry)
                                      }}
                                      className="neumorphic-button-destructive p-2"
                                    >
                                      <IconTrash className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add / Edit Off Day Overlay (custom div, not shadcn Dialog) */}
      {isOffDayDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4"
          onClick={() => {
            setIsOffDayDialogOpen(false)
            resetOffDayForm()
          }}
        >
          <div
            className="neumorphic-pressed rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmitOffDay} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold">
                  {editingOffDay
                    ? `Edit ${activeSettingsTab === "public-holidays" ? "Public Holiday" : "Off Day"}`
                    : `Add ${activeSettingsTab === "public-holidays" ? "Public Holiday" : "Off Day"}`}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="offday-start-date">
                      Date <span className="">*</span>
                    </Label>
                    <DatePicker
                      value={toDatePickerValue(offDayForm.startDate)}
                      onChange={(value) =>
                        handleOffDayFormChange("startDate", fromDatePickerValue(value))
                      }
                      placeholder="MM/DD/YYYY"
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offday-end-date">
                      End Date{" "}
                      <span className="text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <DatePicker
                      value={toDatePickerValue(offDayForm.endDate)}
                      onChange={(value) =>
                        handleOffDayFormChange("endDate", fromDatePickerValue(value))
                      }
                      placeholder="MM/DD/YYYY"
                      minDate={offDayForm.startDate ? new Date(toDatePickerValue(offDayForm.startDate)) : undefined}
                      className="w-full"
                    />
                    <p className="text-[11px]">
                      Leave empty for single day off.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="offday-all-day"
                    checked={offDayForm.allDay}
                    onCheckedChange={(checked) =>
                      setOffDayForm((prev) => ({
                        ...prev,
                        allDay: Boolean(checked),
                      }))
                    }
                    className="neumorphic-pressed rounded-[6px] shadow-none border-0"
                  />
                  <Label htmlFor="offday-all-day" className="text-sm">
                    All Day
                  </Label>
                </div>

                {!offDayForm.allDay && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="offday-start-time">
                        Start Time <span className="">*</span>
                      </Label>
                      <TimePicker
                        value={offDayForm.startTime}
                        onChange={(value) => handleOffDayFormChange("startTime", value)}
                        className="w-full neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="offday-end-time">
                        End Time <span className="">*</span>
                      </Label>
                      <TimePicker
                        value={offDayForm.endTime}
                        onChange={(value) => handleOffDayFormChange("endTime", value)}
                        className="w-full neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus-border-0 transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="offday-reason">
                    Reason{" "}
                    <span className="text-foreground text-xs font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="offday-reason"
                    placeholder={
                      activeSettingsTab === "public-holidays"
                        ? "e.g., New Year, Independence Day"
                        : "e.g., Vacation, Conference, Personal time off"
                    }
                    value={offDayForm.reason}
                    onChange={(e) => handleOffDayFormChange("reason", e.target.value)}
                    className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  className="neumorphic-button-destructive"
                  onClick={() => {
                    setIsOffDayDialogOpen(false)
                    resetOffDayForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingOffDay}
                  className="neumorphic-button-primary"
                >
                  {isSavingOffDay ? (
                    <>
                      <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingOffDay ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Off Day / Public Holiday Confirmation Overlay (custom div) */}
      {isDeleteDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-lg p-4"
          onClick={() => {
            setIsDeleteDialogOpen(false)
            setDeleteTarget(null)
          }}
        >
          <div
            className="neumorphic-pressed p-6 max-w-sm w-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <h3 className="text-base font-semibold">Delete Off Day</h3>
              <p className="text-sm">
                Are you sure you want to delete this off day?
              </p>
            </div>

            {deleteTarget && (
              <div className="space-y-2 text-sm mt-2">
                <p>
                  <span className="font-medium">Date(s): </span>
                  <span className="">
                    {formatOffDayDateRange(deleteTarget)}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Time: </span>
                  <span className="">
                    {getOffDayTimeRangeLabel(deleteTarget)}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Reason: </span>
                  <span className="">
                    {deleteTarget.reason && deleteTarget.reason.trim().length > 0
                      ? deleteTarget.reason
                      : "No reason provided"}
                  </span>
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                className="neumorphic-button-primary"
                onClick={() => {
                  setIsDeleteDialogOpen(false)
                  setDeleteTarget(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmDeleteOffDay}
                disabled={isDeletingOffDay}
                className="neumorphic-button-destructive"
              >
                {isDeletingOffDay ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
