import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2Icon } from 'lucide-react'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-zinc-800',
        primary: 'bg-primary text-primary-foreground hover:bg-zinc-800',
        outline:
          'border-border bg-background text-foreground hover:bg-muted',
        secondary:
          'border-border bg-card text-secondary-foreground hover:bg-muted',
        ghost: 'border-transparent bg-transparent text-brand-600 hover:bg-brand-50',
        destructive:
          'border-border bg-card text-destructive hover:bg-red-50',
        danger: 'border-border bg-card text-destructive hover:bg-red-50',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-[18px] text-base',
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-[18px] text-base',
        lg: 'h-[52px] px-[22px] text-base',
        icon: 'size-11',
        'icon-sm': 'size-9',
        'icon-lg': 'size-[52px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  loading = false,
  fullWidth = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    fullWidth?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2Icon className="size-5 animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
