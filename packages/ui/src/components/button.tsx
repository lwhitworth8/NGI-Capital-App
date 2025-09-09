import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'gradient'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

function buttonVariants(opts?: { variant?: ButtonVariant; size?: ButtonSize }) {
  const variant = opts?.variant || 'default'
  const size = opts?.size || 'default'
  const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'
  const v = {
    default: 'bg-primary text-primary-foreground shadow hover:opacity-95',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-95',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    gradient:
      'bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--primary)/.85)_50%,hsl(var(--primary))_100%)] text-primary-foreground shadow-sm hover:shadow transition-shadow',
  } as const
  const s = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3',
    lg: 'h-10 rounded-md px-6',
    icon: 'h-9 w-9',
  } as const
  return [base, v[variant], s[size]].join(' ')
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref as any}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
