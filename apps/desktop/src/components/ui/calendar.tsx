"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"

type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar(props: CalendarProps) {
  return (
    <div className="rdp-container">
      <DayPicker {...props} />
    </div>
  )
}

export default Calendar

