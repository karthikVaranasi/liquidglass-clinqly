import { useState, useEffect } from "react"
import { IconClock, IconCheck } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import data from "@/data.json"

const { workingHours: initialWorkingHours } = data

// Custom Time Picker Component
function TimePicker({ value, onChange, className }: {
  value: string,
  onChange: (value: string) => void,
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState("09")
  const [selectedMinute, setSelectedMinute] = useState("00")
  const [selectedPeriod, setSelectedPeriod] = useState("AM")

  // Parse initial value
  useEffect(() => {
    const timeMatch = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (timeMatch) {
      let h = parseInt(timeMatch[1])
      const m = timeMatch[2]
      const p = timeMatch[3].toUpperCase()

      // Convert to 12-hour format
      if (h === 0) h = 12
      else if (h > 12) h = h - 12

      setSelectedHour(h.toString().padStart(2, '0'))
      setSelectedMinute(m)
      setSelectedPeriod(p)
    }
  }, [value])

  const handleDone = () => {
    const formattedTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`
    onChange(formattedTime)
    setIsOpen(false)
  }

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
  const periods = ["AM", "PM"]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`w-24 sm:w-28 justify-start text-left font-normal text-xs sm:text-sm ${className || ''}`}>
          {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 sm:w-52 p-0" align="start">
        <div className="p-3 sm:p-4">
          <div className="flex justify-center gap-4 sm:gap-6 mb-2">
            {/* Hour Section */}
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Hour</div>
              <div className="w-10 sm:w-12 h-24 sm:h-32 overflow-y-auto border border-input rounded-lg bg-background p-1">
                <div className="py-0.5 space-y-0.5">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`text-center py-1 px-1 cursor-pointer text-xs font-medium transition-colors rounded-md ${
                        selectedHour === hour
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                      onClick={() => setSelectedHour(hour)}
                    >
                      {hour}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Minute Section */}
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Min</div>
              <div className="w-10 sm:w-12 h-24 sm:h-32 overflow-y-auto border border-input rounded-lg bg-background p-1">
                <div className="py-0.5 space-y-0.5">
                  {minutes.map((minute) => (
                    <div
                      key={minute}
                      className={`text-center py-1 px-1 cursor-pointer text-xs font-medium transition-colors rounded-md ${
                        selectedMinute === minute
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-foreground'
                      }`}
                      onClick={() => setSelectedMinute(minute)}
                    >
                      {minute}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Period Section */}
            <div className="flex flex-col items-center">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-2">Period</div>
              <div className="flex flex-col gap-0.5">
                {periods.map((period) => (
                  <div
                    key={period}
                    className={`text-center py-1 px-2 sm:py-1.5 sm:px-2.5 cursor-pointer text-xs font-medium rounded-md border transition-colors ${
                      selectedPeriod === period
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted text-foreground'
                    }`}
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="flex justify-center pt-2 sm:pt-3 border-t">
            <Button onClick={handleDone} variant="default" size="sm" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-medium">
              <IconCheck className="w-3 h-3" />
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function SettingsPage() {
  const [workingHours, setWorkingHours] = useState(initialWorkingHours)

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
    // You could make an API call here
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Clinic Working Hours Section */}
      <div className="px-3 sm:px-4 lg:px-6">
        <div>
          <div className="pb-3 sm:pb-4">
            <div className="flex items-center gap-2">
              <IconClock className="size-5" />
              <h3 className="text-base sm:text-lg font-semibold">Clinic Configuration</h3>
            </div>
            <p className="text-sm text-muted-foreground">Set up your clinic working hours</p>
          </div>
          <div>
            <div className="space-y-3">
              {workingHours.map((day, index) => (
                <div key={day.day} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 neumorphic-soft rounded-lg neumorphic-hover neumorphic-active transition-all duration-200">
                  <div className="w-full sm:w-20 font-medium text-sm">{day.day}</div>

                  {day.isClosed ? (
                    <div className="flex-1 text-center text-muted-foreground text-sm">Closed</div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <TimePicker
                        value={day.open}
                        onChange={(value) => handleTimeChange(index, 'open', value)}
                        className="flex-1"
                      />

                      <span className="text-sm text-muted-foreground flex-shrink-0">to</span>

                      <TimePicker
                        value={day.close}
                        onChange={(value) => handleTimeChange(index, 'close', value)}
                        className="flex-1"
                      />
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleClosed(index)}
                    className={`w-full sm:w-auto sm:ml-auto neumorphic-soft neumorphic-hover neumorphic-active transition-all duration-200 ${
                      day.isClosed
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}
                  >
                    {day.isClosed ? 'Open' : 'Close'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 sm:mt-6 flex justify-center sm:justify-end">
              <Button onClick={handleSaveWorkingHours} className="w-full sm:w-auto text-primary hover:bg-primary/10 text-sm font-medium neumorphic-soft px-4 py-2 rounded-md neumorphic-hover neumorphic-active transition-all duration-200">
                Save Working Hours
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
