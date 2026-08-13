import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-input bg-card px-3.5 text-base text-card-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Input }
