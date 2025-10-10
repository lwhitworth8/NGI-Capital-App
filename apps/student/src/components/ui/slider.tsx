import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  max?: number
  min?: number
  step?: number
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value = [0], onValueChange, max = 100, min = 0, step = 1, disabled = false, defaultValue, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const [isDragging, setIsDragging] = React.useState(false)
    const sliderRef = React.useRef<HTMLDivElement>(null)
    const thumbRef = React.useRef<HTMLDivElement>(null)

    const currentValue = value !== undefined ? value : internalValue
    const percentage = ((currentValue[0] - min) / (max - min)) * 100

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(e)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || disabled) return
      updateValue(e)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const updateValue = (e: MouseEvent | React.MouseEvent) => {
      if (!sliderRef.current) return
      
      const rect = sliderRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
      const newValue = Math.round((percentage / 100) * (max - min) + min)
      const steppedValue = Math.round(newValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))
      
      const newValues = [clampedValue]
      setInternalValue(newValues)
      onValueChange?.(newValues)
    }

    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mousemove', handleMouseMove)
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
    }, [isDragging])

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full touch-none select-none items-center", className)}
        {...props}
      >
        <div
          ref={sliderRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div
            className="absolute h-full bg-primary transition-all duration-150"
            style={{ width: `${percentage}%` }}
          />
          <div
            ref={thumbRef}
            className={cn(
              "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-md transition-all duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed",
              isDragging && "scale-110"
            )}
            style={{ left: `calc(${percentage}% - 10px)` }}
          />
        </div>
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }