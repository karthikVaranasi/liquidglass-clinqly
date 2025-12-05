import { useState } from "react"
import { IconPlus, IconTrash, IconPencil, IconRefresh } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { TimePicker } from "@/components/ui/time-picker"
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
import data from "@/data.json"

const { workingHours: initialWorkingHours } = data

// Helpers to convert between stored "dd-mm-yyyy" format and native <input type="date"> "yyyy-mm-dd"
const toInputDateValue = (value: string): string => {
  if (!value) return ""
  const parts = value.split("-")
  if (parts.length !== 3) return ""
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return ""
  return `${yyyy}-${mm}-${dd}`
}

const fromInputDateValue = (value: string): string => {
  if (!value) return ""
  const parts = value.split("-")
  if (parts.length !== 3) return ""
  const [yyyy, mm, dd] = parts
  if (!dd || !mm || !yyyy) return ""
  return `${dd}-${mm}-${yyyy}`
}

export function SettingsPage() {
  const [workingHours, setWorkingHours] = useState(initialWorkingHours)
  const [activeSettingsTab, setActiveSettingsTab] = useState<"working-hours" | "off-days" | "public-holidays">("working-hours")

  type OffDay = {
  id: number
  startDate: string // dd-mm-yyyy
  endDate?: string // dd-mm-yyyy
  allDay: boolean
  startTime?: string
  endTime?: string
  reason?: string
}

  const [offDays, setOffDays] = useState<OffDay[]>([
    {
      id: 1,
      startDate: "06-12-2025",
      endDate: "10-12-2025",
      allDay: true,
      startTime: "08:00 AM",
      endTime: "06:00 PM",
      reason: "Day off",
    },
    {
      id: 2,
      startDate: "12-12-2025",
      allDay: true,
      startTime: "08:00 AM",
      endTime: "06:00 PM",
      reason: "",
    },
    {
      id: 3,
      startDate: "06-12-2025",
      allDay: true,
      startTime: "08:00 AM",
      endTime: "06:00 PM",
      reason: "",
    },
  ])

  const [publicHolidays, setPublicHolidays] = useState<OffDay[]>([])

  // Default public holidays (could be fetched from an API in a real app)
  const defaultPublicHolidays: OffDay[] = [
    {
      id: 1,
      startDate: "01-01-2026",
      allDay: true,
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      reason: "New Year's Day",
    },
    {
      id: 2,
      startDate: "26-01-2026",
      allDay: true,
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      reason: "Republic Day",
    },
    {
      id: 3,
      startDate: "15-08-2026",
      allDay: true,
      startTime: "12:00 AM",
      endTime: "11:59 PM",
      reason: "Independence Day",
    },
  ]

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

  const handleDeleteOffDay = (id: number) => {
    if (activeSettingsTab === "off-days") {
      setOffDays((prev) => prev.filter((d) => d.id !== id))
    } else {
      setPublicHolidays((prev) => prev.filter((d) => d.id !== id))
    }
  }

  const openDeleteDialog = (entry: OffDay) => {
    setDeleteTarget(entry)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteOffDay = () => {
    if (!deleteTarget) return
    handleDeleteOffDay(deleteTarget.id)
    setIsDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const handleSubmitOffDay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!offDayForm.startDate.trim()) {
      return
    }

    const targetSetter =
      activeSettingsTab === "off-days" ? setOffDays : setPublicHolidays

    if (editingOffDay) {
      targetSetter((prev) =>
        prev.map((entry) =>
          entry.id === editingOffDay.id
            ? {
                ...entry,
                startDate: offDayForm.startDate,
                endDate: offDayForm.endDate || undefined,
                allDay: offDayForm.allDay,
                startTime: offDayForm.allDay ? undefined : offDayForm.startTime,
                endTime: offDayForm.allDay ? undefined : offDayForm.endTime,
                reason: offDayForm.reason.trim(),
              }
            : entry
        )
      )
    } else {
      targetSetter((prev) => [
        ...prev,
        {
          id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1,
          startDate: offDayForm.startDate,
          endDate: offDayForm.endDate || undefined,
          allDay: offDayForm.allDay,
          startTime: offDayForm.allDay ? undefined : offDayForm.startTime,
          endTime: offDayForm.allDay ? undefined : offDayForm.endTime,
          reason: offDayForm.reason.trim(),
        },
      ])
    }

    setIsOffDayDialogOpen(false)
    resetOffDayForm()
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

  const handleSaveWorkingHours = () => {
    // Handle saving working hours logic here
    console.log("Saving working hours:", workingHours)
    console.log("Saving off days:", offDays)
    console.log("Saving public holidays:", publicHolidays)
    // You could make an API call here
  }

  const handleSyncPublicHolidays = () => {
    setPublicHolidays(defaultPublicHolidays)
    console.log("Synced public holidays:", defaultPublicHolidays)
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
            <div className="space-y-3">
              {workingHours.map((day, index) => (
                <div
                  key={day.day}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 neumorphic-inset rounded-lg neumorphic-hover neumorphic-active transition-all duration-200"
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
                    className={`ml-auto w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 ${
                      day.isClosed ? "" : "hover:bg-destructive"
                    }`}
                  >
                    {day.isClosed ? "Open" : "Close"}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
              <Button
                onClick={handleSaveWorkingHours}
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
              >
                Save Working Hours
              </Button>
            </div>
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
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                >
                  <IconPlus className="w-3 h-3" />
                  Add Off Day
                </Button>
              </div>

              <div className="neumorphic-inset rounded-lg p-3 sm:p-4 border-0">
                <div className="max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Date(s)</TableHead>
                        <TableHead className="w-[120px]">Time Range</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
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
                            <TableCell className="text-sm font-medium">
                              {formatOffDayDateRange(entry)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getOffDayTimeRangeLabel(entry)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.reason && entry.reason.trim().length > 0
                                ? entry.reason
                                : "No reason provided"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("off-days")
                                    openEditOffDayDialog(entry)
                                  }}
                                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                                >
                                  <IconPencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("off-days")
                                    openDeleteDialog(entry)
                                  }}
                                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
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
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                >
                  <IconRefresh className="w-3 h-3" />
                  Sync Holidays
                </Button>
              </div>

              <div className="neumorphic-inset rounded-lg p-3 sm:p-4 border-0">
                <div className="max-h-[50vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Date(s)</TableHead>
                        <TableHead className="w-[120px]">Time Range</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
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
                            <TableCell className="text-sm font-medium">
                              {formatOffDayDateRange(entry)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {getOffDayTimeRangeLabel(entry)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.reason && entry.reason.trim().length > 0
                                ? entry.reason
                                : "No reason provided"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("public-holidays")
                                    openEditOffDayDialog(entry)
                                  }}
                                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                                >
                                  <IconPencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("public-holidays")
                                    openDeleteDialog(entry)
                                  }}
                                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
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
                    <Input
                      id="offday-start-date"
                      type="date"
                      value={toInputDateValue(offDayForm.startDate)}
                      onChange={(e) =>
                        handleOffDayFormChange("startDate", fromInputDateValue(e.target.value))
                      }
                      required
                      className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offday-end-date">
                      End Date{" "}
                      <span className="text-xs font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="offday-end-date"
                      type="date"
                      value={toInputDateValue(offDayForm.endDate)}
                      onChange={(e) =>
                        handleOffDayFormChange("endDate", fromInputDateValue(e.target.value))
                      }
                      className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
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
                    <span className="text-muted-foreground text-xs font-normal">
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
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                  onClick={() => {
                    setIsOffDayDialogOpen(false)
                    resetOffDayForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                >
                  {editingOffDay ? "Update" : "Create"}
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
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                className="w-fit text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground hover:bg-destructive rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
