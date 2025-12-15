"use client"

import * as React from "react"
import { formatDateUS } from "@/lib/date"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  maxDate?: Date
  minDate?: Date
}

export function DatePicker({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  disabled = false,
  required = false,
  className,
  maxDate,
  minDate
}: DatePickerProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const dateInputRef = React.useRef<HTMLInputElement>(null)
  const displayInputRef = React.useRef<HTMLInputElement>(null)

  const displayValue = value ? formatDateUS(value) : ''

  const handleDisplayClick = () => {
    if (!disabled && dateInputRef.current) {
      if (typeof dateInputRef.current.showPicker === 'function') {
        dateInputRef.current.showPicker()
      } else {
        dateInputRef.current.click()
      }
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value)
  }

  return (
    <div className="relative">
      {/* Display input - shows formatted US date */}
      <input
        ref={displayInputRef}
        type="text"
        value={displayValue}
        onClick={handleDisplayClick}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full px-3 py-2 text-sm neumorphic-inset rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground cursor-pointer",
          isFocused && "ring-2 ring-ring",
          className
        )}
        readOnly
      />

      {/* Hidden date input - handles actual date selection */}
      <input
        ref={dateInputRef}
        type="date"
        value={value || ''}
        onChange={handleDateChange}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        disabled={disabled}
        required={required}
        max={maxDate ? maxDate.toISOString().split('T')[0] : undefined}
        min={minDate ? minDate.toISOString().split('T')[0] : undefined}
      />
    </div>
  )
}
