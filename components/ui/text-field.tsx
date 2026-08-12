'use client'

import * as React from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface TextFieldProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
  helperText?: string
}

const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ label, error, helperText, id, className, ...props }, ref) {
    const inputId = id || props.name

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        ) : null}
        <Input
          id={inputId}
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(className)}
          {...props}
        />
        {error ? (
          <p className="m-0 text-[13px] text-destructive">{error}</p>
        ) : helperText ? (
          <p className="m-0 text-[13px] text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

export { TextField }
