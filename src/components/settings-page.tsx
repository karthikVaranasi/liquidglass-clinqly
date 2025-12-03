import { useState } from "react"
import { IconPlus, IconTrash, IconPencil } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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

  return (
    <div className="px-3 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-5">

        <Tabs
          value={activeSettingsTab}
          onValueChange={(value) =>
            setActiveSettingsTab(value as "working-hours" | "off-days" | "public-holidays")
          }
        >
          <TabsList>
            <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
            <TabsTrigger value="off-days">Off Days</TabsTrigger>
            <TabsTrigger value="public-holidays">Public Holidays</TabsTrigger>
          </TabsList>

          {/* Working Hours Tab */}
          <TabsContent value="working-hours" className="mt-3 max-w-md">
            <div className="space-y-3">
              {workingHours.map((day, index) => (
                <div
                  key={day.day}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 neumorphic-soft rounded-lg neumorphic-hover neumorphic-active transition-all duration-200"
                >
                  <div className="w-full sm:w-20 font-medium text-sm">{day.day}</div>
                  {day.isClosed ? (
                    <div className="flex-1 text-center text-muted-foreground text-sm">Closed</div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <TimePicker
                        value={day.open}
                        onChange={(value) => handleTimeChange(index, "open", value)}
                        className="flex-1 w-fit"
                      />

                      <span className="text-sm text-muted-foreground flex-shrink-0">to</span>

                      <TimePicker
                        value={day.close}
                        onChange={(value) => handleTimeChange(index, "close", value)}
                        className="flex-1 w-fit"
                      />
                    </div>
                  )}

                  <Button
                    onClick={() => handleToggleClosed(index)}
                    className={`ml-auto w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 ${
                      day.isClosed ? "text-primary" : "text-destructive hover:bg-destructive hover:text-primary-foreground"
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
                className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
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
                            className="py-6 text-center text-sm text-muted-foreground"
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
                            <TableCell className="text-sm text-muted-foreground">
                              {getOffDayTimeRangeLabel(entry)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
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
                                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                                >
                                  <IconPencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("off-days")
                                    openDeleteDialog(entry)
                                  }}
                                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:bg-destructive hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2 text-destructive"
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
                <span className="text-xs sm:text-sm text-muted-foreground">
                  Use this for national and regional holidays.
                </span>
                <Button
                  onClick={() => {
                    setActiveSettingsTab("public-holidays")
                    openCreateOffDayDialog()
                  }}
                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                >
                  <IconPlus className="w-3 h-3" />
                  Add Public Holiday
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
                            className="py-6 text-center text-sm text-muted-foreground"
                          >
                            No public holidays added yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        publicHolidays.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm font-medium">
                              {formatOffDayDateRange(entry)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {getOffDayTimeRangeLabel(entry)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
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
                                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2"
                                >
                                  <IconPencil className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => {
                                    setActiveSettingsTab("public-holidays")
                                    openDeleteDialog(entry)
                                  }}
                                  className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 inline-flex items-center gap-2 text-destructive"
                                >
                                  <IconTrash className="w-3 h-3" />
                                  Delete
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

      {/* Add / Edit Off Day Dialog */}
      <Dialog open={isOffDayDialogOpen} onOpenChange={(open) => {
        setIsOffDayDialogOpen(open)
        if (!open) {
          resetOffDayForm()
        }
      }}>
        <DialogContent className="neumorphic-pressed p-6">
          <form onSubmit={handleSubmitOffDay} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {editingOffDay
                  ? `Edit ${activeSettingsTab === "public-holidays" ? "Public Holiday" : "Off Day"}`
                  : `Add ${activeSettingsTab === "public-holidays" ? "Public Holiday" : "Off Day"}`}
              </DialogTitle>
              <DialogDescription>
                {editingOffDay ? (
                  <>
                    Update the details of this{" "}
                    {activeSettingsTab === "public-holidays" ? "public holiday" : "off day"}.
                  </>
                ) : (
                  <>
                    Configure the date range and optional reason. Leave{" "}
                    <span className="font-medium">End Date</span> empty for a single day.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="offday-start-date">
                    Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="offday-start-date"
                    placeholder="dd-mm-yyyy"
                    value={offDayForm.startDate}
                    onChange={(e) => handleOffDayFormChange("startDate", e.target.value)}
                    required
                    className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="offday-end-date">
                    End Date{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (Optional - for date ranges)
                    </span>
                  </Label>
                  <Input
                    id="offday-end-date"
                    placeholder="dd-mm-yyyy"
                    value={offDayForm.endDate}
                    onChange={(e) => handleOffDayFormChange("endDate", e.target.value)}
                    className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                  />
                  <p className="text-[11px] text-muted-foreground">
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
                      Start Time <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker
                      value={offDayForm.startTime}
                      onChange={(value) => handleOffDayFormChange("startTime", value)}
                      className="w-full neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="offday-end-time">
                      End Time <span className="text-destructive">*</span>
                    </Label>
                    <TimePicker
                      value={offDayForm.endTime}
                      onChange={(value) => handleOffDayFormChange("endTime", value)}
                      className="w-full neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
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

            <DialogFooter className="pt-2">
              <Button
                type="button"
                className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
                onClick={() => {
                  setIsOffDayDialogOpen(false)
                  resetOffDayForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
              >
                {editingOffDay ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Off Day / Public Holiday Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="neumorphic-pressed p-6 max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Off Day</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this off day?
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="space-y-2 text-sm mt-2">
              <p>
                <span className="font-medium">Date(s): </span>
                <span className="text-muted-foreground">
                  {formatOffDayDateRange(deleteTarget)}
                </span>
              </p>
              <p>
                <span className="font-medium">Time: </span>
                <span className="text-muted-foreground">
                  {getOffDayTimeRangeLabel(deleteTarget)}
                </span>
              </p>
              <p>
                <span className="font-medium">Reason: </span>
                <span className="text-muted-foreground">
                  {deleteTarget.reason && deleteTarget.reason.trim().length > 0
                    ? deleteTarget.reason
                    : "No reason provided"}
                </span>
              </p>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              type="button"
              className="w-fit text-xs font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
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
              className="w-fit text-xs font-medium neumorphic-pressed text-destructive hover:bg-destructive hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
